/**
 * Shared types for routing services
 */

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface RoutingMatrixRequest {
  sources: number[];
  destinations?: number[];
  coordinates: Coordinate[];
}

export interface RoutingMatrixResponse {
  durations?: number[][];
  distances?: number[][];
}

