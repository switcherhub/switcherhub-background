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
