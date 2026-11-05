import { Body, Controller, Post } from '@nestjs/common';
import { RoutingMatrixService } from 'src/routing-matrix/services/routing-matrix.service';
import { GeocodingService } from '../services/geocoding.service';
import {
  CommuteEstimateDto,
  CommuteEstimateError,
  CommuteEstimateResult,
} from '../dto/commute-estimate.dto';

/**
 * Pre-auth commute estimate (spec §4 S01/S02, FR-001, AC01/05/06).
 * No authentication required — value before account. Returns an explicit error
 * object (never "no swaps") so the client can offer a manual estimate fallback.
 */
@Controller('commute')
export class CommuteController {
  constructor(
    private readonly geocoding: GeocodingService,
    private readonly routing: RoutingMatrixService,
  ) {}

  @Post('estimate')
  async estimate(
    @Body() dto: CommuteEstimateDto,
  ): Promise<CommuteEstimateResult | CommuteEstimateError> {
    const transport = dto?.transport ?? 'car';

    const home = await this.geocoding.resolve(dto?.homeArea ?? {});
    const work = await this.geocoding.resolve(dto?.workLocation ?? {});
    if (!home || !work) {
      return { error: 'geocode_failed' };
    }

    const route = await this.routing.calculateRoute(
      home.point,
      work.point,
      'commute-estimate',
    );
    if (!route || route.durationSeconds < 0) {
      return { error: 'no_route' };
    }

    // ZIP-only on either side caps precision at "zip" (no exact address shown).
    const precision =
      home.precision === 'zip' || work.precision === 'zip' ? 'zip' : 'exact';

    return {
      minutesOneWay: Math.max(1, Math.round(route.durationSeconds / 60)),
      source: 'routed',
      precision,
      transport,
      provider: process.env.ROUTING_PROVIDER ?? 'osrm',
      calculatedAt: new Date().toISOString(),
    };
  }
}
