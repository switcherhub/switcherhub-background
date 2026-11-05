import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IRoutingProvider } from '../interfaces/routing-provider.interface';
import {
  Coordinate,
  RoutingMatrixRequest,
  RoutingMatrixResponse,
} from '../types/routing.types';
import { RoutingCacheService } from '../services/routing-cache.service';

/**
 * Mapbox routing provider implementation
 * Uses Mapbox Matrix API (Directions Matrix) for matrix calculations
 * Documentation: https://docs.mapbox.com/api/navigation/matrix/
 */
@Injectable()
export class MapboxRoutingProvider implements IRoutingProvider {
  private readonly TIMEOUT_MS = 10000; // 10 seconds timeout
  private readonly BASE_URL =
    'https://api.mapbox.com/directions-matrix/v1/mapbox/driving';
  private readonly MAX_COORDINATES_PER_REQUEST = 25; // Mapbox API limit

  /**
   * ANSI color codes for console output
   */
  private readonly COLORS = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
  };

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly routingCacheService?: RoutingCacheService,
  ) {}

  getProviderName(): string {
    return 'Mapbox';
  }

  /**
   * Format API Usage log message with color
   */
  private formatApiUsageLog(message: string): string {
    return `${this.COLORS.blue}[Mapbox API]${this.COLORS.reset} ${this.COLORS.blue}${message}${this.COLORS.reset}`;
  }

  /**
   * Get Mapbox access token from configuration
   */
  private getAccessToken(): string {
    const token =
      this.configService.get<string>('MAPBOX_ACCESS_TOKEN') ||
      process.env.MAPBOX_ACCESS_TOKEN;

    if (!token) {
      throw new Error(
        'MAPBOX_ACCESS_TOKEN is not configured. Please set MAPBOX_ACCESS_TOKEN environment variable.',
      );
    }

    return token;
  }

  /**
   * Build coordinates string for Mapbox API: longitude,latitude;longitude,latitude;...
   */
  private buildCoordinatesString(
    points: Array<{ latitude: number; longitude: number }>,
  ): string {
    return points
      .map((p) => `${p.longitude},${p.latitude}`)
      .join(';');
  }

  /**
   * Make Mapbox Matrix API GET request with timeout
   */
  private async makeRequest<T>(
    url: string,
    requestName: string = 'Mapbox Matrix Request',
    coordinatesCount?: number,
  ): Promise<T> {
    const requestStart = Date.now();

    try {
      const response = await axios.get<T>(url, {
        timeout: this.TIMEOUT_MS,
      });

      const requestDuration = Date.now() - requestStart;
      const responseSize = JSON.stringify(response.data).length;

      console.log(
        this.formatApiUsageLog(
          `${requestName}: ${this.COLORS.green}✓ Success${this.COLORS.reset} (${requestDuration}ms, ${responseSize} bytes)` +
            (coordinatesCount ? `, ${coordinatesCount} coordinates` : ''),
        ),
      );

      return response.data;
    } catch (error) {
      const requestDuration = Date.now() - requestStart;
      console.error(
        `[Mapbox API] ${requestName}: ❌ Failed (${requestDuration}ms)` +
          (coordinatesCount ? `, ${coordinatesCount} coordinates` : '') +
          `: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Execute a single batch request to Mapbox Matrix API
   * Mapbox expects: coordinates = all points (sources then destinations), sources = indices 0..origins-1, destinations = indices origins..origins+destinations-1
   */
  private async executeBatch(
    originsWithIndices: Array<{
      point: { latitude: number; longitude: number };
      originalIndex: number;
    }>,
    destinationsWithIndices: Array<{
      point: { latitude: number; longitude: number };
      originalIndex: number;
    }>,
    accessToken: string,
    batchName: string,
  ): Promise<{
    durations: Map<string, number>;
    distances: Map<string, number>;
  }> {
    const allPoints = [
      ...originsWithIndices.map((o) => o.point),
      ...destinationsWithIndices.map((d) => d.point),
    ];
    const coordinatesStr = this.buildCoordinatesString(allPoints);
    const numOrigins = originsWithIndices.length;
    const numDestinations = destinationsWithIndices.length;

    // Mapbox does not support 1×1 matrix (single element). Minimum is 2 elements.
    // For 1 source × 1 destination we request full 2×2 matrix (no sources/destinations params).
    const isSinglePair = numOrigins === 1 && numDestinations === 1;

    const params = new URLSearchParams({
      access_token: accessToken,
      annotations: 'duration,distance',
    });
    if (!isSinglePair) {
      // sources = 0;1;...;numOrigins-1, destinations = numOrigins;numOrigins+1;...
      params.set(
        'sources',
        Array.from({ length: numOrigins }, (_, i) => i).join(';'),
      );
      params.set(
        'destinations',
        Array.from(
          { length: numDestinations },
          (_, i) => numOrigins + i,
        ).join(';'),
      );
    }

    const url = `${this.BASE_URL}/${encodeURIComponent(coordinatesStr)}?${params.toString()}`;

    const response = await this.makeRequest<MapboxMatrixResponse>(
      url,
      batchName,
      allPoints.length,
    );

    if (response.code !== 'Ok') {
      console.warn(
        `[Mapbox API] ${batchName}: code=${response.code}${response.message ? ` - ${response.message}` : ''}. Filling matrix with -1.`,
      );
    }

    const durations = new Map<string, number>();
    const distances = new Map<string, number>();
    const errorsToSave: Array<{
      from: Coordinate;
      to: Coordinate;
      error: string;
    }> = [];

    const responseDurations = response.durations ?? [];
    const responseDistances = response.distances ?? [];

    for (let i = 0; i < numOrigins; i++) {
      for (let j = 0; j < numDestinations; j++) {
        const originalOriginIdx = originsWithIndices[i].originalIndex;
        const originalDestIdx = destinationsWithIndices[j].originalIndex;
        const key = `${originalOriginIdx}-${originalDestIdx}`;

        // For 1×1 we requested 2×2 matrix; origin→dest is at [0][1]
        const durationVal = isSinglePair
          ? responseDurations[0]?.[1]
          : responseDurations[i]?.[j];
        const distanceVal = isSinglePair
          ? responseDistances[0]?.[1]
          : responseDistances[i]?.[j];

        const duration =
          durationVal != null && typeof durationVal === 'number'
            ? Math.round(durationVal)
            : -1;
        const distance =
          distanceVal != null && typeof distanceVal === 'number'
            ? Math.round(distanceVal)
            : -1;

        durations.set(key, duration);
        distances.set(key, distance);

        if (duration < 0 || distance < 0) {
          const fromCoord = originsWithIndices[i].point;
          const toCoord = destinationsWithIndices[j].point;
          const from: Coordinate = {
            lat: fromCoord.latitude,
            lng: fromCoord.longitude,
          };
          const to: Coordinate = {
            lat: toCoord.latitude,
            lng: toCoord.longitude,
          };
          const errorMessage =
            response.code === 'NoRoute'
              ? 'No route found'
              : 'No route or null result';
          console.warn(
            `[Mapbox API] Route from (${from.lat}, ${from.lng}) to (${to.lat}, ${to.lng}) failed: ${errorMessage}`,
          );
          errorsToSave.push({ from, to, error: errorMessage });
        }
      }
    }

    if (this.routingCacheService && errorsToSave.length > 0) {
      await Promise.all(
        errorsToSave.map((err) =>
          this.routingCacheService!.saveRoutingError(
            err.from,
            err.to,
            err.error,
            'Mapbox',
          ),
        ),
      );
    }

    return { durations, distances };
  }

  /**
   * Calculate routing matrix for multiple coordinates using Mapbox Matrix API
   * Uses GET with coordinates in path. Max 25 coordinates per request; batches when needed.
   */
  async calculateMatrix(
    request: RoutingMatrixRequest,
    requestName?: string,
  ): Promise<RoutingMatrixResponse> {
    const accessToken = this.getAccessToken();
    const coordinatesCount = request.coordinates.length;
    const sourcesCount = request.sources.length;
    const destinationsCount = request.destinations?.length ?? 0;

    const name = requestName ?? 'Routing Matrix Request';
    console.log(
      this.formatApiUsageLog(
        `${name} [${this.getProviderName()}]: Requesting matrix` +
          ` (${coordinatesCount} coordinates, ${sourcesCount} sources` +
          (destinationsCount > 0 ? `, ${destinationsCount} destinations` : '') +
          `)`,
      ),
    );

    const originsWithIndices = request.sources.map((idx) => ({
      point: {
        latitude: request.coordinates[idx].lat,
        longitude: request.coordinates[idx].lng,
      },
      originalIndex: idx,
    }));

    let destinationsWithIndices: Array<{
      point: { latitude: number; longitude: number };
      originalIndex: number;
    }>;
    if (request.destinations && request.destinations.length > 0) {
      destinationsWithIndices = request.destinations.map((idx) => ({
        point: {
          latitude: request.coordinates[idx].lat,
          longitude: request.coordinates[idx].lng,
        },
        originalIndex: idx,
      }));
    } else {
      const originIndices = new Set(request.sources);
      destinationsWithIndices = request.coordinates
        .map((coord, idx) => ({ coord, idx }))
        .filter(({ idx }) => !originIndices.has(idx))
        .map(({ coord, idx }) => ({
          point: {
            latitude: coord.lat,
            longitude: coord.lng,
          },
          originalIndex: idx,
        }));
      if (destinationsWithIndices.length === 0) {
        destinationsWithIndices = request.coordinates.map((coord, idx) => ({
          point: {
            latitude: coord.lat,
            longitude: coord.lng,
          },
          originalIndex: idx,
        }));
      }
    }

    const totalCoordsPerBatch =
      originsWithIndices.length + destinationsWithIndices.length;

    const durations: number[][] = [];
    const distances: number[][] = [];
    for (let i = 0; i < sourcesCount; i++) {
      durations[i] = [];
      distances[i] = [];
      for (let j = 0; j < destinationsWithIndices.length; j++) {
        durations[i][j] = -1;
        distances[i][j] = -1;
      }
    }

    if (totalCoordsPerBatch <= this.MAX_COORDINATES_PER_REQUEST) {
      const { durations: batchDurations, distances: batchDistances } =
        await this.executeBatch(
          originsWithIndices,
          destinationsWithIndices,
          accessToken,
          name,
        );

      for (let i = 0; i < sourcesCount; i++) {
        for (let j = 0; j < destinationsWithIndices.length; j++) {
          const key = `${request.sources[i]}-${destinationsWithIndices[j].originalIndex}`;
          const duration = batchDurations.get(key);
          const distance = batchDistances.get(key);
          if (duration !== undefined) durations[i][j] = duration;
          if (distance !== undefined) distances[i][j] = distance;
        }
      }
    } else {
      console.log(
        this.formatApiUsageLog(
          `Total coordinates (${totalCoordsPerBatch}) exceeds limit (${this.MAX_COORDINATES_PER_REQUEST}). Splitting into batches...`,
        ),
      );

      if (destinationsWithIndices.length >= originsWithIndices.length) {
        const maxDestPerBatch =
          this.MAX_COORDINATES_PER_REQUEST - originsWithIndices.length;
        const batchesCount = Math.ceil(
          destinationsWithIndices.length / maxDestPerBatch,
        );

        console.log(
          this.formatApiUsageLog(
            `Splitting into ${batchesCount} batches by destinations (max ${maxDestPerBatch} destinations per batch)`,
          ),
        );

        for (let batchIdx = 0; batchIdx < batchesCount; batchIdx++) {
          const startIdx = batchIdx * maxDestPerBatch;
          const endIdx = Math.min(
            startIdx + maxDestPerBatch,
            destinationsWithIndices.length,
          );
          const batchDestinations = destinationsWithIndices.slice(
            startIdx,
            endIdx,
          );
          const batchName = `${name} [Batch ${batchIdx + 1}/${batchesCount}]`;

          const { durations: batchDurations, distances: batchDistances } =
            await this.executeBatch(
              originsWithIndices,
              batchDestinations,
              accessToken,
              batchName,
            );

          for (let i = 0; i < sourcesCount; i++) {
            for (let batchDestIdx = 0; batchDestIdx < batchDestinations.length; batchDestIdx++) {
              const destIdx = startIdx + batchDestIdx;
              const key = `${request.sources[i]}-${batchDestinations[batchDestIdx].originalIndex}`;
              const duration = batchDurations.get(key);
              const distance = batchDistances.get(key);
              if (duration !== undefined) durations[i][destIdx] = duration;
              if (distance !== undefined) distances[i][destIdx] = distance;
            }
          }
        }
      } else {
        const maxOriginPerBatch =
          this.MAX_COORDINATES_PER_REQUEST - destinationsWithIndices.length;
        const batchesCount = Math.ceil(
          originsWithIndices.length / maxOriginPerBatch,
        );

        console.log(
          this.formatApiUsageLog(
            `Splitting into ${batchesCount} batches by origins (max ${maxOriginPerBatch} origins per batch)`,
          ),
        );

        for (let batchIdx = 0; batchIdx < batchesCount; batchIdx++) {
          const startIdx = batchIdx * maxOriginPerBatch;
          const endIdx = Math.min(
            startIdx + maxOriginPerBatch,
            originsWithIndices.length,
          );
          const batchOrigins = originsWithIndices.slice(startIdx, endIdx);
          const batchName = `${name} [Batch ${batchIdx + 1}/${batchesCount}]`;

          const { durations: batchDurations, distances: batchDistances } =
            await this.executeBatch(
              batchOrigins,
              destinationsWithIndices,
              accessToken,
              batchName,
            );

          for (let batchOriginIdx = 0; batchOriginIdx < batchOrigins.length; batchOriginIdx++) {
            const sourceIdx = request.sources.indexOf(
              batchOrigins[batchOriginIdx].originalIndex,
            );
            if (sourceIdx === -1) continue;
            for (let j = 0; j < destinationsWithIndices.length; j++) {
              const key = `${batchOrigins[batchOriginIdx].originalIndex}-${destinationsWithIndices[j].originalIndex}`;
              const duration = batchDurations.get(key);
              const distance = batchDistances.get(key);
              if (duration !== undefined) durations[sourceIdx][j] = duration;
              if (distance !== undefined) distances[sourceIdx][j] = distance;
            }
          }
        }
      }

      console.log(
        this.formatApiUsageLog('All batches completed successfully'),
      );
    }

    return {
      durations,
      distances,
    };
  }
}

/**
 * Mapbox Matrix API response
 * https://docs.mapbox.com/api/navigation/matrix/
 */
interface MapboxMatrixResponse {
  code: string;
  message?: string;
  /** durations[i][j] = travel time in seconds from source i to destination j; null if no route */
  durations?: (number | null)[][];
  /** distances[i][j] = distance in meters; null if no route */
  distances?: (number | null)[][];
  sources?: unknown[];
  destinations?: unknown[];
}
