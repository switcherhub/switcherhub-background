import { Injectable, Logger } from '@nestjs/common';
import { CommuteLocationInput, GeoPoint } from '../dto/commute-estimate.dto';

interface GeocodeOutput {
  point: GeoPoint;
  precision: 'zip' | 'exact';
}

/**
 * Forward geocoding for commute estimates (spec §8.3, R1). ZIP-only yields an
 * approximate area centroid (precision=zip); a full address yields precision=exact.
 * Uses Nominatim (US-scoped). No PII is logged (FR-023).
 *
 * NOTE: provider is swappable; territory beyond US ZIP is decided in the audit stage.
 */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly base = 'https://nominatim.openstreetmap.org/search';

  /** Resolve a location input to a coordinate + precision, or null on failure. */
  async resolve(input: CommuteLocationInput): Promise<GeocodeOutput | null> {
    // If a coordinate is already provided, trust it.
    if (
      input?.geoPoint &&
      Number.isFinite(input.geoPoint.lat) &&
      Number.isFinite(input.geoPoint.lng)
    ) {
      return {
        point: input.geoPoint,
        precision: input.precision ?? 'exact',
      };
    }

    const zip = (input?.zip ?? '').trim();
    const address = (input?.address ?? '').trim();

    if (zip) {
      const point = await this.geocode({ postalcode: zip, country: 'us' });
      if (point) return { point, precision: 'zip' };
    }
    if (address) {
      const point = await this.geocode({ q: address, countrycodes: 'us' });
      if (point) return { point, precision: 'exact' };
    }
    return null;
  }

  private async geocode(
    params: Record<string, string>,
  ): Promise<GeoPoint | null> {
    const query = new URLSearchParams({
      format: 'json',
      limit: '1',
      'accept-language': 'en',
      ...params,
    });
    const url = `${this.base}?${query.toString()}`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SwitcherHub/commute-estimate' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const data = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (!Array.isArray(data) || data.length === 0) return null;
      const lat = Number(data[0].lat);
      const lng = Number(data[0].lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng };
    } catch (err) {
      // Do not log raw address/ZIP (PII). Log only the failure class.
      this.logger.warn(`Geocoding failed (${(err as Error).name}).`);
      return null;
    }
  }
}
