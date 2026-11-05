import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IRoutingProvider } from '../interfaces/routing-provider.interface';
import {
  Coordinate,
  RoutingMatrixRequest,
  RoutingMatrixResponse,
} from '../types/routing.types';
import { SwitcherHubRoutingProvider } from '../providers/switcherhub-routing.provider';
import { TomTomRoutingProvider } from '../providers/tomtom-routing.provider';
import { MapboxRoutingProvider } from '../providers/mapbox-routing.provider';
import { RoutingCacheService } from './routing-cache.service';

// Re-export types for backward compatibility
export type {
  Coordinate,
  RoutingMatrixRequest,
  RoutingMatrixResponse,
} from '../types/routing.types';

/**
 * Supported routing providers
 */
export type RoutingProviderType = 'switcherhub' | 'tomtom' | 'mapbox';

@Injectable()
export class RoutingMatrixService implements OnModuleInit {
  // Statistics for API usage tracking
  private apiCallCount = 0;
  private totalCoordinatesProcessed = 0;
  private cacheHits = 0;
  private cacheMisses = 0;

  private activeProvider: IRoutingProvider;
  private cacheEnabled: boolean;

  /** Coefficient for fallback: straight-line distance × this = estimated road distance (default 1.7) */
  private fallbackDistanceCoefficient: number;
  /** Average speed in km/h for fallback duration (default 50) */
  private fallbackAverageSpeedKmh: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly switcherHubProvider: SwitcherHubRoutingProvider,
    private readonly tomTomProvider: TomTomRoutingProvider,
    private readonly mapboxProvider: MapboxRoutingProvider,
    private readonly routingCacheService: RoutingCacheService,
  ) {
    // Enable/disable cache via ROUTING_CACHE_ENABLED (default: true)
    this.cacheEnabled =
      (this.configService.get<string>('ROUTING_CACHE_ENABLED') ||
        process.env.ROUTING_CACHE_ENABLED ||
        'true') === 'true';

    this.fallbackDistanceCoefficient =
      Number(
        this.configService.get<string>('ROUTING_FALLBACK_DISTANCE_COEFFICIENT') ||
          process.env.ROUTING_FALLBACK_DISTANCE_COEFFICIENT ||
          '1.7',
      ) || 1.7;
    this.fallbackAverageSpeedKmh =
      Number(
        this.configService.get<string>('ROUTING_FALLBACK_AVERAGE_SPEED_KMH') ||
          process.env.ROUTING_FALLBACK_AVERAGE_SPEED_KMH ||
          '50',
      ) || 50;
  }

  /**
   * Straight-line distance between two points in meters (Haversine formula).
   */
  private static haversineDistanceMeters(from: Coordinate, to: Coordinate): number {
    const R = 6371000; // Earth radius in meters
    const lat1 = (from.lat * Math.PI) / 180;
    const lat2 = (to.lat * Math.PI) / 180;
    const dLat = ((to.lat - from.lat) * Math.PI) / 180;
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Fallback distance (m) and duration (s) when API returns no route:
   * straight-line distance × coefficient, duration = distance / average_speed.
   */
  private getFallbackDistanceAndDuration(
    from: Coordinate,
    to: Coordinate,
  ): { distance: number; duration: number } {
    const straightMeters = RoutingMatrixService.haversineDistanceMeters(from, to);
    const distance = Math.round(
      straightMeters * this.fallbackDistanceCoefficient,
    );
    const speedMetersPerSec = (this.fallbackAverageSpeedKmh * 1000) / 3600;
    const duration = Math.round(distance / speedMetersPerSec);
    return { distance, duration };
  }

  /**
   * Replace -1 (no route / error) in matrices with fallback: straight-line × coefficient.
   */
  private fillFallbackForMissingRoutes(
    request: RoutingMatrixRequest,
    destIndices: number[],
    durations: number[][],
    distances: number[][],
  ): void {
    let filled = 0;
    for (let i = 0; i < request.sources.length; i++) {
      const from = request.coordinates[request.sources[i]];
      for (let j = 0; j < destIndices.length; j++) {
        if (request.sources[i] === destIndices[j]) continue;
        if (durations[i]?.[j] < 0 || distances[i]?.[j] < 0) {
          const to = request.coordinates[destIndices[j]];
          const fallback = this.getFallbackDistanceAndDuration(from, to);
          durations[i][j] = fallback.duration;
          distances[i][j] = fallback.distance;
          filled++;
        }
      }
    }
    if (filled > 0) {
      console.log(
        `[Routing Matrix Service] Fallback: filled ${filled} missing route(s) with straight-line × ${this.fallbackDistanceCoefficient} (avg speed ${this.fallbackAverageSpeedKmh} km/h)`,
      );
    }
  }

  onModuleInit() {
    // Initialize active provider based on configuration
    this.initializeProvider();
  }

  /**
   * Initialize active routing provider based on configuration
   */
  private initializeProvider(): void {
    const providerType = (this.configService.get<string>('ROUTING_PROVIDER') ||
      process.env.ROUTING_PROVIDER ||
      'switcherhub') as RoutingProviderType;

    switch (providerType) {
      case 'tomtom':
        this.activeProvider = this.tomTomProvider;
        console.log(
          `[Routing Matrix Service] Initialized with provider: TomTom`,
        );
        break;
      case 'mapbox':
        this.activeProvider = this.mapboxProvider;
        console.log(
          `[Routing Matrix Service] Initialized with provider: Mapbox`,
        );
        break;
      case 'switcherhub':
      default:
        this.activeProvider = this.switcherHubProvider;
        console.log(
          `[Routing Matrix Service] Initialized with provider: SwitcherHub/OSRM`,
        );
        break;
    }
  }

  /**
   * Get currently active provider
   */
  getActiveProvider(): IRoutingProvider {
    return this.activeProvider;
  }

  /**
   * Switch routing provider at runtime
   */
  switchProvider(providerType: RoutingProviderType): void {
    switch (providerType) {
      case 'tomtom':
        this.activeProvider = this.tomTomProvider;
        break;
      case 'mapbox':
        this.activeProvider = this.mapboxProvider;
        break;
      case 'switcherhub':
      default:
        this.activeProvider = this.switcherHubProvider;
        break;
    }
    console.log(
      `[Routing Matrix Service] Switched to provider: ${this.activeProvider.getProviderName()}`,
    );
  }

  /**
   * Get API usage statistics
   */
  getApiUsageStats(): {
    totalApiCalls: number;
    totalCoordinatesProcessed: number;
    activeProvider: string;
    cacheEnabled: boolean;
    cacheHits: number;
    cacheMisses: number;
    cacheHitRate: number;
  } {
    const totalCacheRequests = this.cacheHits + this.cacheMisses;
    const cacheHitRate =
      totalCacheRequests > 0 ? (this.cacheHits / totalCacheRequests) * 100 : 0;

    return {
      totalApiCalls: this.apiCallCount,
      totalCoordinatesProcessed: this.totalCoordinatesProcessed,
      activeProvider: this.activeProvider.getProviderName(),
      cacheEnabled: this.cacheEnabled,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
    };
  }

  /**
   * Reset API usage statistics
   */
  resetApiUsageStats(): void {
    this.apiCallCount = 0;
    this.totalCoordinatesProcessed = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    console.log(
      `[Routing Matrix Service] Statistics reset for provider: ${this.activeProvider.getProviderName()}`,
    );
  }

  /**
   * Calculate routing matrix for multiple coordinates
   * Uses cache when enabled, delegates to the active routing provider for missing data
   */
  async calculateMatrix(
    request: RoutingMatrixRequest,
    requestName?: string,
  ): Promise<RoutingMatrixResponse> {
    const name = requestName || 'Routing Matrix Request';
    const sourcesCount = request.sources.length;
    const destinations =
      request.destinations && request.destinations.length > 0
        ? request.destinations
        : request.coordinates.map((_, idx) => idx);

    // If cache is disabled, use direct provider call
    if (!this.cacheEnabled) {
      this.apiCallCount++;
      this.totalCoordinatesProcessed += request.coordinates.length;
      const destIndices =
        request.destinations && request.destinations.length > 0
          ? request.destinations
          : request.coordinates.map((_, idx) => idx);
      const result = await this.activeProvider.calculateMatrix(
        request,
        requestName,
      );
      const dur = result.durations ?? [];
      const dist = result.distances ?? [];
      this.fillFallbackForMissingRoutes(request, destIndices, dur, dist);
      return { durations: dur, distances: dist };
    }

    // Build all coordinate pairs (source -> destination)
    const pairs: Array<{
      sourceIdx: number;
      destIdx: number;
      sourceMatrixIdx: number;
      destMatrixIdx: number;
      from: Coordinate;
      to: Coordinate;
    }> = [];

    for (
      let sourceMatrixIdx = 0;
      sourceMatrixIdx < sourcesCount;
      sourceMatrixIdx++
    ) {
      const sourceIdx = request.sources[sourceMatrixIdx];
      for (
        let destMatrixIdx = 0;
        destMatrixIdx < destinations.length;
        destMatrixIdx++
      ) {
        const destIdx = destinations[destMatrixIdx];
        if (sourceIdx !== destIdx) {
          pairs.push({
            sourceIdx,
            destIdx,
            sourceMatrixIdx,
            destMatrixIdx,
            from: request.coordinates[sourceIdx],
            to: request.coordinates[destIdx],
          });
        }
      }
    }

    // Check cache for all pairs
    const cachePairs = pairs.map((p) => ({ from: p.from, to: p.to }));
    const cachedResults =
      await this.routingCacheService.getCachedRoutes(cachePairs);

    // Create a map to match cached results with pairs
    const pairCacheMap = new Map<
      number,
      { distance: number; duration: number }
    >();
    const uncachedPairs: Array<{
      sourceIdx: number;
      destIdx: number;
      sourceMatrixIdx: number;
      destMatrixIdx: number;
      from: Coordinate;
      to: Coordinate;
    }> = [];

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      const pairKey = `${pair.from.lat},${pair.from.lng}:${pair.to.lat},${pair.to.lng}`;
      const cached = cachedResults.get(pairKey);

      if (cached) {
        // Accept cached result even if invalid (-1) to avoid repeated API calls
        pairCacheMap.set(i, cached);
        this.cacheHits++;
        if (cached.duration < 0 || cached.distance < 0) {
          const errorMsg = cached.error ? `: ${cached.error}` : '';
          console.warn(
            `[Routing Matrix Service] ${name}: ⚠️  Using cached invalid result for pair from (${pair.from.lat}, ${pair.from.lng}) to (${pair.to.lat}, ${pair.to.lng}): duration=${cached.duration}, distance=${cached.distance}${errorMsg}`,
          );
        }
      } else {
        uncachedPairs.push(pair);
        this.cacheMisses++;
        // Log which pair is not cached for debugging
        if (uncachedPairs.length === 1) {
          console.log(
            `[Routing Matrix Service] ${name}: ⚠️  Uncached pair: from (${pair.from.lat}, ${pair.from.lng}) to (${pair.to.lat}, ${pair.to.lng})`,
          );
        }
      }
    }

    // Initialize result matrices
    const durations: number[][] = [];
    const distances: number[][] = [];

    for (let i = 0; i < sourcesCount; i++) {
      durations[i] = [];
      distances[i] = [];
      for (let j = 0; j < destinations.length; j++) {
        durations[i][j] = -1;
        distances[i][j] = -1;
      }
    }

    // Fill results from cache
    const cachedCount = pairCacheMap.size;
    for (let i = 0; i < pairs.length; i++) {
      const cached = pairCacheMap.get(i);
      if (cached) {
        const pair = pairs[i];
        durations[pair.sourceMatrixIdx][pair.destMatrixIdx] = cached.duration;
        distances[pair.sourceMatrixIdx][pair.destMatrixIdx] = cached.distance;
      }
    }

    // If all pairs are cached, return early (after fallback for any -1)
    if (uncachedPairs.length === 0) {
      console.log(
        `[Routing Matrix Service] ${name}: ✅ All ${pairs.length} прорахунків взято з кешу`,
      );
      this.fillFallbackForMissingRoutes(request, destinations, durations, distances);
      return { durations, distances };
    }

    console.log(
      `[Routing Matrix Service] ${name}: ✅ ${cachedCount} прорахунків взято з кешу, запитую ${uncachedPairs.length} з API`,
    );

    // Build request for uncached pairs only
    const uncachedCoordinates = new Set<number>();
    const uncachedSources = new Set<number>();
    const uncachedDestinations = new Set<number>();

    for (const pair of uncachedPairs) {
      uncachedCoordinates.add(pair.sourceIdx);
      uncachedCoordinates.add(pair.destIdx);
      uncachedSources.add(pair.sourceIdx);
      uncachedDestinations.add(pair.destIdx);
    }

    // Create coordinate mapping
    const coordinateMap = new Map<number, number>(); // old index -> new index
    const newCoordinates: Coordinate[] = [];
    let newIdx = 0;

    for (const oldIdx of uncachedCoordinates) {
      coordinateMap.set(oldIdx, newIdx);
      newCoordinates.push(request.coordinates[oldIdx]);
      newIdx++;
    }

    // Map sources and destinations to new indices
    const newSources = Array.from(uncachedSources)
      .sort((a, b) => a - b)
      .map((oldIdx) => coordinateMap.get(oldIdx)!);

    // If original request had destinations, use them; otherwise use all coordinates
    const useDestinations =
      request.destinations && request.destinations.length > 0;
    const newDestinations = useDestinations
      ? Array.from(uncachedDestinations)
          .sort((a, b) => a - b)
          .map((oldIdx) => coordinateMap.get(oldIdx)!)
      : undefined;

    // Make API request for uncached pairs
    const uncachedRequest: RoutingMatrixRequest = {
      sources: newSources,
      destinations: newDestinations,
      coordinates: newCoordinates,
    };

    this.apiCallCount++;
    this.totalCoordinatesProcessed += newCoordinates.length;

    const apiResponse = await this.activeProvider.calculateMatrix(
      uncachedRequest,
      `${name} (uncached)`,
    );

    // Cache new results and fill result matrices
    const routesToCache: Array<{
      from: Coordinate;
      to: Coordinate;
      result: { distance: number; duration: number };
    }> = [];

    for (const pair of uncachedPairs) {
      const newSourceIdx = coordinateMap.get(pair.sourceIdx);
      const newDestIdx = coordinateMap.get(pair.destIdx);

      if (newSourceIdx !== undefined && newDestIdx !== undefined) {
        // Find the result in API response
        // newSources is sorted array of source indices
        const apiSourceIdx = newSources.indexOf(newSourceIdx);

        // For destinations: if specified, find index; otherwise use coordinate index
        let apiDestIdx: number;
        if (useDestinations && newDestinations) {
          apiDestIdx = newDestinations.indexOf(newDestIdx);
        } else {
          // When destinations not specified, API returns matrix from sources to all coordinates
          apiDestIdx = newDestIdx;
        }

        if (apiSourceIdx >= 0 && apiDestIdx >= 0) {
          const duration =
            apiResponse.durations?.[apiSourceIdx]?.[apiDestIdx] ?? -1;
          const distance =
            apiResponse.distances?.[apiSourceIdx]?.[apiDestIdx] ?? -1;

          // Always set result in matrix (even if -1)
          durations[pair.sourceMatrixIdx][pair.destMatrixIdx] = duration;
          distances[pair.sourceMatrixIdx][pair.destMatrixIdx] = distance;

          // Cache all results (including invalid ones) to avoid repeated API calls
          // Error message will be stored separately in routing:error:* keys
          routesToCache.push({
            from: pair.from,
            to: pair.to,
            result: { distance, duration },
          });

          if (duration < 0 || distance < 0) {
            console.warn(
              `[Routing Matrix Service] ${name}: ⚠️  Invalid result for pair from (${pair.from.lat}, ${pair.from.lng}) to (${pair.to.lat}, ${pair.to.lng}): duration=${duration}, distance=${distance}. Caching to avoid repeated requests. See [TomTom API] logs above for reason (detailedError or missing from response).`,
            );
          }
        } else {
          console.warn(
            `[Routing Matrix Service] ${name}: ⚠️  Could not find API indices for pair from (${pair.from.lat}, ${pair.from.lng}) to (${pair.to.lat}, ${pair.to.lng}): apiSourceIdx=${apiSourceIdx}, apiDestIdx=${apiDestIdx}, newSourceIdx=${newSourceIdx}, newDestIdx=${newDestIdx}, newSources=${JSON.stringify(newSources)}, newDestinations=${JSON.stringify(newDestinations)}`,
          );
        }
      } else {
        console.warn(
          `[Routing Matrix Service] ${name}: ⚠️  Could not map coordinates for pair from (${pair.from.lat}, ${pair.from.lng}) to (${pair.to.lat}, ${pair.to.lng}): newSourceIdx=${newSourceIdx}, newDestIdx=${newDestIdx}`,
        );
      }
    }

    // Save new results to cache
    // For invalid results, also include error message if available
    if (routesToCache.length > 0) {
      // Enrich invalid results with error messages
      const enrichedRoutes = await Promise.all(
        routesToCache.map(async (route) => {
          if (route.result.distance < 0 || route.result.duration < 0) {
            // Try to get error message from error cache
            const error = await this.routingCacheService.getRoutingError(
              route.from,
              route.to,
            );
            if (error) {
              return {
                ...route,
                result: { ...route.result, error },
              };
            }
          }
          return route;
        }),
      );

      await this.routingCacheService.setCachedRoutes(enrichedRoutes);
      const totalDistance = routesToCache.reduce(
        (sum, r) => sum + (r.result.distance >= 0 ? r.result.distance : 0),
        0,
      );
      const totalDuration = routesToCache.reduce(
        (sum, r) => sum + (r.result.duration >= 0 ? r.result.duration : 0),
        0,
      );
      const validRoutes = routesToCache.filter(
        (r) => r.result.distance >= 0 && r.result.duration >= 0,
      ).length;
      const invalidRoutes = routesToCache.length - validRoutes;
      console.log(
        `[Routing Matrix Service] ${name}: ✅ Cached ${routesToCache.length} new routes` +
          (validRoutes > 0
            ? ` (${validRoutes} valid: ${(totalDistance / 1000).toFixed(2)}km, ${Math.round(totalDuration / 60)}min)`
            : '') +
          (invalidRoutes > 0 ? `, ${invalidRoutes} invalid (with errors)` : ''),
      );
    }

    this.fillFallbackForMissingRoutes(request, destinations, durations, distances);
    return { durations, distances };
  }

  /**
   * Calculate distance and duration between two points
   * Uses cache when enabled
   */
  async calculateRoute(
    from: Coordinate,
    to: Coordinate,
    requestName?: string,
  ): Promise<{ distanceKm: number; durationSeconds: number } | null> {
    try {
      // Check cache first if enabled
      if (this.cacheEnabled) {
        const cached = await this.routingCacheService.getCachedRoute(from, to);
        if (cached) {
          this.cacheHits++;
          let distance = cached.distance;
          let duration = cached.duration;
          if (distance < 0 || duration < 0) {
            const fallback = this.getFallbackDistanceAndDuration(from, to);
            distance = fallback.distance;
            duration = fallback.duration;
          }
          return {
            distanceKm: distance / 1000,
            durationSeconds: duration,
          };
        }
        this.cacheMisses++;
      }

      const response = await this.calculateMatrix(
        {
          sources: [0],
          coordinates: [from, to],
        },
        requestName,
      );

      const distance = response.distances?.[0]?.[1];
      const duration = response.durations?.[0]?.[1];

      // Use API result if valid; otherwise use fallback (straight-line × coefficient)
      let finalDistance = distance ?? -1;
      let finalDuration = duration ?? -1;
      if (finalDistance < 0 || finalDuration < 0) {
        const fallback = this.getFallbackDistanceAndDuration(from, to);
        finalDistance = fallback.distance;
        finalDuration = fallback.duration;
        console.log(
          `[Routing Matrix Service] ${requestName || 'calculateRoute'}: using fallback (straight-line × ${this.fallbackDistanceCoefficient}) for no-route pair`,
        );
      }

      const result = {
        distanceKm: finalDistance / 1000,
        durationSeconds: finalDuration,
      };

      if (this.cacheEnabled) {
        await this.routingCacheService.setCachedRoute(from, to, {
          distance: finalDistance,
          duration: finalDuration,
        });
        console.log(
          `[Routing Matrix Service] ${requestName || 'calculateRoute'}: ✅ Cached route` +
            ` (${result.distanceKm.toFixed(2)}km, ${Math.round(result.durationSeconds / 60)}min)`,
        );
      }

      return result;
    } catch (error) {
      console.error(
        `Error calculating route from ${from.lng},${from.lat} to ${to.lng},${to.lat}:`,
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }
}
