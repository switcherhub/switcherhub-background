import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export type CommutePrecision = 'zip' | 'exact';
export type TransportMode = 'car' | 'transit' | 'walk' | 'bike';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface CommuteLocationInput {
  /** Optional resolved coordinate; if present it is used directly (no geocoding). */
  geoPoint?: GeoPoint;
  /** Free-form workplace/home address (used when geoPoint is absent). */
  address?: string;
  /** 5-digit US ZIP (home area); sufficient for an approximate estimate. */
  zip?: string;
  placeId?: string;
  precision?: CommutePrecision;
}

/** Request body for POST /commute/estimate (pre-auth). */
export class CommuteEstimateDto {
  @IsObject()
  workLocation: CommuteLocationInput;

  @IsObject()
  homeArea: CommuteLocationInput;

  @IsString()
  @IsIn(['car', 'transit', 'walk', 'bike'])
  transport: TransportMode;

  @IsOptional()
  @IsString()
  departure?: string; // ISO-8601, optional
}

export interface CommuteEstimateResult {
  minutesOneWay: number;
  source: 'routed' | 'self_reported';
  precision: CommutePrecision;
  transport: TransportMode;
  provider: string;
  calculatedAt: string;
}

export interface CommuteEstimateError {
  error: 'timeout' | 'no_route' | 'geocode_failed';
}
