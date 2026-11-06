import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import {
  MatchCard,
  MatchingV2Service,
  PairEvaluation,
} from './matching-v2.service';
import { FeatureFlags } from 'src/app/feature-flags';

/**
 * Verified-matching v2 (spec 002). Flag-gated by MATCHING_V2_ENABLED.
 * `GET /matches/evaluate?a=<resumeId>&b=<resumeId>` runs the hard-rule engine with
 * live OSRM commutes — used to validate the engine against real data before it
 * powers /me/matches (S06/S07).
 */
@Controller('matches')
export class MatchingV2Controller {
  constructor(private readonly matching: MatchingV2Service) {}

  @Get('evaluate')
  async evaluate(
    @Query('a') a: string,
    @Query('b') b: string,
  ): Promise<PairEvaluation> {
    if (!FeatureFlags.matchingV2Enabled) {
      throw new ForbiddenException('MATCHING_V2_ENABLED is off.');
    }
    return this.matching.evaluatePair(a, b);
  }

  /** Candidate matches for a resume (verified + preliminary), ready for S06/S07. */
  @Get('for/:resumeId')
  async forResume(
    @Param('resumeId') resumeId: string,
  ): Promise<MatchCard[]> {
    if (!FeatureFlags.matchingV2Enabled) {
      throw new ForbiddenException('MATCHING_V2_ENABLED is off.');
    }
    return this.matching.findMatchesFor(resumeId);
  }
}
