import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResumeEntity } from 'src/resume/entities/resume.entity';
import { RoutingMatrixService } from 'src/routing-matrix/services/routing-matrix.service';
import { Coordinate } from 'src/routing-matrix/types/routing.types';
import { MatchSide, evaluateMatch, minDailySavings } from './matching.logic';

interface Pt {
  lat: number | null;
  lng: number | null;
}

export interface MatchCard {
  matchId: string;
  roleTitle: string;
  approxArea: string;
  commuteNowMin: number | null;
  commuteAfterMin: number | null;
  verified: boolean;
  status: 'verified' | 'preliminary';
  minDailySavingsMin: number | null;
  conditions: { label: string; value: string | null }[];
}

export interface PairEvaluation {
  verified: boolean;
  reasonCodes: string[];
  unknowns: string[];
  minDailySavingsMin: number | null;
  commutes: {
    aCurrent: number | null;
    aProposed: number | null;
    bCurrent: number | null;
    bProposed: number | null;
  };
}

/**
 * Verified matching v2 (spec 002) wired to real OSRM routing.
 * Maps two resumes into MatchSide, computes both commute directions via the
 * routing server, and applies the hard-rule evaluator. Flag-gated at the call site.
 */
@Injectable()
export class MatchingV2Service {
  constructor(
    @InjectRepository(ResumeEntity)
    private readonly resumeRepo: Repository<ResumeEntity>,
    private readonly routing: RoutingMatrixService,
  ) {}

  private coord(p?: Pt | null): Coordinate | null {
    if (p && Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
      return { lat: p.lat as number, lng: p.lng as number };
    }
    return null;
  }

  private async commuteMinutes(
    home: Coordinate | null,
    work: Coordinate | null,
  ): Promise<number | null> {
    if (!home || !work) return null;
    const route = await this.routing.calculateRoute(home, work, 'matching-v2');
    if (!route || route.durationSeconds < 0) return null;
    return Math.round(route.durationSeconds / 60);
  }

  private workplaceKey(work: Coordinate | null): string {
    if (!work) return 'unknown';
    return `${work.lat.toFixed(4)},${work.lng.toFixed(4)}`;
  }

  private requiresLicense(resume: ResumeEntity): boolean {
    const title = (resume.licenseRequired as { title?: string } | null)?.title;
    return !!title && title.toLowerCase() !== 'no';
  }

  private buildSide(
    resume: ResumeEntity,
    currentCommuteMin: number | null,
    proposedCommuteMin: number | null,
    workCoord: Coordinate | null,
  ): MatchSide {
    const shift =
      (resume.shiftType as { title?: string } | null)?.title?.toLowerCase() ??
      null;
    const jobType =
      (resume.jobType as { title?: string } | null)?.title?.toLowerCase() ??
      null;
    // Worker is assumed to hold what their own current job required.
    const ownRequired = this.requiresLicense(resume) ? ['license'] : [];

    return {
      userId: resume.userId,
      roleKey: resume.roleKey ?? resume.jobCoreId ?? null,
      // Minimum acceptable conditions (null until S05 collects them).
      minRate: resume.minRate ?? null,
      minHours: resume.minHours ?? null,
      minSavingsMin: 10,
      availabilityShifts:
        resume.availabilityShifts && resume.availabilityShifts.length > 0
          ? resume.availabilityShifts.map((s) => s.toLowerCase())
          : null,
      skills: ownRequired,
      jobType,
      allowJobTypeChange: resume.allowJobTypeChange ?? false,
      // This worker's current workplace (destination for the OTHER worker).
      workplaceId: this.workplaceKey(workCoord),
      offeredRate: resume.salaryHourly ?? null,
      weeklyHours:
        resume.hoursPerMonth != null ? resume.hoursPerMonth / 4.33 : null,
      shift,
      requiredSkills: this.requiresLicense(resume) ? ['license'] : [],
      currentCommuteMin,
      proposedCommuteMin,
    };
  }

  /**
   * Find candidate matches for a resume (spec §6.1 discovery). Same role, other
   * users; each candidate is evaluated via the hard-rule engine + live routing.
   * Returns verified and preliminary cards; clear hard failures are excluded.
   * Bounded to `limit` candidates to cap routing calls.
   */
  async findMatchesFor(subjectId: string, limit = 10): Promise<MatchCard[]> {
    const relations = ['jobType', 'shiftType', 'licenseRequired', 'jobCore'];
    const subject = await this.resumeRepo.findOne({
      where: { id: subjectId },
      relations,
    });
    if (!subject) throw new NotFoundException('Resume not found.');

    const roleKey = subject.roleKey ?? subject.jobCoreId ?? null;
    if (!roleKey) return [];

    // Candidates: same role, different user, visible. (Geo pre-filter omitted here;
    // the routing + hard-rule savings check already excludes far/un-saving pairs.)
    const all = await this.resumeRepo.find({
      where: subject.roleKey
        ? { roleKey: subject.roleKey, isHidden: false }
        : { jobCoreId: subject.jobCoreId, isHidden: false },
      relations,
      take: 100,
    });
    const candidates = all
      .filter((r) => r.id !== subject.id && r.userId !== subject.userId)
      .slice(0, limit);

    const cards: MatchCard[] = [];
    for (const cand of candidates) {
      const evaln = await this.evaluatePair(subject.id, cand.id);
      // Exclude clear hard failures (role/same-workplace/no-savings). Keep verified
      // and preliminary (unknowns) where the subject actually saves commute.
      const hardFail = evaln.reasonCodes.some((c) =>
        [
          'role_incompatible',
          'same_workplace',
          'a.no_commute_savings',
          'b.no_commute_savings',
        ].includes(c),
      );
      if (hardFail) continue;
      const subjSavings =
        evaln.commutes.aCurrent != null && evaln.commutes.aProposed != null
          ? evaln.commutes.aCurrent - evaln.commutes.aProposed
          : null;
      if (subjSavings == null || subjSavings <= 0) continue;

      cards.push(this.toCard(subject, cand, evaln));
    }

    // Verified first, then by larger min daily savings.
    cards.sort((x, y) => {
      if (x.verified !== y.verified) return x.verified ? -1 : 1;
      return (y.minDailySavingsMin ?? 0) - (x.minDailySavingsMin ?? 0);
    });
    return cards;
  }

  private toCard(
    subject: ResumeEntity,
    cand: ResumeEntity,
    evaln: PairEvaluation,
  ): MatchCard {
    const candLoc = cand.location as { area?: string; city?: string; zipCode?: string } | null;
    const approxArea =
      cand.locationArea ||
      cand.locationCity ||
      candLoc?.area ||
      candLoc?.city ||
      candLoc?.zipCode ||
      'Nearby area';
    const roleTitle =
      (cand.jobCore as { title?: string } | null)?.title ?? cand.roleKey ?? 'Role';
    const u = evaln.unknowns;
    const has = (k: string) => !u.includes(k);
    const conditions = [
      { label: 'Pay', value: has('a.pay') ? 'Meets your minimum' : null },
      {
        label: 'Job type',
        value: has('a.job_type')
          ? (cand.jobType as { title?: string } | null)?.title ?? null
          : null,
      },
      {
        label: 'Shift',
        value: has('a.shift')
          ? (cand.shiftType as { title?: string } | null)?.title ?? null
          : null,
      },
      { label: 'Hours per week', value: has('a.hours') ? 'Meets your minimum' : null },
    ];
    return {
      matchId: cand.id,
      roleTitle,
      approxArea,
      commuteNowMin: evaln.commutes.aCurrent,
      commuteAfterMin: evaln.commutes.aProposed,
      verified: evaln.verified,
      status: evaln.verified ? 'verified' : 'preliminary',
      minDailySavingsMin: evaln.minDailySavingsMin,
      conditions,
    };
  }

  async evaluatePair(aId: string, bId: string): Promise<PairEvaluation> {
    const relations = ['jobType', 'shiftType', 'licenseRequired'];
    const a = await this.resumeRepo.findOne({ where: { id: aId }, relations });
    const b = await this.resumeRepo.findOne({ where: { id: bId }, relations });
    if (!a || !b) throw new NotFoundException('Resume not found.');

    const aWork = this.coord(a.location as Pt | null);
    const aHome = this.coord(a.locationHome as Pt | null);
    const bWork = this.coord(b.location as Pt | null);
    const bHome = this.coord(b.locationHome as Pt | null);

    // Commutes via real OSRM routing.
    const aCurrent = await this.commuteMinutes(aHome, aWork);
    const aProposed = await this.commuteMinutes(aHome, bWork); // A moves to B's work
    const bCurrent = await this.commuteMinutes(bHome, bWork);
    const bProposed = await this.commuteMinutes(bHome, aWork); // B moves to A's work

    const sideA = this.buildSide(a, aCurrent, aProposed, aWork);
    const sideB = this.buildSide(b, bCurrent, bProposed, bWork);

    const result = evaluateMatch(sideA, sideB);
    return {
      verified: result.verified,
      reasonCodes: result.reasonCodes,
      unknowns: result.unknowns,
      minDailySavingsMin: minDailySavings(sideA, sideB),
      commutes: { aCurrent, aProposed, bCurrent, bProposed },
    };
  }
}
