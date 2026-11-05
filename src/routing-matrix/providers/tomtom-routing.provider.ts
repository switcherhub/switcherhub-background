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
 * TomTom routing provider implementation
 * Uses TomTom Routing Matrix API v2 for matrix calculations
 * Documentation: https://developer.tomtom.com/matrix-routing-v2-api/documentation
 */
@Injectable()
export class TomTomRoutingProvider implements IRoutingProvider {
  private readonly TIMEOUT_MS = 10000; // 10 seconds timeout
  private readonly BASE_URL = 'https://api.tomtom.com/routing/matrix/2';
  private readonly MAX_MATRIX_SIZE = 100; // TomTom API limit: max 100 elements (origins * destinations)

  /**
   * ANSI color codes for console output
   */
  private readonly COLORS = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    magenta: '\x1b[35m',
  };

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly routingCacheService?: RoutingCacheService,
  ) {}

  getProviderName(): string {
    return 'TomTom';
  }

  /**
   * Format API Usage log message with color
   */
  private formatApiUsageLog(message: string): string {
    return `${this.COLORS.magenta}[TomTom API]${this.COLORS.reset} ${this.COLORS.magenta}${message}${this.COLORS.reset}`;
  }

  /**
   * Get TomTom API key from configuration
   */
  private getApiKey(): string {
    const apiKey =
      this.configService.get<string>('TOMTOM_API_KEY') ||
      process.env.TOMTOM_API_KEY;

    if (!apiKey) {
      throw new Error(
        'TOMTOM_API_KEY is not configured. Please set TOMTOM_API_KEY environment variable.',
      );
    }

    return apiKey;
  }

  /**
   * Get next Monday at 8:00 AM in ISO 8601 format
   * If today is Monday and before 8 AM, returns today at 8 AM
   * Otherwise, returns the next Monday at 8 AM
   */
  private getNextMonday8AM(): string {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const currentHour = now.getHours();

    let daysUntilMonday: number;

    if (currentDay === 1 && currentHour < 8) {
      // Today is Monday and it's before 8 AM, use today
      daysUntilMonday = 0;
    } else if (currentDay === 0) {
      // Today is Sunday, next Monday is tomorrow
      daysUntilMonday = 1;
    } else if (currentDay === 1) {
      // Today is Monday but after 8 AM, next Monday is in 7 days
      daysUntilMonday = 7;
    } else {
      // Any other day, calculate days until next Monday
      daysUntilMonday = 8 - currentDay;
    }

    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(8, 0, 0, 0);

    // Format as ISO 8601 string
    return nextMonday.toISOString();
  }

  /**
   * Make TomTom routing API POST request with timeout
   */
  private async makeRequest<T>(
    url: string,
    body: any,
    requestName: string = 'TomTom Routing Request',
    coordinatesCount?: number,
  ): Promise<T> {
    const requestStart = Date.now();

    try {
      const response = await axios.post<T>(url, body, {
        timeout: this.TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
        },
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
        `[TomTom API] ${requestName}: ❌ Failed (${requestDuration}ms)` +
          (coordinatesCount ? `, ${coordinatesCount} coordinates` : '') +
          `: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Execute a single batch request to TomTom API
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
    apiKey: string,
    batchName: string,
  ): Promise<{
    durations: Map<string, number>;
    distances: Map<string, number>;
  }> {
    const origins = originsWithIndices.map((o) => o.point);
    const destinations = destinationsWithIndices.map((d) => d.point);
    const originIndices = originsWithIndices.map((o) => o.originalIndex);
    const destinationIndices = destinationsWithIndices.map(
      (d) => d.originalIndex,
    );

    const requestBody: TomTomMatrixRequest = {
      origins: origins.map((point) => ({ point })),
      destinations: destinations.map((point) => ({ point })),
      options: {
        travelMode: 'car',
        routeType: 'fastest',
        traffic: 'historical',
        departAt: this.getNextMonday8AM(),
      },
    };

    const url = `${this.BASE_URL}?key=${apiKey}`;

    const response = await this.makeRequest<TomTomMatrixResponse>(
      url,
      requestBody,
      batchName,
      origins.length + destinations.length,
    );

    const routeResults = response.data || [];
    const expectedPairsCount = originIndices.length * destinationIndices.length;

    console.log(
      this.formatApiUsageLog(
        `${batchName}: Response has ${routeResults.length} results, expected ${expectedPairsCount} pairs (${originIndices.length} origins × ${destinationIndices.length} destinations)`,
      ),
    );

    const durations = new Map<string, number>();
    const distances = new Map<string, number>();
    const errorsToSave: Array<{
      from: Coordinate;
      to: Coordinate;
      error: string;
    }> = [];

    let withSummary = 0;
    let withError = 0;

    // Fill maps from response
    for (const result of routeResults) {
      const originIdx = result.originIndex;
      const destIdx = result.destinationIndex;

      if (
        originIdx >= 0 &&
        originIdx < originIndices.length &&
        destIdx >= 0 &&
        destIdx < destinationIndices.length
      ) {
        const actualOriginIdx = originIndices[originIdx];
        const actualDestIdx = destinationIndices[destIdx];
        const key = `${actualOriginIdx}-${actualDestIdx}`;

        if (result.routeSummary) {
          durations.set(key, result.routeSummary.travelTimeInSeconds);
          distances.set(key, result.routeSummary.lengthInMeters);
          withSummary++;
        } else if (result.detailedError) {
          // Route not found or error - leave as -1 (default). detailedError can be string or object.
          withError++;
          const errorMessage = formatTomTomDetailedError(result.detailedError);
          const fromCoord = originsWithIndices[originIdx]?.point;
          const toCoord = destinationsWithIndices[destIdx]?.point;

          if (fromCoord && toCoord) {
            const from: Coordinate = {
              lat: fromCoord.latitude,
              lng: fromCoord.longitude,
            };
            const to: Coordinate = {
              lat: toCoord.latitude,
              lng: toCoord.longitude,
            };

            console.warn(
              `[TomTom API] Route from (${from.lat}, ${from.lng}) to (${to.lat}, ${to.lng}) failed: ${errorMessage}`,
            );
            if (withError === 1) {
              console.warn(
                `[TomTom API] First failed result (raw): ${JSON.stringify(result)}`,
              );
            }

            errorsToSave.push({
              from,
              to,
              error: errorMessage,
            });
          } else {
            console.warn(
              `[TomTom API] Route from origin ${actualOriginIdx} to destination ${actualDestIdx} failed: ${errorMessage}`,
            );
          }
        } else {
          // No routeSummary and no detailedError - unexpected shape
          console.warn(
            `[TomTom API] Result with no routeSummary and no detailedError (originIndex=${originIdx}, destinationIndex=${destIdx}, raw): ${JSON.stringify(result)}`,
          );
        }
      }
    }

    // Pairs with -1: either detailedError (TomTom returned error) or not in response at all
    const missingFromMap = expectedPairsCount - withSummary;
    const trulyMissing = Math.max(0, missingFromMap - withError);

    if (missingFromMap > 0) {
      console.warn(
        this.formatApiUsageLog(
          `${batchName}: ${withSummary} OK, ${withError} failed (detailedError → -1), ${trulyMissing} missing from API response → -1. Total -1: ${missingFromMap}.`,
        ),
      );
    } else {
      console.log(
        this.formatApiUsageLog(
          `${batchName}: All ${expectedPairsCount} pairs OK.`,
        ),
      );
    }

    // Save all errors in parallel
    if (this.routingCacheService && errorsToSave.length > 0) {
      await Promise.all(
        errorsToSave.map((err) =>
          this.routingCacheService!.saveRoutingError(
            err.from,
            err.to,
            err.error,
            'TomTom',
          ),
        ),
      );
    }

    return { durations, distances };
  }

  /**
   * Calculate routing matrix for multiple coordinates using TomTom API
   * TomTom Matrix API v2 uses POST requests with JSON body
   * If matrix size exceeds 100 elements, splits into batches and executes them sequentially
   */
  async calculateMatrix(
    request: RoutingMatrixRequest,
    requestName?: string,
  ): Promise<RoutingMatrixResponse> {
    const apiKey = this.getApiKey();
    const coordinatesCount = request.coordinates.length;
    const sourcesCount = request.sources.length;
    const destinationsCount = request.destinations?.length || 0;

    // Log request details
    const name = requestName || `Routing Matrix Request`;
    console.log(
      this.formatApiUsageLog(
        `${name} [${this.getProviderName()}]: Requesting matrix` +
          ` (${coordinatesCount} coordinates, ${sourcesCount} sources` +
          (destinationsCount > 0 ? `, ${destinationsCount} destinations` : '') +
          `)`,
      ),
    );

    // Extract origins (sources) with their original indices
    const originsWithIndices = request.sources.map((idx) => ({
      point: {
        latitude: request.coordinates[idx].lat,
        longitude: request.coordinates[idx].lng,
      },
      originalIndex: idx,
    }));

    // Extract destinations with their original indices
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
      // If no destinations specified, use all coordinates except origins
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

      // If we want to include all-to-all, we need to use all coordinates
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

    const matrixSize =
      originsWithIndices.length * destinationsWithIndices.length;

    // Initialize result matrices
    const durations: number[][] = [];
    const distances: number[][] = [];
    for (let i = 0; i < sourcesCount; i++) {
      durations[i] = [];
      distances[i] = [];
      for (let j = 0; j < destinationsWithIndices.length; j++) {
        durations[i][j] = -1; // -1 indicates no route found
        distances[i][j] = -1;
      }
    }

    // If matrix size is within limit, execute single request
    if (matrixSize <= this.MAX_MATRIX_SIZE) {
      const { durations: batchDurations, distances: batchDistances } =
        await this.executeBatch(
          originsWithIndices,
          destinationsWithIndices,
          apiKey,
          name,
        );

      // Fill result matrices
      for (let i = 0; i < sourcesCount; i++) {
        for (let j = 0; j < destinationsWithIndices.length; j++) {
          const key = `${request.sources[i]}-${destinationsWithIndices[j].originalIndex}`;
          const duration = batchDurations.get(key);
          const distance = batchDistances.get(key);
          if (duration !== undefined) {
            durations[i][j] = duration;
          }
          if (distance !== undefined) {
            distances[i][j] = distance;
          }
        }
      }
    } else {
      // Matrix size exceeds limit, split into batches
      console.log(
        this.formatApiUsageLog(
          `Matrix size (${matrixSize}) exceeds limit (${this.MAX_MATRIX_SIZE}). Splitting into batches...`,
        ),
      );

      // If destinations exceed limit, batch by destinations
      // Otherwise, batch by origins
      if (destinationsWithIndices.length > this.MAX_MATRIX_SIZE) {
        // Batch destinations (most common case: 1 origin, many destinations)
        const maxDestinationsPerBatch = this.MAX_MATRIX_SIZE;
        const batchesCount = Math.ceil(
          destinationsWithIndices.length / maxDestinationsPerBatch,
        );

        console.log(
          this.formatApiUsageLog(
            `Splitting into ${batchesCount} batches by destinations (max ${maxDestinationsPerBatch} destinations per batch)`,
          ),
        );

        // Execute batches sequentially
        for (let batchIdx = 0; batchIdx < batchesCount; batchIdx++) {
          const startIdx = batchIdx * maxDestinationsPerBatch;
          const endIdx = Math.min(
            startIdx + maxDestinationsPerBatch,
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
              apiKey,
              batchName,
            );

          // Fill result matrices with batch results
          for (let i = 0; i < sourcesCount; i++) {
            const originalOriginIdx = originsWithIndices[i].originalIndex;
            const sourceIdx = request.sources.indexOf(originalOriginIdx);

            if (sourceIdx === -1) continue;

            for (
              let batchDestIdx = 0;
              batchDestIdx < batchDestinations.length;
              batchDestIdx++
            ) {
              const originalDestIdx =
                batchDestinations[batchDestIdx].originalIndex;
              const destIdx = startIdx + batchDestIdx;
              const key = `${originalOriginIdx}-${originalDestIdx}`;
              const duration = batchDurations.get(key);
              const distance = batchDistances.get(key);
              if (duration !== undefined) {
                durations[sourceIdx][destIdx] = duration;
              }
              if (distance !== undefined) {
                distances[sourceIdx][destIdx] = distance;
              }
            }
          }
        }
      } else {
        // Batch origins (when origins * destinations > limit but destinations <= limit)
        const maxOriginsPerBatch = Math.floor(
          this.MAX_MATRIX_SIZE / destinationsWithIndices.length,
        );
        const batchesCount = Math.ceil(
          originsWithIndices.length / maxOriginsPerBatch,
        );

        console.log(
          this.formatApiUsageLog(
            `Splitting into ${batchesCount} batches by origins (max ${maxOriginsPerBatch} origins per batch)`,
          ),
        );

        // Execute batches sequentially
        for (let batchIdx = 0; batchIdx < batchesCount; batchIdx++) {
          const startIdx = batchIdx * maxOriginsPerBatch;
          const endIdx = Math.min(
            startIdx + maxOriginsPerBatch,
            originsWithIndices.length,
          );
          const batchOrigins = originsWithIndices.slice(startIdx, endIdx);

          const batchName = `${name} [Batch ${batchIdx + 1}/${batchesCount}]`;

          const { durations: batchDurations, distances: batchDistances } =
            await this.executeBatch(
              batchOrigins,
              destinationsWithIndices,
              apiKey,
              batchName,
            );

          // Fill result matrices with batch results
          for (
            let batchOriginIdx = 0;
            batchOriginIdx < batchOrigins.length;
            batchOriginIdx++
          ) {
            const originalOriginIdx = batchOrigins[batchOriginIdx].originalIndex;
            const sourceIdx = request.sources.indexOf(originalOriginIdx);

            if (sourceIdx === -1) continue;

            for (
              let destIdx = 0;
              destIdx < destinationsWithIndices.length;
              destIdx++
            ) {
              const originalDestIdx =
                destinationsWithIndices[destIdx].originalIndex;
              const key = `${originalOriginIdx}-${originalDestIdx}`;
              const duration = batchDurations.get(key);
              const distance = batchDistances.get(key);
              if (duration !== undefined) {
                durations[sourceIdx][destIdx] = duration;
              }
              if (distance !== undefined) {
                distances[sourceIdx][destIdx] = distance;
              }
            }
          }
        }
      }

      console.log(
        this.formatApiUsageLog(
          `All batches completed successfully`,
        ),
      );
    }

    return {
      durations,
      distances,
    };
  }
}

/**
 * TomTom Matrix API Request Type
 */
interface TomTomMatrixRequest {
  origins: Array<{
    point: {
      latitude: number;
      longitude: number;
    };
  }>;
  destinations: Array<{
    point: {
      latitude: number;
      longitude: number;
    };
  }>;
  options?: {
    travelMode?: string;
    routeType?: string;
    traffic?: string;
    departAt?: string;
  };
}

/**
 * TomTom Matrix API Response Type
 */
/** TomTom detailedError can be string or object (API returns object) */
type TomTomDetailedError =
  | string
  | {
      code?: string;
      message?: string;
      innerError?: { code?: string; message?: string };
    };

interface TomTomMatrixResponse {
  data?: Array<{
    originIndex: number;
    destinationIndex: number;
    routeSummary?: {
      lengthInMeters: number;
      travelTimeInSeconds: number;
    };
    detailedError?: TomTomDetailedError;
  }>;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Convert TomTom detailedError (string or object) to a readable string for logging and cache.
 */
function formatTomTomDetailedError(detailedError: TomTomDetailedError): string {
  if (typeof detailedError === 'string') return detailedError;
  const parts: string[] = [];
  if (detailedError.code) parts.push(detailedError.code);
  if (detailedError.message) parts.push(detailedError.message);
  if (detailedError.innerError) {
    const inner = detailedError.innerError;
    if (inner.code) parts.push(`inner: ${inner.code}`);
    if (inner.message) parts.push(inner.message);
  }
  return parts.length > 0 ? parts.join(' ') : JSON.stringify(detailedError);
}
