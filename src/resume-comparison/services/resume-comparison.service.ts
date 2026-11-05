import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResumeEntity } from 'src/resume/entities/resume.entity';
import { ResumeComparisonEntity } from '../entities/resume-comparison.entity';
import { SwapRequestEntity } from 'src/swap-request/entities/swap-request.entity';
import { ScoringHelperService } from 'src/configuration/services/scoring-helper.service';
import {
  RoutingMatrixService,
  Coordinate,
} from 'src/routing-matrix/services/routing-matrix.service';
import { COMMUTE_ATOB_MAX_EXCESS_OVER_RESUME_A_SEC } from '../resume-comparison.constants';
import { SwapStatusEnum } from 'src/swap-request/types/swap-status.enum';

@Injectable()
export class ResumeComparisonService {
  constructor(
    @InjectRepository(ResumeEntity)
    private readonly resumeRepository: Repository<ResumeEntity>,
    @InjectRepository(ResumeComparisonEntity)
    private readonly comparisonRepository: Repository<ResumeComparisonEntity>,
    @InjectRepository(SwapRequestEntity)
    private readonly swapRequestRepository: Repository<SwapRequestEntity>,
    private readonly scoringHelperService: ScoringHelperService,
    private readonly routingMatrixService: RoutingMatrixService,
  ) {}

  /**
   * Calculate comparison for a resume with others in radius
   */
  async calculateComparison(
    resumeId: string,
  ): Promise<ResumeComparisonEntity[]> {
    const stepStartTime = Date.now();

    // Step 1: Get main resume
    console.log(`[Step 1/6] Loading main resume ${resumeId}...`);
    const mainResume = await this.resumeRepository.findOne({
      where: { id: resumeId },
      relations: [
        'jobType',
        'jobCore',
        'workEnvironment',
        'locationTenure',
        'sameRoleCount',
        'timeToStartWorking',
        'licenseRequired',
        'shiftType',
      ],
    });

    if (!mainResume) {
      throw new NotFoundException(`Resume with id ${resumeId} not found`);
    }

    if (
      !mainResume.locationHome ||
      !mainResume.locationHome.lat ||
      !mainResume.locationHome.lng
    ) {
      throw new Error('Main resume must have locationHome');
    }

    const homeLat = (mainResume.locationHome as any)?.lat;
    const homeLng = (mainResume.locationHome as any)?.lng;

    if (!homeLat || !homeLng) {
      throw new Error('Main resume must have locationHome with lat and lng');
    }

    if (
      !mainResume.location ||
      (mainResume.location as any)?.lat == null ||
      (mainResume.location as any)?.lng == null
    ) {
      throw new Error('Main resume must have location (work) with lat and lng');
    }

    const workLat = (mainResume.location as any).lat;
    const workLng = (mainResume.location as any).lng;
    const radius =
      this.haversineDistanceKm(homeLat, homeLng, workLat, workLng) * 1.5;

    console.log(
      `[Step 1/6] ✓ Main resume loaded (${Date.now() - stepStartTime}ms)`,
    );
    console.log(
      `   Home: ${homeLat}, ${homeLng} | Work: ${workLat}, ${workLng}`,
    );
    console.log(`   Radius (home→work distance): ${radius.toFixed(2)} km`);
    console.log(`   Job Core: ${mainResume.jobCore?.title || 'N/A'}`);

    // Map: opponent resumeId -> swapRequest (for results that already have a swap — client can navigate and show swap data)
    const swapRequestByOpponentResumeId =
      await this.getSwapRequestByOpponentResumeId(resumeId);

    // Step 2: Get resumes in radius (exclude only this resume)
    const step2Start = Date.now();
    console.log(`[Step 2/6] Finding resumes within ${radius}km radius...`);
    const nearbyResumes = await this.getResumesInRadius(
      homeLat,
      homeLng,
      radius,
      [resumeId],
      mainResume.userId,
    );
    console.log(
      `[Step 2/6] ✓ Found ${nearbyResumes.length} resumes in radius (${Date.now() - step2Start}ms)`,
    );

    // Step 3: Filter by salary and jobCore
    const step3Start = Date.now();
    console.log(
      `[Step 3/6] Filtering by jobCore and salary (10% difference)...`,
    );
    const filteredResumes = this.filterResumes(mainResume, nearbyResumes);
    console.log(
      `[Step 3/6] ✓ ${filteredResumes.length} resumes passed jobCore/salary filter (${Date.now() - step3Start}ms)`,
    );

    // Step 4: Get distance and duration from routing API
    const step4Start = Date.now();
    console.log(
      `[Step 4/6] Getting distance/duration from routing API for ${filteredResumes.length} resumes...`,
    );
    const resumesWithDistance = await this.getDistanceAndDuration(
      mainResume,
      filteredResumes,
    );
    console.log(
      `[Step 4/6] ✓ Distance/duration data retrieved (${Date.now() - step4Start}ms)`,
    );

    // Step 5: Filter by distance and duration
    const step5Start = Date.now();
    console.log(
      `[Step 5/6] Filtering by distance/duration; hide if durationAToB >= resumeA.commuteDurationSeconds + ${COMMUTE_ATOB_MAX_EXCESS_OVER_RESUME_A_SEC}s`,
    );
    const finalResumes = this.filterByDistanceAndDuration(
      mainResume,
      resumesWithDistance,
    );
    console.log(
      `[Step 5/6] ✓ ${finalResumes.length} resumes passed distance/duration filter (${Date.now() - step5Start}ms)`,
    );

    // Limit to first 100 resumes
    const limitedResumes = finalResumes.slice(0, 100);
    if (finalResumes.length > 100) {
      console.log(
        `[Step 5/6] ⚠️  Limited results from ${finalResumes.length} to ${limitedResumes.length} resumes`,
      );
    }

    // Step 6: Calculate scores (without saving)
    const step6Start = Date.now();
    console.log(
      `[Step 6/6] Calculating scores for ${limitedResumes.length} resumes...`,
    );
    const comparisons = await Promise.all(
      limitedResumes.map((resume, index) => {
        if ((index + 1) % 10 === 0) {
          console.log(`   Processing ${index + 1}/${limitedResumes.length}...`);
        }
        return this.calculateComparisonWithoutSave(mainResume, resume);
      }),
    );
    console.log(
      `[Step 6/6] ✓ Calculated ${comparisons.length} comparisons (${Date.now() - step6Start}ms)`,
    );

    // Add swapRequestId and swapRequest to each result when a swap already exists for this pair
    const comparisonsWithSwapId = comparisons
      .map((item) => {
        const swapRequest =
          swapRequestByOpponentResumeId.get(item.resumeBId) ?? null;
        return {
          ...item,
          swapRequestId: swapRequest?.id ?? null,
          swapRequest: swapRequest ?? null,
        };
      })
      .filter((item) => item.swapRequest?.status !== SwapStatusEnum.COMPLETED);

    const totalTime = Date.now() - stepStartTime;
    console.log(`[Summary] Total processing time: ${totalTime}ms`);
    console.log(
      `[Summary] Results: ${comparisonsWithSwapId.length} matches found`,
    );

    return comparisonsWithSwapId;
  }

  /**
   * For a given resume, returns a map: opponent resumeId -> swapRequest entity.
   * Used to add swapRequestId and swapRequest to comparison results so the client can navigate and display swap data.
   */
  private async getSwapRequestByOpponentResumeId(
    resumeId: string,
  ): Promise<Map<string, SwapRequestEntity>> {
    const swaps = await this.swapRequestRepository.find({
      where: [{ resumeAId: resumeId }, { resumeBId: resumeId }],
    });
    const map = new Map<string, SwapRequestEntity>();
    for (const swap of swaps) {
      const opponentId =
        swap.resumeAId === resumeId ? swap.resumeBId : swap.resumeAId;
      map.set(opponentId, swap);
    }
    return map;
  }

  /**
   * Calculate score and comparison for a pair of resumes (for swap-request creation).
   * Returns totalScore and comparison object (scores, distances, durations) to store on the swap request.
   */
  async calculateScoreAndComparisonForSwap(
    resumeAId: string,
    resumeBId: string,
  ): Promise<{
    totalScore: number | null;
    comparison: {
      scores?: Record<string, number | null>;
      distanceAToB?: number | null;
      distanceBToA?: number | null;
      durationAToB?: number | null;
      durationBToA?: number | null;
    } | null;
  }> {
    const relations = [
      'jobType',
      'jobCore',
      'workEnvironment',
      'locationTenure',
      'sameRoleCount',
      'timeToStartWorking',
      'licenseRequired',
      'shiftType',
    ] as const;
    const resumeA = await this.resumeRepository.findOne({
      where: { id: resumeAId },
      relations: [...relations],
    });
    const resumeB = await this.resumeRepository.findOne({
      where: { id: resumeBId },
      relations: [...relations],
    });
    if (!resumeA || !resumeB) {
      throw new NotFoundException('Resume not found');
    }

    let resumeBWithDistance: ResumeEntity & {
      distanceAToB?: number | null;
      distanceBToA?: number | null;
      durationAToB?: number | null;
      durationBToA?: number | null;
    } = resumeB;
    try {
      const withDistance = await this.getDistanceAndDuration(resumeA, [
        resumeB,
      ]);
      if (withDistance.length > 0) {
        resumeBWithDistance = withDistance[0];
      }
    } catch {
      // Continue without commute data; commute scores will be null
    }

    const comparisonEntity = await this.calculateComparisonWithoutSave(
      resumeA,
      resumeBWithDistance,
    );

    const comparison = {
      scores: comparisonEntity.scores ?? undefined,
      distanceAToB: comparisonEntity.distanceAToB ?? null,
      distanceBToA: comparisonEntity.distanceBToA ?? null,
      durationAToB: comparisonEntity.durationAToB ?? null,
      durationBToA: comparisonEntity.durationBToA ?? null,
    };
    return {
      totalScore: comparisonEntity.totalScore ?? null,
      comparison,
    };
  }

  /**
   * Get resumes in radius from locationHome
   */
  /**
   * Haversine distance between two points in km.
   */
  private haversineDistanceKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private async getResumesInRadius(
    lat: number,
    lng: number,
    radius: number,
    excludeResumeIds: string[],
    userId: string,
  ): Promise<ResumeEntity[]> {
    // Use Haversine formula to calculate distance
    // Distance in km: 6371 * ACOS(COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * COS(RADIANS(lng2) - RADIANS(lng1)) + SIN(RADIANS(lat1)) * SIN(RADIANS(lat2)))
    const distanceFormula = `6371 * ACOS(
      COS(RADIANS(:lat)) * 
      COS(RADIANS(CAST(resume."locationHome"->>'lat' AS FLOAT))) * 
      COS(RADIANS(CAST(resume."locationHome"->>'lng' AS FLOAT)) - RADIANS(:lng)) + 
      SIN(RADIANS(:lat)) * 
      SIN(RADIANS(CAST(resume."locationHome"->>'lat' AS FLOAT)))
    )`;

    const query = this.resumeRepository
      .createQueryBuilder('resume')
      .leftJoinAndSelect('resume.jobCore', 'jobCore')
      .leftJoinAndSelect('resume.workEnvironment', 'workEnvironment')
      .leftJoinAndSelect('resume.locationTenure', 'locationTenure')
      .leftJoinAndSelect('resume.sameRoleCount', 'sameRoleCount')
      .leftJoinAndSelect('resume.timeToStartWorking', 'timeToStartWorking')
      .leftJoinAndSelect('resume.licenseRequired', 'licenseRequired')
      .leftJoinAndSelect('resume.shiftType', 'shiftType')
      .andWhere('resume.locationHome IS NOT NULL')
      .andWhere('resume.location IS NOT NULL')
      .andWhere('resume.isHidden = false')
      .andWhere('resume.isApproved = true')
      .andWhere('resume.isActive = true')
      .andWhere('resume.userId != :userId', { userId })
      .andWhere(`(${distanceFormula}) <= :radius`, { lat, lng, radius });

    if (excludeResumeIds.length > 0) {
      query.andWhere('resume.id NOT IN (:...excludeResumeIds)', {
        excludeResumeIds,
      });
    }

    const result = await query.getMany();
    return result;
  }

  /**
   * Do not show the match when durationAToB is at least 10 minutes longer than
   * resumeA.commuteDurationSeconds (i.e. resumeA commute is at least 10 min shorter than durationAToB).
   */
  private shouldHideBecauseDurationAToBExceedsResumeACommuteByTenMinutes(
    resumeACommuteSeconds: number | null | undefined,
    durationAToB: number | null | undefined,
  ): boolean {
    if (resumeACommuteSeconds == null || durationAToB == null) {
      return false;
    }
    const a = Number(resumeACommuteSeconds);
    const aToB = Number(durationAToB);
    if (!Number.isFinite(a) || !Number.isFinite(aToB)) {
      return false;
    }
    return aToB >= a + COMMUTE_ATOB_MAX_EXCESS_OVER_RESUME_A_SEC;
  }

  /**
   * Filter resumes by salary (10% difference) and jobCore
   */
  private filterResumes(
    mainResume: ResumeEntity,
    resumes: ResumeEntity[],
  ): ResumeEntity[] {
    const mainSalary = this.getSalaryValue(mainResume);
    let jobCoreFiltered = 0;
    let salaryFiltered = 0;
    let passed = 0;

    const filtered = resumes.filter((resume) => {
      // Check jobCore match
      if (mainResume.jobCoreId !== resume.jobCoreId) {
        jobCoreFiltered++;
        return false;
      }

      // Check salary difference (10%)
      const resumeSalary = this.getSalaryValue(resume);

      if (mainSalary === null || resumeSalary === null) {
        salaryFiltered++;
        return false;
      }

      const differenceSalary = Math.abs(mainSalary - resumeSalary) / mainSalary;
      if (differenceSalary > 0.1) {
        salaryFiltered++;
        return false;
      }

      passed++;
      return true;
    });

    if (resumes.length > 0) {
      console.log(
        `   Filter details: ${jobCoreFiltered} filtered by jobCore, ${salaryFiltered} filtered by salary, ${passed} passed`,
      );
    }

    return filtered;
  }

  /**
   * Get salary value from resume
   */
  private getSalaryValue(resume: ResumeEntity): number | null {
    if (resume.salaryHourly) {
      return resume.salaryHourly;
    }
    return null;
  }

  /**
   * Get distance and duration from routing matrix service
   */
  private async getDistanceAndDuration(
    mainResume: ResumeEntity,
    resumes: ResumeEntity[],
  ): Promise<
    Array<
      ResumeEntity & {
        distanceAToB?: number | null;
        distanceBToA?: number | null;
        durationAToB?: number | null;
        durationBToA?: number | null;
      }
    >
  > {
    if (resumes.length === 0) {
      return [];
    }

    console.log(`   Processing ${resumes.length} resumes...`);

    // Build coordinates for API request
    const coordinates: Coordinate[] = [];

    // Add main resume locationHome
    const mainHome = mainResume.locationHome as any;
    if (mainHome?.lng && mainHome?.lat) {
      coordinates.push({ lng: mainHome.lng, lat: mainHome.lat });
      console.log(`   Main home location: ${mainHome.lng},${mainHome.lat}`);
    }

    // Add all other resume locations
    resumes.forEach((resume, index) => {
      const location = resume.location as any;
      if (location?.lng && location?.lat) {
        coordinates.push({ lng: location.lng, lat: location.lat });
        if (index < 3) {
          console.log(
            `   Resume ${index + 1} work location: ${location.lng},${location.lat}`,
          );
        }
      }
    });

    if (resumes.length > 3) {
      console.log(`   ... and ${resumes.length - 3} more work locations`);
    }

    console.log(
      `   Total coordinates in request: ${coordinates.length} (1 home + ${resumes.length} work locations)`,
    );

    try {
      // Request 1: From mainResume.locationHome to all resume.location
      // sources=0 means first coordinate is the source
      const apiStart1 = Date.now();
      console.log(
        `   Request 1: Getting distances from main home to ${resumes.length} work locations...`,
      );
      console.log(
        `   Request 1: From ${mainHome.lng},${mainHome.lat} to ${resumes.length} destinations`,
      );

      const requestStart = Date.now();
      const response1Data = await this.routingMatrixService.calculateMatrix(
        {
          sources: [0],
          coordinates,
        },
        'Request 1',
      );
      const requestEnd = Date.now();
      const requestDuration = requestEnd - requestStart;

      const durations1 = response1Data.durations?.[0] || [];
      const distances1 = response1Data.distances?.[0] || [];

      // Log API response structure for Request 1
      console.log(
        `   Request 1: API response keys: ${Object.keys(response1Data).join(', ')}`,
      );
      console.log(
        `   Request 1: durations shape: ${response1Data.durations?.length ?? 0} rows, first row length: ${durations1.length}`,
      );
      console.log(
        `   Request 1: distances shape: ${response1Data.distances?.length ?? 0} rows, first row length: ${distances1.length}`,
      );
      if (durations1.length > 0) {
        console.log(
          `   Request 1: first 3 durations (sec): ${durations1.slice(0, 3).join(', ')}`,
        );
      }
      if (distances1.length > 0) {
        console.log(
          `   Request 1: first 3 distances (m): ${distances1.slice(0, 3).join(', ')}`,
        );
      }

      const totalTime = Date.now() - apiStart1;
      console.log(`   Request 1: ✓ Completed in ${totalTime}ms`);
      console.log(
        `   Request 1: Actual HTTP request took ${requestDuration}ms`,
      );
      console.log(
        `   Request 1: Response size: ${JSON.stringify(response1Data).length} bytes`,
      );

      if (requestDuration > 3000) {
        console.warn(
          `   ⚠️  Request 1: Slow response (>3s) - possible routing server load issue`,
        );
      }
      console.log(
        `   Request 1: Received ${durations1.length} durations, ${distances1.length} distances`,
      );

      // Request 2: From all resume.locationHome to mainResume.location
      // Optimize: Use single batch request instead of multiple individual requests
      const apiStart2 = Date.now();
      const mainLocation = mainResume.location as any;
      console.log(
        `   Request 2: Getting distances from ${resumes.length} resume homes to main work location...`,
      );
      console.log(
        `   Request 2: Main work location: ${mainLocation?.lng},${mainLocation?.lat}`,
      );

      // Build coordinates for batch request: all resume homes + main work location
      const coordinates2: Coordinate[] = [];
      const resumeIndices: number[] = []; // Track which indices have valid locations

      // Add all resume.locationHome coordinates
      resumes.forEach((resume, index) => {
        const home = resume.locationHome as any;
        if (home?.lng && home?.lat && mainLocation?.lng && mainLocation?.lat) {
          coordinates2.push({ lng: home.lng, lat: home.lat });
          resumeIndices.push(index);
        }
      });

      // Add main work location as destination (last coordinate)
      if (mainLocation?.lng && mainLocation?.lat && resumeIndices.length > 0) {
        coordinates2.push({ lng: mainLocation.lng, lat: mainLocation.lat });
        const destinationIndex = coordinates2.length - 1;
        const sourcesIndices = resumeIndices.map((_, i) => i); // [0, 1, 2, 3...]

        console.log(
          `   Request 2: Batch request with ${resumeIndices.length} sources to 1 destination`,
        );

        try {
          const request2Start = Date.now();
          const response2Data = await this.routingMatrixService.calculateMatrix(
            {
              sources: sourcesIndices,
              destinations: [destinationIndex],
              coordinates: coordinates2,
            },
            'Request 2',
          );
          const request2End = Date.now();
          const request2Duration = request2End - request2Start;

          const durations2 = response2Data.durations || [];
          const distances2 = response2Data.distances || [];

          // Log API response structure for Request 2 (batch)
          console.log(
            `   Request 2: API response keys: ${Object.keys(response2Data).join(', ')}`,
          );
          console.log(
            `   Request 2: durations rows: ${durations2.length}, sample row lengths: ${durations2
              .slice(0, 3)
              .map((r: number[]) => r?.length)
              .join(', ')}`,
          );
          console.log(
            `   Request 2: distances rows: ${distances2.length}, sample row lengths: ${distances2
              .slice(0, 3)
              .map((r: number[]) => r?.length)
              .join(', ')}`,
          );
          if (durations2.length > 0 && durations2[0]?.length > 0) {
            console.log(
              `   Request 2: first row first 3 durations (sec): ${durations2[0].slice(0, 3).join(', ')}`,
            );
          }
          if (distances2.length > 0 && distances2[0]?.length > 0) {
            console.log(
              `   Request 2: first row first 3 distances (m): ${distances2[0].slice(0, 3).join(', ')}`,
            );
          }

          const totalTime2 = Date.now() - apiStart2;
          console.log(
            `   Request 2: ✓ Completed batch request in ${totalTime2}ms`,
          );
          console.log(
            `   Request 2: Actual HTTP request took ${request2Duration}ms`,
          );
          console.log(
            `   Request 2: Response size: ${JSON.stringify(response2Data).length} bytes`,
          );

          if (request2Duration > 2000) {
            console.warn(
              `   ⚠️  Request 2: Slow response (>2s) - possible routing server load issue`,
            );
          }

          // Map results back to resumes
          const results = resumes.map((resume, index) => {
            const resumeIdx = resumeIndices.indexOf(index);
            const hasValidLocation = resumeIdx !== -1;

            if (!hasValidLocation) {
              return Object.assign(resume, {
                distanceAToB: distances1[index + 1]
                  ? distances1[index + 1] / 1000
                  : null,
                distanceBToA: null,
                durationAToB: durations1[index + 1] ?? null,
                durationBToA: null,
              }) as ResumeEntity & {
                distanceAToB?: number | null;
                distanceBToA?: number | null;
                durationAToB?: number | null;
                durationBToA?: number | null;
              };
            }

            // Get distance/duration from batch response
            // durations2[resumeIdx][0] = duration from resume.locationHome to mainResume.location
            const distanceBToA =
              distances2[resumeIdx]?.[0] !== undefined
                ? distances2[resumeIdx][0] / 1000
                : null;
            const durationBToA =
              durations2[resumeIdx]?.[0] !== undefined
                ? durations2[resumeIdx][0]
                : null;

            return Object.assign(resume, {
              distanceAToB: distances1[index + 1]
                ? distances1[index + 1] / 1000
                : null,
              distanceBToA: distanceBToA,
              durationAToB: durations1[index + 1] ?? null,
              durationBToA: durationBToA,
            }) as ResumeEntity & {
              distanceAToB?: number | null;
              distanceBToA?: number | null;
              durationAToB?: number | null;
              durationBToA?: number | null;
            };
          });

          return results;
        } catch (error) {
          console.error(
            `   ❌ Error in batch Request 2, falling back to individual requests:`,
            error instanceof Error ? error.message : error,
          );
          // Fallback to individual requests if batch fails
        }
      }

      // Fallback: Individual requests (if batch failed or no valid locations)
      console.log(
        `   Request 2: Falling back to ${resumeIndices.length} individual requests`,
      );
      let request2Count = 0;
      const results = await Promise.all(
        resumes.map(async (resume, index) => {
          const home = resume.locationHome as any;

          if (
            !home?.lng ||
            !home?.lat ||
            !mainLocation?.lng ||
            !mainLocation?.lat
          ) {
            return Object.assign(resume, {
              distanceAToB: distances1[index + 1]
                ? distances1[index + 1] / 1000
                : null,
              distanceBToA: null,
              durationAToB: durations1[index + 1] ?? null,
              durationBToA: null,
            }) as ResumeEntity & {
              distanceAToB?: number | null;
              distanceBToA?: number | null;
              durationAToB?: number | null;
              durationBToA?: number | null;
            };
          }

          request2Count++;

          try {
            const response2Data =
              await this.routingMatrixService.calculateRoute(
                { lng: home.lng, lat: home.lat },
                { lng: mainLocation.lng, lat: mainLocation.lat },
                `Request 2.${request2Count}`,
              );

            // Log single-route API response (sample for first 2 requests)
            if (request2Count <= 2) {
              console.log(
                `   Request 2.${request2Count}: API response keys: ${response2Data ? Object.keys(response2Data).join(', ') : 'null'}`,
              );
              console.log(
                `   Request 2.${request2Count}: response = ${JSON.stringify(response2Data)}`,
              );
            }

            const distanceBToA = response2Data?.distanceKm || null;
            const durationBToA = response2Data?.durationSeconds || null;

            return Object.assign(resume, {
              distanceAToB: distances1[index + 1]
                ? distances1[index + 1] / 1000
                : null,
              distanceBToA: distanceBToA || null,
              durationAToB: durations1[index + 1] ?? null,
              durationBToA: durationBToA || null,
            }) as ResumeEntity & {
              distanceAToB?: number | null;
              distanceBToA?: number | null;
              durationAToB?: number | null;
              durationBToA?: number | null;
            };
          } catch (error) {
            console.error(
              `   ⚠️  Error getting distance for resume ${resume.id}:`,
              error instanceof Error ? error.message : error,
            );
            return Object.assign(resume, {
              distanceAToB: distances1[index + 1]
                ? distances1[index + 1] / 1000
                : null,
              distanceBToA: null,
              durationAToB: durations1[index + 1] ?? null,
              durationBToA: null,
            }) as ResumeEntity & {
              distanceAToB?: number | null;
              distanceBToA?: number | null;
              durationAToB?: number | null;
              durationBToA?: number | null;
            };
          }
        }),
      );
      console.log(
        `   Request 2: ✓ Completed ${request2Count} individual requests in ${Date.now() - apiStart2}ms`,
      );

      return results;
    } catch (error) {
      console.error(
        '   ❌ Error getting distance/duration from routing API:',
        error instanceof Error ? error.message : error,
      );
      return resumes.map(
        (resume) =>
          Object.assign(resume, {
            distanceAToB: null,
            distanceBToA: null,
            durationAToB: null,
            durationBToA: null,
          }) as ResumeEntity & {
            distanceAToB?: number | null;
            distanceBToA?: number | null;
            durationAToB?: number | null;
            durationBToA?: number | null;
          },
      );
    }
  }

  /**
   * Filter by distance/duration vs saved commutes; drop when durationAToB >= resumeA.commute + COMMUTE_ATOB_MAX_EXCESS_OVER_RESUME_A_SEC.
   */
  private filterByDistanceAndDuration(
    mainResume: ResumeEntity,
    resumes: Array<
      ResumeEntity & {
        distanceAToB?: number | null;
        distanceBToA?: number | null;
        durationAToB?: number | null;
        durationBToA?: number | null;
      }
    >,
  ): Array<
    ResumeEntity & {
      distanceAToB?: number | null;
      distanceBToA?: number | null;
      durationAToB?: number | null;
      durationBToA?: number | null;
    }
  > {
    let missingDataFiltered = 0;
    let distanceFiltered = 0;
    let durationFiltered = 0;
    let durationAToBOverResumeACommuteFiltered = 0;
    let passed = 0;

    // Get main resume's saved commute distance and duration
    const mainCommuteDistanceKm = mainResume.commuteDistanceKm;
    const mainCommuteDurationSeconds = mainResume.commuteDurationSeconds;

    const secDbg = (sec: number) =>
      `${Math.round(sec)}s (~${(sec / 60).toFixed(1)}хв)`;
    console.log(
      `[ResumeComparisonService][step5] resumeA id=${mainResume.id}: commuteDurationSeconds=${mainCommuteDurationSeconds == null ? 'null' : secDbg(Number(mainCommuteDurationSeconds))} (поріг для капу: +${COMMUTE_ATOB_MAX_EXCESS_OVER_RESUME_A_SEC}s)`,
    );

    let commuteCapDropLogs = 0;
    const MAX_COMMUTE_CAP_DROP_LOGS = 40;

    const filtered = resumes.filter((resume) => {
      // Check if we have all required distance/duration data (use == null for undefined too)
      if (
        resume.distanceAToB == null ||
        resume.distanceBToA == null ||
        resume.durationAToB == null ||
        resume.durationBToA == null
      ) {
        missingDataFiltered++;
        return false;
      }

      const durA = Number(resume.durationAToB);
      const durB = Number(resume.durationBToA);
      if (
        !Number.isFinite(durA) ||
        !Number.isFinite(durB) ||
        durA < 0 ||
        durB < 0
      ) {
        missingDataFiltered++;
        return false;
      }

      if (mainCommuteDurationSeconds != null) {
        if (
          this.shouldHideBecauseDurationAToBExceedsResumeACommuteByTenMinutes(
            mainCommuteDurationSeconds,
            resume.durationAToB,
          )
        ) {
          if (commuteCapDropLogs < MAX_COMMUTE_CAP_DROP_LOGS) {
            const aNum = Number(mainCommuteDurationSeconds);
            const abNum = Number(resume.durationAToB);
            const thr = aNum + COMMUTE_ATOB_MAX_EXCESS_OVER_RESUME_A_SEC;
            console.log(
              `[ResumeComparisonService][step5] DROP resumeB=${resume.id}: durationAToB=${secDbg(abNum)} >= resumeA.commute ${secDbg(aNum)} + ${COMMUTE_ATOB_MAX_EXCESS_OVER_RESUME_A_SEC}s => поріг ${secDbg(thr)} (ab−A=${secDbg(abNum - aNum)})`,
            );
            commuteCapDropLogs++;
          }
          durationAToBOverResumeACommuteFiltered++;
          return false;
        }
      }

      // Check if distance values are valid (not -1 or negative)
      if (
        resume.distanceAToB < 0 ||
        resume.distanceBToA < 0 ||
        resume.distanceAToB === -1 ||
        resume.distanceBToA === -1
      ) {
        // Log coordinates for debugging
        const mainHome = mainResume.locationHome as any;
        const mainLocation = mainResume.location as any;
        const resumeHome = resume.locationHome as any;
        const resumeLocation = resume.location as any;

        console.error(
          `   ⚠️  Invalid distance detected for resume ${resume.id}:`,
        );
        console.error(
          `      distanceAToB: ${resume.distanceAToB}, distanceBToA: ${resume.distanceBToA}`,
        );
        console.error(
          `      Main resume home: ${mainHome?.lat || 'N/A'}, ${mainHome?.lng || 'N/A'}`,
        );
        console.error(
          `      Main resume work: ${mainLocation?.lat || 'N/A'}, ${mainLocation?.lng || 'N/A'}`,
        );
        console.error(
          `      Around resume home: ${resumeHome?.lat || 'N/A'}, ${resumeHome?.lng || 'N/A'}`,
        );
        console.error(
          `      Around resume work: ${resumeLocation?.lat || 'N/A'}, ${resumeLocation?.lng || 'N/A'}`,
        );

        missingDataFiltered++;
        return false;
      }

      // Check if main resume has saved commute data (use == null so 0 is valid)
      if (mainCommuteDistanceKm == null || mainCommuteDurationSeconds == null) {
        missingDataFiltered++;
        return false;
      }

      // Get around resume's saved commute distance and duration
      const aroundCommuteDistanceKm = resume.commuteDistanceKm;
      const aroundCommuteDurationSeconds = resume.commuteDurationSeconds;

      // Check if around resume has saved commute data
      if (
        aroundCommuteDistanceKm == null ||
        aroundCommuteDurationSeconds == null
      ) {
        missingDataFiltered++;
        return false;
      }

      // Filter by distance:
      // distanceAToB = distance from mainResume.locationHome to aroundResume.location
      // It should not be more than 10% greater than mainResume.commuteDistanceKm
      // distanceAToB <= mainCommuteDistanceKm * 1.1
      const mainDistanceOk = resume.distanceAToB <= mainCommuteDistanceKm * 4;

      // distanceBToA = distance from aroundResume.locationHome to mainResume.location
      // It should not be more than 10% greater than aroundResume.commuteDistanceKm
      // distanceBToA <= aroundCommuteDistanceKm * 1.1
      const aroundDistanceOk =
        resume.distanceBToA <= aroundCommuteDistanceKm * 4;

      if (!mainDistanceOk || !aroundDistanceOk) {
        distanceFiltered++;
        return false;
      }

      // Filter by duration:
      // durationAToB = duration from mainResume.locationHome to aroundResume.location
      // It should not be more than 10% greater than mainResume.commuteDurationSeconds
      // durationAToB <= mainCommuteDurationSeconds * 1.1
      const mainDurationOk =
        resume.durationAToB <= mainCommuteDurationSeconds * 4;

      // durationBToA = duration from aroundResume.locationHome to mainResume.location
      // It should not be more than 10% greater than aroundResume.commuteDurationSeconds
      // durationBToA <= aroundCommuteDurationSeconds * 1.1
      const aroundDurationOk =
        resume.durationBToA <= aroundCommuteDurationSeconds * 4;

      if (!mainDurationOk || !aroundDurationOk) {
        durationFiltered++;
        return false;
      }

      passed++;
      return true;
    });

    if (resumes.length > 0) {
      console.log(
        `   Filter details: ${missingDataFiltered} missing data, ${distanceFiltered} filtered by distance, ${durationFiltered} filtered by duration, ${durationAToBOverResumeACommuteFiltered} filtered (durationAToB >= resumeA commute +${COMMUTE_ATOB_MAX_EXCESS_OVER_RESUME_A_SEC}s), ${passed} passed`,
      );
    }
    if (durationAToBOverResumeACommuteFiltered > MAX_COMMUTE_CAP_DROP_LOGS) {
      console.log(
        `[ResumeComparisonService][step5] commute cap: у логах показано лише перші ${MAX_COMMUTE_CAP_DROP_LOGS} DROP, усього DROP за цим правилом: ${durationAToBOverResumeACommuteFiltered}`,
      );
    }

    return filtered;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Estimate duration from distance (rough estimate: 50 km/h average)
   */
  private estimateDuration(distanceKm: number): number {
    const avgSpeedKmh = 50;
    return (distanceKm / avgSpeedKmh) * 3600; // Convert to seconds
  }

  /**
   * Calculate scores without saving to database (for performance)
   */
  private async calculateComparisonWithoutSave(
    resumeA: ResumeEntity,
    resumeB: ResumeEntity & {
      distanceAToB?: number | null;
      distanceBToA?: number | null;
      durationAToB?: number | null;
      durationBToA?: number | null;
    },
  ): Promise<ResumeComparisonEntity> {
    // Calculate commute scores from duration
    const commuteAScore = resumeB.durationAToB
      ? this.calculateCommuteScore(resumeB.durationAToB)
      : null;
    const commuteBScore = resumeB.durationBToA
      ? this.calculateCommuteScore(resumeB.durationBToA)
      : null;

    // Calculate scores
    const scores = {
      environment: resumeB.workEnvironmentId
        ? await this.scoringHelperService.getScoring(
            'work-environment',
            resumeA.workEnvironmentId,
            resumeB.workEnvironmentId,
          )
        : null,
      tenure: resumeB.locationTenureId
        ? await this.scoringHelperService.getScoring(
            'location-tenure',
            resumeA.locationTenureId,
            resumeB.locationTenureId,
          )
        : null,
      team: resumeB.sameRoleCountId
        ? await this.scoringHelperService.getScoring(
            'same-role-count',
            resumeA.sameRoleCountId,
            resumeB.sameRoleCountId,
          )
        : null,
      training: resumeB.timeToStartWorkingId
        ? await this.scoringHelperService.getScoring(
            'time-to-start-working',
            resumeA.timeToStartWorkingId,
            resumeB.timeToStartWorkingId,
          )
        : null,
      license: resumeB.licenseRequiredId
        ? await this.scoringHelperService.getScoring(
            'license-required',
            resumeA.licenseRequiredId,
            resumeB.licenseRequiredId,
          )
        : null,
      shift: resumeB.shiftTypeId
        ? await this.scoringHelperService.getScoring(
            'shift-type',
            resumeA.shiftTypeId,
            resumeB.shiftTypeId,
          )
        : null,
      salary: this.calculateSalaryScore(resumeA, resumeB),
      jobCore: resumeB.jobCoreId
        ? await this.scoringHelperService.getScoring(
            'job-core',
            resumeA.jobCoreId,
            resumeB.jobCoreId,
          )
        : null,
      jobType: resumeB.jobTypeId
        ? await this.scoringHelperService.getScoring(
            'job-type',
            resumeA.jobTypeId,
            resumeB.jobTypeId,
          )
        : null,
      commuteA: commuteAScore, // Score based on durationAToB (base home to around work)
      commuteB: commuteBScore, // Score based on durationBToA (around home to base work)
    };

    // Calculate total score (weighted average)
    // Score weights (must sum to 100%):
    const scoreWeights: Record<string, number> = {
      jobCore: 0.18, // Job Core: 18%
      environment: 0.12, // Environment: 12%
      tenure: 0.1575, // Tenure: 15.75%
      team: 0.1225, // Team: 12.25%
      training: 0.0525, // Training: 5.25%
      license: 0.0175, // License: 1.75%
      shift: 0.075, // Shift: 7.50%
      salary: 0.0525, // Salary: 5.25%
      jobType: 0.0225, // Job Type: 2.25%
      commuteA: 0.1, // Commute - User A: 10%
      commuteB: 0.1, // Commute - User B: 10%
    };

    let totalWeightedScore = 0;
    let totalWeight = 0;

    // Calculate weighted sum
    for (const [key, weight] of Object.entries(scoreWeights)) {
      const scoreValue = scores[key as keyof typeof scores];
      if (scoreValue !== null && scoreValue !== undefined) {
        totalWeightedScore += scoreValue * weight;
        totalWeight += weight;
      }
    }

    // Calculate total score as weighted average
    const totalScore =
      totalWeight > 0 ? totalWeightedScore / totalWeight : null;

    // Check filters
    const passedSalaryFilter = this.checkSalaryFilter(resumeA, resumeB);
    const passedJobCoreFilter = resumeA.jobCoreId === resumeB.jobCoreId;
    const passedDistanceFilter =
      resumeB.distanceAToB !== null && resumeB.distanceBToA !== null;
    const passedDurationFilter =
      resumeB.durationAToB !== null && resumeB.durationBToA !== null;
    const passedAllFilters =
      passedSalaryFilter &&
      passedJobCoreFilter &&
      passedDistanceFilter &&
      passedDurationFilter;

    // Create comparison object without saving
    if (!resumeB.id) {
      throw new Error('Resume B must have an id');
    }

    const comparison = this.comparisonRepository.create({
      resumeAId: resumeA.id,
      resumeBId: resumeB.id,
      distanceAToB: resumeB.distanceAToB ?? null,
      distanceBToA: resumeB.distanceBToA ?? null,
      durationAToB: resumeB.durationAToB ?? null,
      durationBToA: resumeB.durationBToA ?? null,
      scores,
      totalScore,
      passedSalaryFilter,
      passedJobCoreFilter,
      passedDistanceFilter,
      passedDurationFilter,
      passedAllFilters,
    });

    // Attach resume relations manually (without loading from DB)
    (comparison as any).resumeA = resumeA;
    (comparison as any).resumeB = resumeB;

    return comparison;
  }

  /**
   * Calculate commute score based on duration in seconds
   * Time ranges:
   * ≤10 min (≤600 sec) = 1.0
   * 11-15 min (601-900 sec) = 0.95
   * 16-20 min (901-1200 sec) = 0.90
   * 21-25 min (1201-1500 sec) = 0.85
   * 26-30 min (1501-1800 sec) = 0.78
   * 31-35 min (1801-2100 sec) = 0.72
   * 36-40 min (2101-2400 sec) = 0.68
   * 41-50 min (2401-3000 sec) = 0.55
   * 51-60 min (3001-3600 sec) = 0.45
   * >60 min (>3600 sec) = 0.40
   */
  private calculateCommuteScore(durationSeconds: number): number {
    if (durationSeconds <= 600) {
      // ≤10 min
      return 1.0;
    } else if (durationSeconds <= 900) {
      // 11-15 min
      return 0.95;
    } else if (durationSeconds <= 1200) {
      // 16-20 min
      return 0.9;
    } else if (durationSeconds <= 1500) {
      // 21-25 min
      return 0.85;
    } else if (durationSeconds <= 1800) {
      // 26-30 min
      return 0.78;
    } else if (durationSeconds <= 2100) {
      // 31-35 min
      return 0.72;
    } else if (durationSeconds <= 2400) {
      // 36-40 min
      return 0.68;
    } else if (durationSeconds <= 3000) {
      // 41-50 min
      return 0.55;
    } else if (durationSeconds <= 3600) {
      // 51-60 min
      return 0.45;
    } else {
      // >60 min
      return 0.4;
    }
  }

  /**
   * Calculate salary score (based on 10% difference)
   */
  private calculateSalaryScore(
    resumeA: ResumeEntity,
    resumeB: ResumeEntity,
  ): number {
    const salaryA = this.getSalaryValue(resumeA);
    const salaryB = this.getSalaryValue(resumeB);

    if (salaryA === null || salaryB === null) {
      return null;
    }

    const difference = Math.abs(salaryA - salaryB) / Math.max(salaryA, salaryB);
    // Score: 1.0 if same, decreasing to 0.0 as difference approaches 10%
    return Math.max(0, 1 - difference / 0.1);
  }

  /**
   * Check salary filter (10% difference)
   */
  private checkSalaryFilter(
    resumeA: ResumeEntity,
    resumeB: ResumeEntity,
  ): boolean {
    const salaryA = this.getSalaryValue(resumeA);
    const salaryB = this.getSalaryValue(resumeB);

    if (salaryA === null || salaryB === null) {
      return false;
    }

    const difference = Math.abs(salaryA - salaryB) / Math.max(salaryA, salaryB);
    return difference <= 0.1;
  }
}
