import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ResumeComparisonService } from '../services/resume-comparison.service';
import { ResumeComparisonEntity } from '../entities/resume-comparison.entity';
import { JwtUserAuthGuard } from 'src/user-auth/guards/jwt-user-auth.guard';
import { FilterResponseInterface } from 'src/utils/filter-response.interface';
import { COMMUTE_ATOB_MAX_EXCESS_OVER_RESUME_A_SEC } from '../resume-comparison.constants';

@Controller('resume-comparison')
export class ResumeComparisonController {
  constructor(private readonly comparisonService: ResumeComparisonService) {}

  @Get(':resumeId/calculate')
  @UseGuards(JwtUserAuthGuard)
  async calculateComparison(
    @Param('resumeId') resumeId: string,
    @Query() query: any,
  ): Promise<FilterResponseInterface<ResumeComparisonEntity>> {
    const rawSortField =
      typeof query.sortBy === 'string'
        ? query.sortBy
        : typeof query.orderBy === 'string'
          ? query.orderBy
          : undefined;
    const sortByParam =
      rawSortField === 'score'
        ? 'totalScore'
        : rawSortField === 'createdAt'
          ? 'resumeB.createdAt'
          : rawSortField === 'salaryHourly'
            ? 'resumeB.salaryHourly'
            : rawSortField;

    const startTime = Date.now();
    console.log(
      `\n[Resume Comparison] Starting comparison for resume ${resumeId} `,
    );

    const result = await this.comparisonService.calculateComparison(resumeId);

    /** Поріг див. COMMUTE_ATOB_MAX_EXCESS_OVER_RESUME_A_SEC у resume-comparison.constants.ts */
    const maxExcessSec = COMMUTE_ATOB_MAX_EXCESS_OVER_RESUME_A_SEC;
    const secLabel = (sec: number) =>
      `${Math.round(sec)}s (~${(sec / 60).toFixed(1)} хв)`;

    console.log(
      `\n[ResumeComparison][durationAToB vs resumeA.commute] resumeId=${resumeId}`,
    );
    console.log(
      `[ResumeComparison][durationAToB cap] Формула: ЗАЛИШАЄМО рядок тільки якщо durationAToB < (resumeA.commuteDurationSeconds + ${maxExcessSec}s).`,
    );
    console.log(
      `[ResumeComparison][durationAToB cap] durationAToB = час із дому A до роботи B (маршрут). resumeA.commuteDurationSeconds = збережений час дім A → робота A.`,
    );
    console.log(
      `[ResumeComparison][durationAToB cap] ВИКИДАЄМО, якщо durationAToB >= resumeA.commute + ${maxExcessSec}s.`,
    );

    const resultFiltered: ResumeComparisonEntity[] = [];
    let dropped = 0;
    let keptOk = 0;
    let keptWithoutNumbers = 0;
    const MAX_DROP_LOG = 50;
    const MAX_KEEP_LOG = 20;

    for (const item of result) {
      const bId = item.resumeBId;
      const a = item.resumeA?.commuteDurationSeconds;
      const ab = item.durationAToB;

      if (a == null || ab == null) {
        keptWithoutNumbers++;
        resultFiltered.push(item);
        if (keptWithoutNumbers <= 8) {
          console.log(
            `[ResumeComparison][durationAToB cap] resumeB=${bId}: немає resumeA.commute (${a}) або durationAToB (${ab}) — кап НЕ застосовуємо, рядок лишається`,
          );
        }
        continue;
      }

      const aSec = Number(a);
      const abSec = Number(ab);
      if (!Number.isFinite(aSec) || !Number.isFinite(abSec)) {
        keptWithoutNumbers++;
        resultFiltered.push(item);
        if (keptWithoutNumbers <= 8) {
          console.log(
            `[ResumeComparison][durationAToB cap] resumeB=${bId}: не числа (resumeA.commute=${a}, durationAToB=${ab}) — кап не застосовуємо`,
          );
        }
        continue;
      }

      const thresholdSec = aSec + maxExcessSec;
      const deltaSec = abSec - aSec;

      if (abSec >= thresholdSec) {
        dropped++;
        if (dropped <= MAX_DROP_LOG) {
          console.log(
            `[ResumeComparison][durationAToB cap] DROP resumeB=${bId}: durationAToB=${secLabel(abSec)} >= поріг ${secLabel(thresholdSec)} (= resumeA.commute ${secLabel(aSec)} + ${maxExcessSec}s). durationAToB − resumeA.commute = ${secLabel(deltaSec)}`,
          );
        }
      } else {
        keptOk++;
        resultFiltered.push(item);
        if (keptOk <= MAX_KEEP_LOG) {
          console.log(
            `[ResumeComparison][durationAToB cap] KEEP resumeB=${bId}: durationAToB=${secLabel(abSec)} < поріг ${secLabel(thresholdSec)} (= ${secLabel(aSec)} + ${maxExcessSec}s). durationAToB − resumeA.commute = ${secLabel(deltaSec)}`,
          );
        }
      }
    }

    console.log(
      `[ResumeComparison][durationAToB cap] Підсумок: з сервісу ${result.length} рядків → після капу ${resultFiltered.length} (KEEP за числом: ${keptOk}, без повних чисел: ${keptWithoutNumbers}), DROP: ${dropped}`,
    );
    if (dropped > MAX_DROP_LOG) {
      console.log(
        `[ResumeComparison][durationAToB cap] (лог показано лише перші ${MAX_DROP_LOG} DROP)`,
      );
    }
    if (keptOk > MAX_KEEP_LOG) {
      console.log(
        `[ResumeComparison][durationAToB cap] (лог показано лише перші ${MAX_KEEP_LOG} KEEP)`,
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `[Resume Comparison] Completed in ${duration}ms. Found ${resultFiltered.length} matches (after durationAToB cap)\n`,
    );

    // Add whatYouSave field to each result
    // whatYouSave = difference in commute time (your time - opponent's time) * 44 (22 working days * 2 directions)
    const resultWithWhatYouSave = resultFiltered.map((item) => {
      const yourCurrentCommute = item.resumeA.commuteDurationSeconds;
      const yourNewCommute = item.durationAToB;

      const opponentCurrentCommute = item.resumeB.commuteDurationSeconds;
      const opponentNewCommute = item.durationBToA;

      const yourTimeDifference = yourCurrentCommute - yourNewCommute;
      const opponentTimeDifference =
        opponentCurrentCommute - opponentNewCommute;

      const whatYouSave = yourTimeDifference * 44;
      const whatOpponentSaves = opponentTimeDifference * 44;

      return {
        ...item,
        whatYouSave,
        whatOpponentSaves,
      };
    });

    // Parse filters from query manually
    // Handle both array format (filterBy[]) and string format (filterBy); split comma-separated strings
    const filterBy = Array.isArray(query.filterBy)
      ? query.filterBy
      : typeof query.filterBy === 'string'
        ? query.filterBy
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [];
    const filterType = Array.isArray(query.filterType)
      ? query.filterType
      : typeof query.filterType === 'string'
        ? query.filterType
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [];
    const filterValue = Array.isArray(query.filterValue)
      ? query.filterValue
      : query.filterValue !== undefined && query.filterValue !== null
        ? String(query.filterValue)
            .split(',')
            .map((s: string) => s.trim())
        : [];

    // Helper: get nested property by path (e.g. "resumeB.jobTypeId" or "jobTypeId" → resumeB.jobTypeId)
    const getByPath = (obj: any, path: string): unknown => {
      if (!path || !obj) return undefined;
      const value = path.split('.').reduce((acc: any, key) => acc?.[key], obj);
      // Allow short names: jobTypeId, shiftTypeId → look up on resumeB (the "other" resume in comparison)
      if (value === undefined && path.indexOf('.') === -1 && obj?.resumeB) {
        return (obj.resumeB as any)[path];
      }
      return value;
    };

    // Apply filters manually
    let filteredResult = [...resultWithWhatYouSave];

    // Allowed sort fields: totalScore, resumeB.salaryHourly, resumeB.createdAt
    const SORT_FIELDS = [
      'totalScore',
      'resumeB.salaryHourly',
      'resumeB.createdAt',
    ] as const;
    const sortBy =
      typeof sortByParam === 'string' &&
      SORT_FIELDS.includes(sortByParam as any)
        ? sortByParam
        : undefined;
    const rawSortOrder = query.sortOrder ?? query.orderType;
    const sortOrder =
      typeof rawSortOrder === 'string' && rawSortOrder.toLowerCase() === 'asc'
        ? 'asc'
        : 'desc';

    if (filterBy.length > 0) {
      filteredResult = filteredResult.filter((item) => {
        return filterBy.every((field: string, index: number) => {
          const type = filterType[index] || 'eq';
          const value = filterValue[index];
          if (value === undefined || value === null || value === '') {
            return true;
          }
          const itemValue = getByPath(item, field);
          // For date fields (e.g. resumeB.createdAt), compare as timestamps
          const isDateField = field.toLowerCase().endsWith('createdat');
          const toCompare = (v: unknown) =>
            isDateField && v != null
              ? new Date(v as string | Date).getTime()
              : Number(v);
          switch (type) {
            case 'eq':
              return itemValue === value || itemValue === String(value);
            case 'not':
              return itemValue !== value && itemValue !== String(value);
            case 'in':
              const inValues = Array.isArray(value) ? value : [value];
              return (
                inValues.includes(itemValue) ||
                inValues.includes(String(itemValue))
              );
            case 'arr':
              // value is pipe-separated list of allowed IDs (OR within same field)
              const arrValues = String(value)
                .split('|')
                .map((s) => s.trim())
                .filter(Boolean);
              const strItem = itemValue != null ? String(itemValue) : '';
              return arrValues.length === 0 || arrValues.includes(strItem);
            case 'like':
              const searchStr = String(value).toLowerCase();
              return String(itemValue ?? '')
                .toLowerCase()
                .includes(searchStr);
            case 'ge':
              return toCompare(itemValue) >= toCompare(value);
            case 'le':
              return toCompare(itemValue) <= toCompare(value);
            case 'gt':
              return toCompare(itemValue) > toCompare(value);
            case 'lt':
              return toCompare(itemValue) < toCompare(value);
            default:
              return true;
          }
        });
      });
    }

    // Apply sorting (both directions): totalScore, resumeB.salaryHourly, resumeB.createdAt
    if (sortBy) {
      filteredResult = filteredResult.sort((a: any, b: any) => {
        const valA = getByPath(a, sortBy);
        const valB = getByPath(b, sortBy);
        const isNullA = valA == null;
        const isNullB = valB == null;
        if (isNullA && isNullB) return 0;
        if (isNullA) return sortOrder === 'asc' ? 1 : 1;
        if (isNullB) return sortOrder === 'asc' ? -1 : -1;
        const isDate =
          sortBy === 'resumeB.createdAt' ||
          valA instanceof Date ||
          valB instanceof Date;
        const numA = isDate
          ? new Date(valA as string | Date).getTime()
          : Number(valA);
        const numB = isDate
          ? new Date(valB as string | Date).getTime()
          : Number(valB);
        if (sortOrder === 'asc') {
          if (numA < numB) return -1;
          if (numA > numB) return 1;
          return 0;
        }
        if (numA > numB) return -1;
        if (numA < numB) return 1;
        return 0;
      });
    }

    // Mock pagination - wrap filtered results in pagination structure
    const page = query.page ? Number(query.page) : 1;
    const perPage = query.per_page
      ? Number(query.per_page)
      : Number(process.env.DEFAULT_PAGE_SIZE) || filteredResult.length || 10;
    const total = filteredResult.length;
    const pageCount = Math.ceil(total / perPage);

    // Apply pagination
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedData = filteredResult.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      total,
      page,
      perPage,
      pageCount,
    };
  }
}
