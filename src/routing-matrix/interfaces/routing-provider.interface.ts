import { Coordinate, RoutingMatrixRequest, RoutingMatrixResponse } from '../types/routing.types';

/**
 * Interface for routing service providers
 * Allows switching between different routing services (TomTom, OSRM, etc.)
 */
export interface IRoutingProvider {
  /**
   * Calculate routing matrix for multiple coordinates
   */
  calculateMatrix(
    request: RoutingMatrixRequest,
    requestName?: string,
  ): Promise<RoutingMatrixResponse>;

  /**
   * Get provider name for logging/debugging
   */
  getProviderName(): string;
}

