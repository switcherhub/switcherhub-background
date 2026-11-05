import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IRoutingProvider } from '../interfaces/routing-provider.interface';
import {
  Coordinate,
  RoutingMatrixRequest,
  RoutingMatrixResponse,
} from '../types/routing.types';

/**
 * SwitcherHub/OSRM routing provider implementation
 * Uses the OSRM-based routing service hosted at map.switcherhub.com
 */
@Injectable()
export class SwitcherHubRoutingProvider implements IRoutingProvider {
  private readonly TIMEOUT_MS = 10000; // 10 seconds timeout

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

  constructor(private readonly configService: ConfigService) {}

  getProviderName(): string {
    return 'SwitcherHub/OSRM';
  }

  /**
   * Format API Usage log message with color
   */
  private formatApiUsageLog(message: string): string {
    return `${this.COLORS.cyan}[Routing API]${this.COLORS.reset} ${this.COLORS.cyan}${message}${this.COLORS.reset}`;
  }

  /**
   * Get base URL for routing API
   */
  private getBaseUrl(): string {
    return (
      this.configService.get<string>('MAP_URL') ||
      process.env.MAP_URL ||
      'https://map.switcherhub.com'
    );
  }

  /**
   * Format coordinates for API request
   * Format: lng1,lat1;lng2,lat2;...
   */
  private formatCoordinates(coordinates: Coordinate[]): string {
    return coordinates.map((coord) => `${coord.lng},${coord.lat}`).join(';');
  }

  /**
   * Make routing API request with timeout
   */
  private async makeRequest<T>(
    url: string,
    requestName: string = 'Routing Request',
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
        `[Routing API] ${requestName}: ❌ Failed (${requestDuration}ms)` +
          (coordinatesCount ? `, ${coordinatesCount} coordinates` : '') +
          `: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Calculate routing matrix for multiple coordinates
   */
  async calculateMatrix(
    request: RoutingMatrixRequest,
    requestName?: string,
  ): Promise<RoutingMatrixResponse> {
    const baseUrl = this.getBaseUrl();
    const coordinatesCount = request.coordinates.length;
    const sourcesCount = request.sources.length;
    const destinationsCount = request.destinations?.length || 0;
    const coordinatesStr = this.formatCoordinates(request.coordinates);

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

    // Build sources parameter
    const sourcesParam = request.sources.join(';');

    // Build URL with or without destinations
    let url: string;
    if (request.destinations && request.destinations.length > 0) {
      const destinationsParam = request.destinations.join(';');
      url = `${baseUrl}/table/v1/driving/${coordinatesStr}?sources=${sourcesParam}&destinations=${destinationsParam}&annotations=duration,distance`;
    } else {
      url = `${baseUrl}/table/v1/driving/${coordinatesStr}?sources=${sourcesParam}&annotations=duration,distance`;
    }

    return this.makeRequest<RoutingMatrixResponse>(url, name, coordinatesCount);
  }
}

