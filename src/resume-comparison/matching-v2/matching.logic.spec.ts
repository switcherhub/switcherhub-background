import { MatchSide, evaluateMatch, minDailySavings } from './matching.logic';

function side(over: Partial<MatchSide>): MatchSide {
  return {
    userId: 'u',
    roleKey: 'cashier',
    minRate: 15,
    minHours: 30,
    minSavingsMin: 10,
    availabilityShifts: ['day'],
    skills: [],
    jobType: 'full-time',
    allowJobTypeChange: false,
    workplaceId: 'wp',
    offeredRate: 15,
    weeklyHours: 40,
    shift: 'day',
    requiredSkills: [],
    currentCommuteMin: 29,
    proposedCommuteMin: 8,
    ...over,
  };
}

/** Two fully-compatible, swappable sides. */
function compatiblePair(): [MatchSide, MatchSide] {
  return [
    side({ userId: 'A', workplaceId: 'wpA' }),
    side({ userId: 'B', workplaceId: 'wpB' }),
  ];
}

describe('verified matching — hard rules', () => {
  it('fully compatible pair → verified', () => {
    const [a, b] = compatiblePair();
    const r = evaluateMatch(a, b);
    expect(r.verified).toBe(true);
    expect(r.reasonCodes).toEqual([]);
    expect(r.unknowns).toEqual([]);
  });

  it('AC17: same category, different incompatible roles → not verified', () => {
    const [a, b] = compatiblePair();
    b.roleKey = 'retail_sales_associate'; // different role, no equivalence
    const r = evaluateMatch(a, b);
    expect(r.verified).toBe(false);
    expect(r.reasonCodes).toContain('role_incompatible');
  });

  it('allowed role equivalence → verified', () => {
    const [a, b] = compatiblePair();
    b.roleKey = 'retail_sales_associate';
    const r = evaluateMatch(a, b, {
      allowedRoleEquivalences: [['cashier', 'retail_sales_associate']],
    });
    expect(r.verified).toBe(true);
  });

  it('AC18: one saves time, the other loses → fails', () => {
    const [a, b] = compatiblePair();
    b.proposedCommuteMin = 40; // B's new commute longer than current (29)
    const r = evaluateMatch(a, b);
    expect(r.verified).toBe(false);
    expect(r.reasonCodes).toContain('b.no_commute_savings');
  });

  it('AC19: destination pay below minimum → blocked regardless of %', () => {
    const [a, b] = compatiblePair();
    b.offeredRate = 14; // A requires 15 → A moving into B fails (only 6.7% gap)
    const r = evaluateMatch(a, b);
    expect(r.verified).toBe(false);
    expect(r.reasonCodes).toContain('a.pay_below_min');
  });

  it('AC20: shift not within availability → fails', () => {
    const [a, b] = compatiblePair();
    b.shift = 'overnight'; // A available only ['day']
    const r = evaluateMatch(a, b);
    expect(r.verified).toBe(false);
    expect(r.reasonCodes).toContain('a.shift_not_available');
  });

  it('same workplace cannot be swapped with itself', () => {
    const [a, b] = compatiblePair();
    b.workplaceId = a.workplaceId;
    const r = evaluateMatch(a, b);
    expect(r.verified).toBe(false);
    expect(r.reasonCodes).toContain('same_workplace');
  });

  it('missing required skill → fails (unknown ≠ satisfied)', () => {
    const [a, b] = compatiblePair();
    b.requiredSkills = ['forklift_license']; // A lacks it
    const r = evaluateMatch(a, b);
    expect(r.verified).toBe(false);
    expect(r.reasonCodes).toContain('a.missing_skills');
  });

  it('unknown hard field → not verified, listed in unknowns', () => {
    const [a, b] = compatiblePair();
    a.minRate = null; // unknown minimum pay
    const r = evaluateMatch(a, b);
    expect(r.verified).toBe(false);
    expect(r.unknowns).toContain('a.pay');
    expect(r.reasonCodes).toEqual([]); // unknown is not a hard violation, just blocks verification
  });

  it('job-type change blocked unless explicitly allowed', () => {
    const [a, b] = compatiblePair();
    b.jobType = 'part-time';
    expect(evaluateMatch(a, b).verified).toBe(false);
    a.allowJobTypeChange = true;
    b.allowJobTypeChange = true;
    expect(evaluateMatch(a, b).verified).toBe(true);
  });

  it('minDailySavings returns the smaller of the two savings', () => {
    const [a, b] = compatiblePair(); // A: 29-8=21, B: 29-8=21
    expect(minDailySavings(a, b)).toBe(21);
    b.proposedCommuteMin = 20; // B savings 9
    expect(minDailySavings(a, b)).toBe(9);
  });
});
