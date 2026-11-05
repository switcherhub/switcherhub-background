import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Coordinate } from '../types/routing.types';
import Redis from 'ioredis';

/**
 * Cached route result
 */
export interface CachedRouteResult {
  distance: number; // in meters
  duration: number; // in seconds
  error?: string; // Error message if route failed (distance/duration will be -1)
}

/**
 * Routing error information
 */
export interface RoutingError {
  from: Coordinate;
  to: Coordinate;
  error: string;
  timestamp: number;
  provider: string;
}

/**
 * Service for caching routing results in Redis
 * Data is stored permanently (no TTL)
 */
@Injectable()
export class RoutingCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly CACHE_PREFIX = 'routing';
  private readonly ERROR_PREFIX = 'routing:error';
  private redisClient: Redis;

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {
    // Create direct Redis connection for permanent storage
    this.redisClient = new Redis({
      host: 'localhost',
      port: 6379,
    });
  }

  async onModuleInit() {
    try {
      // Test Redis connection by setting and getting a test key
      const testKey = `${this.CACHE_PREFIX}:test:connection`;
      await this.cacheManager.set(testKey, 'ok', 1);
      const testValue = await this.cacheManager.get(testKey);
      await this.cacheManager.del(testKey);

      if (testValue === 'ok') {
        console.log(
          `✅ [Redis Cache] Redis ініціалізовано і готовий до використання (prefix: ${this.CACHE_PREFIX})`,
        );
        console.log(
          `✅ [Redis Cache] Дані зберігаються на диску через RDB (кожні 10с) та AOF (кожну секунду)`,
        );
      } else {
        console.warn(
          `⚠️  [Redis Cache] Redis підключено, але тестова перевірка не пройдена`,
        );
      }
    } catch (error) {
      console.error(
        `❌ [Redis Cache] Помилка ініціалізації Redis: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async onModuleDestroy() {
    // Close Redis connection gracefully
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  /**
   * Normalize coordinates to ensure consistent cache keys
   * Always use the "smaller" coordinate first (by lat, then lng)
   */
  private normalizeCoordinates(
    coord1: Coordinate,
    coord2: Coordinate,
  ): [Coordinate, Coordinate] {
    // Compare by latitude first, then longitude
    if (
      coord1.lat < coord2.lat ||
      (coord1.lat === coord2.lat && coord1.lng < coord2.lng)
    ) {
      return [coord1, coord2];
    }
    return [coord2, coord1];
  }

  /**
   * Generate cache key for a pair of coordinates
   */
  private getCacheKey(from: Coordinate, to: Coordinate): string {
    const [coord1, coord2] = this.normalizeCoordinates(from, to);
    // Round coordinates to 6 decimal places (~10cm precision)
    const lat1 = Math.round(coord1.lat * 1000000) / 1000000;
    const lng1 = Math.round(coord1.lng * 1000000) / 1000000;
    const lat2 = Math.round(coord2.lat * 1000000) / 1000000;
    const lng2 = Math.round(coord2.lng * 1000000) / 1000000;

    return `${this.CACHE_PREFIX}:${lat1}:${lng1}:${lat2}:${lng2}`;
  }

  /**
   * Get cached route result
   */
  async getCachedRoute(
    from: Coordinate,
    to: Coordinate,
  ): Promise<CachedRouteResult | null> {
    try {
      const cacheKey = this.getCacheKey(from, to);
      // Get directly from Redis
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as CachedRouteResult;
      }
      return null;
    } catch (error) {
      console.error(
        `[Routing Cache] Error getting cached route: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  /**
   * Set cached route result
   * Data is stored permanently (no TTL) using direct Redis connection
   */
  async setCachedRoute(
    from: Coordinate,
    to: Coordinate,
    result: CachedRouteResult,
  ): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(from, to);
      // Store directly in Redis without TTL (permanent storage)
      await this.redisClient.set(cacheKey, JSON.stringify(result));
      console.log(
        `[Routing Cache] ✅ Cached route: key=${cacheKey}, from=(${from.lat},${from.lng}), to=(${to.lat},${to.lng}), distance=${result.distance}m, duration=${result.duration}s`,
      );
    } catch (error) {
      console.error(
        `[Routing Cache] Error setting cached route: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * Get multiple cached routes at once
   * Returns a map of coordinate pairs to cached results
   */
  async getCachedRoutes(
    pairs: Array<{ from: Coordinate; to: Coordinate }>,
  ): Promise<Map<string, CachedRouteResult>> {
    const cachedResults = new Map<string, CachedRouteResult>();

    // Get all cache keys
    const cacheKeys = pairs.map((pair) => ({
      key: this.getCacheKey(pair.from, pair.to),
      pair,
    }));

    // Try to get all from cache in parallel using direct Redis connection
    const cachePromises = cacheKeys.map(async ({ key, pair }) => {
      try {
        const cached = await this.redisClient.get(key);
        const pairKey = `${pair.from.lat},${pair.from.lng}:${pair.to.lat},${pair.to.lng}`;
        if (cached) {
          const parsed = JSON.parse(cached) as CachedRouteResult;
          cachedResults.set(pairKey, parsed);
        }
      } catch (error) {
        console.error(
          `[Routing Cache] Error getting cached route for key ${key}: ${error instanceof Error ? error.message : error}`,
        );
      }
    });

    await Promise.all(cachePromises);

    return cachedResults;
  }

  /**
   * Set multiple cached routes at once
   */
  async setCachedRoutes(
    routes: Array<{
      from: Coordinate;
      to: Coordinate;
      result: CachedRouteResult;
    }>,
  ): Promise<void> {
    const setPromises = routes.map((route) =>
      this.setCachedRoute(route.from, route.to, route.result),
    );
    await Promise.all(setPromises);
  }

  /**
   * Clear cache for a specific route
   */
  async clearCachedRoute(from: Coordinate, to: Coordinate): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(from, to);
      await this.redisClient.del(cacheKey);
    } catch (error) {
      console.error(
        `[Routing Cache] Error clearing cached route: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    ttl: null;
    prefix: string;
  }> {
    return {
      ttl: null, // No TTL - data stored permanently
      prefix: this.CACHE_PREFIX,
    };
  }

  /**
   * Remove all invalid cached routes without error messages
   * Invalid routes with error messages are kept for analysis
   * Returns the number of invalid entries removed
   */
  async removeInvalidCachedRoutes(): Promise<number> {
    try {
      // Get all routing cache keys (excluding error keys)
      const keys = await this.redisClient.keys(`${this.CACHE_PREFIX}:*`);
      let removedCount = 0;

      // Check each key for invalid values without error messages
      for (const key of keys) {
        // Skip error keys
        if (key.startsWith(this.ERROR_PREFIX)) {
          continue;
        }

        try {
          const cached = await this.redisClient.get(key);
          if (cached) {
            const parsed = JSON.parse(cached) as CachedRouteResult;
            // Check if result is invalid (distance or duration is -1) and has no error message
            if ((parsed.distance < 0 || parsed.duration < 0) && !parsed.error) {
              await this.redisClient.del(key);
              removedCount++;
            }
          }
        } catch (error) {
          // Skip keys that can't be parsed
          console.warn(
            `[Routing Cache] Error checking key ${key}: ${error instanceof Error ? error.message : error}`,
          );
        }
      }

      if (removedCount > 0) {
        console.log(
          `[Routing Cache] ✅ Removed ${removedCount} invalid cached routes without error messages`,
        );
      } else {
        console.log(
          `[Routing Cache] ✨ No invalid cached routes without errors found`,
        );
      }

      return removedCount;
    } catch (error) {
      console.error(
        `[Routing Cache] Error removing invalid cached routes: ${error instanceof Error ? error.message : error}`,
      );
      return 0;
    }
  }

  /**
   * Save routing error to cache for analysis
   */
  async saveRoutingError(
    from: Coordinate,
    to: Coordinate,
    error: string,
    provider: string = 'unknown',
  ): Promise<void> {
    try {
      const [coord1, coord2] = this.normalizeCoordinates(from, to);
      const lat1 = Math.round(coord1.lat * 1000000) / 1000000;
      const lng1 = Math.round(coord1.lng * 1000000) / 1000000;
      const lat2 = Math.round(coord2.lat * 1000000) / 1000000;
      const lng2 = Math.round(coord2.lng * 1000000) / 1000000;

      const errorKey = `${this.ERROR_PREFIX}:${lat1}:${lng1}:${lat2}:${lng2}`;
      const errorData: RoutingError = {
        from: coord1,
        to: coord2,
        error,
        timestamp: Date.now(),
        provider,
      };

      await this.redisClient.set(errorKey, JSON.stringify(errorData));
      console.log(
        `[Routing Cache] ⚠️  Saved routing error: from (${coord1.lat},${coord1.lng}) to (${coord2.lat},${coord2.lng}): ${error}`,
      );
    } catch (err) {
      console.error(
        `[Routing Cache] Error saving routing error: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /**
   * Get routing error for a specific route
   */
  async getRoutingError(
    from: Coordinate,
    to: Coordinate,
  ): Promise<string | null> {
    try {
      const [coord1, coord2] = this.normalizeCoordinates(from, to);
      const lat1 = Math.round(coord1.lat * 1000000) / 1000000;
      const lng1 = Math.round(coord1.lng * 1000000) / 1000000;
      const lat2 = Math.round(coord2.lat * 1000000) / 1000000;
      const lng2 = Math.round(coord2.lng * 1000000) / 1000000;

      const errorKey = `${this.ERROR_PREFIX}:${lat1}:${lng1}:${lat2}:${lng2}`;
      const cached = await this.redisClient.get(errorKey);
      if (cached) {
        const errorData = JSON.parse(cached) as RoutingError;
        return errorData.error;
      }
      return null;
    } catch (error) {
      console.error(
        `[Routing Cache] Error getting routing error: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  /**
   * Get all routing errors
   */
  async getAllRoutingErrors(): Promise<RoutingError[]> {
    try {
      const keys = await this.redisClient.keys(`${this.ERROR_PREFIX}:*`);
      const errors: RoutingError[] = [];

      for (const key of keys) {
        try {
          const cached = await this.redisClient.get(key);
          if (cached) {
            errors.push(JSON.parse(cached) as RoutingError);
          }
        } catch (err) {
          console.warn(
            `[Routing Cache] Error parsing error key ${key}: ${err instanceof Error ? err.message : err}`,
          );
        }
      }

      // Sort by timestamp (newest first)
      errors.sort((a, b) => b.timestamp - a.timestamp);

      return errors;
    } catch (error) {
      console.error(
        `[Routing Cache] Error getting routing errors: ${error instanceof Error ? error.message : error}`,
      );
      return [];
    }
  }

  /**
   * Clear all routing errors
   */
  async clearAllRoutingErrors(): Promise<number> {
    try {
      const keys = await this.redisClient.keys(`${this.ERROR_PREFIX}:*`);
      if (keys.length === 0) {
        return 0;
      }

      const deleted = await this.redisClient.del(...keys);
      return deleted;
    } catch (error) {
      console.error(
        `[Routing Cache] Error clearing routing errors: ${error instanceof Error ? error.message : error}`,
      );
      return 0;
    }
  }
}
