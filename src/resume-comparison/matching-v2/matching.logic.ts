/**
 * Pure hard-rule matching decision (spec 002 §6, constitution Principle V).
 * Free of DB/Nest so the correctness-critical rules are unit-testable.
 *
 * Model: workers A and B swap. A moves INTO B's workplace and vice-versa.
 * A "verified" proposal requires EVERY hard rule to pass for BOTH directions,
 * with no unknown hard fields. Unknown is never treated as pass. No numeric score.
 */

export interface MatchSide {
  userId: string;
  roleKey: string | null;

  // The moving worker's own constraints:
  minRate: number | null; // minimum acceptable pay (USD/hour)
  minHours: number | null; // minimum acceptable weekly hours
  minSavingsMin: number; // minimum daily commute savings (default 10)
  availabilityShifts: string[] | null; // shifts this worker can do; null = unknown
  skills: string[]; // skills/licenses this worker has
  jobType: string | null; // 'full-time' | 'part-time' | ...
  allowJobTypeChange: boolean; // explicit opt-in to change full/part time

  // This worker's CURRENT workplace (the one the OTHER worker would move into):
  workplaceId: string;
  offeredRate: number | null; // guaranteed pay at this workplace
  weeklyHours: number | null; // weekly hours at this workplace
  shift: string | null; // actual shift at this workplace
  requiredSkills: string[]; // required at this workplace

  // This worker's commute (home → own work now; home → other's work after):
  currentCommuteMin: number | null;
  proposedCommuteMin: number | null;
}

export interface MatchResult {
  verified: boolean;
  reasonCodes: string[]; // why it failed (hard-rule violations)
  unknowns: string[]; // missing data that blocked verification
}

/** Role compatibility: same role_id or an explicitly allowed directed equivalence. */
function rolesCompatible(
  a: string | null,
  b: string | null,
  allowedEquivalences: ReadonlyArray<readonly [string, string]>,
): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  return allowedEquivalences.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );
}

/** Evaluate one direction: `mover` moves into `dest`'s workplace. Mutates acc. */
function checkDirection(
  tag: string,
  mover: MatchSide,
  dest: MatchSide,
  reasonCodes: string[],
  unknowns: string[],
): void {
  // Pay: destination guaranteed pay >= mover minimum. (No percentage rule.)
  if (mover.minRate == null || dest.offeredRate == null) {
    unknowns.push(`${tag}.pay`);
  } else if (dest.offeredRate < mover.minRate) {
    reasonCodes.push(`${tag}.pay_below_min`);
  }

  // Hours: destination weekly hours >= mover minimum.
  if (mover.minHours == null || dest.weeklyHours == null) {
    unknowns.push(`${tag}.hours`);
  } else if (dest.weeklyHours < mover.minHours) {
    reasonCodes.push(`${tag}.hours_below_min`);
  }

  // Shift: destination shift within mover availability.
  if (dest.shift == null || mover.availabilityShifts == null) {
    unknowns.push(`${tag}.shift`);
  } else if (!mover.availabilityShifts.includes(dest.shift)) {
    reasonCodes.push(`${tag}.shift_not_available`);
  }

  // Skills: mover satisfies destination required skills. Unknown ≠ satisfied.
  const missingSkills = dest.requiredSkills.filter(
    (s) => !mover.skills.includes(s),
  );
  if (missingSkills.length > 0) {
    reasonCodes.push(`${tag}.missing_skills`);
  }

  // Commute savings: strictly positive and >= minimum, for the mover.
  if (mover.currentCommuteMin == null || mover.proposedCommuteMin == null) {
    unknowns.push(`${tag}.commute`);
  } else {
    const savings = mover.currentCommuteMin - mover.proposedCommuteMin;
    const minReq = Math.max(mover.minSavingsMin, 1);
    if (savings <= 0) reasonCodes.push(`${tag}.no_commute_savings`);
    else if (savings < minReq) reasonCodes.push(`${tag}.commute_below_min`);
  }

  // Job type: same by default; change only if the mover explicitly allowed it.
  if (mover.jobType == null || dest.jobType == null) {
    unknowns.push(`${tag}.job_type`);
  } else if (mover.jobType !== dest.jobType && !mover.allowJobTypeChange) {
    reasonCodes.push(`${tag}.job_type_mismatch`);
  }
}

export function evaluateMatch(
  a: MatchSide,
  b: MatchSide,
  options?: {
    allowedRoleEquivalences?: ReadonlyArray<readonly [string, string]>;
  },
): MatchResult {
  const reasonCodes: string[] = [];
  const unknowns: string[] = [];
  const equiv = options?.allowedRoleEquivalences ?? [];

  // Role compatibility (both sides).
  if (a.roleKey == null || b.roleKey == null) {
    unknowns.push('role');
  } else if (!rolesCompatible(a.roleKey, b.roleKey, equiv)) {
    reasonCodes.push('role_incompatible');
  }

  // Never swap the same workplace with itself.
  if (a.workplaceId && a.workplaceId === b.workplaceId) {
    reasonCodes.push('same_workplace');
  }

  // A moves into B's workplace; B moves into A's workplace.
  checkDirection('a', a, b, reasonCodes, unknowns);
  checkDirection('b', b, a, reasonCodes, unknowns);

  const verified = reasonCodes.length === 0 && unknowns.length === 0;
  return { verified, reasonCodes, unknowns };
}

/** Smaller of the two daily commute savings — the primary ranking key (spec §6.3). */
export function minDailySavings(a: MatchSide, b: MatchSide): number | null {
  if (
    a.currentCommuteMin == null ||
    a.proposedCommuteMin == null ||
    b.currentCommuteMin == null ||
    b.proposedCommuteMin == null
  ) {
    return null;
  }
  const sa = a.currentCommuteMin - a.proposedCommuteMin;
  const sb = b.currentCommuteMin - b.proposedCommuteMin;
  return Math.min(sa, sb);
}
