import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  MatchCard,
  MatchingV2Service,
  PairEvaluation,
} from './matching-v2.service';
import { FeatureFlags } from 'src/app/feature-flags';
import { JwtUserAuthGuard } from 'src/user-auth/guards/jwt-user-auth.guard';
import { GetUser } from 'src/user-auth/decorators/get-user.decorator';
import { UserEntity } from 'src/users/entities/user.entity';

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

  /** Matches for the authenticated user (powers S06/S07 in the app): GET /matches/mine */
  @Get('mine')
  @UseGuards(JwtUserAuthGuard)
  async myMatches(@GetUser() user: UserEntity): Promise<MatchCard[]> {
    if (!FeatureFlags.matchingV2Enabled) {
      throw new ForbiddenException('MATCHING_V2_ENABLED is off.');
    }
    return this.matching.findMatchesForUser(user.id);
  }

  /** "I'm interested": create/reuse a swap with a candidate (S07→S08). */
  @Post(':candidateResumeId/propose')
  @UseGuards(JwtUserAuthGuard)
  async propose(
    @Param('candidateResumeId') candidateResumeId: string,
    @GetUser() user: UserEntity,
  ): Promise<{ swapId: string; proposalVersion: number }> {
    if (!FeatureFlags.matchingV2Enabled) {
      throw new ForbiddenException('MATCHING_V2_ENABLED is off.');
    }
    return this.matching.proposeSwap(user.id, candidateResumeId);
  }
}
