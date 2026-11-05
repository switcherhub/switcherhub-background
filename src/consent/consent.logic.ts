/**
 * Pure decision logic for two-sided, version-bound consent (spec §8.2, FR-015).
 * Kept free of DB/Nest so the security-critical rules are unit-testable in isolation.
 *
 * Invariants enforced here:
 *  - A consent counts only for the CURRENT proposal_version (stale versions ignored — AC23).
 *  - A revoked consent never counts (revoke before send cancels — FR-015).
 *  - "Both authorized" requires two DISTINCT participants to have an active consent (AC21/AC22).
 */

export interface ConsentRecord {
  actorId: string;
  proposalVersion: number;
  purpose: string;
  revokedAt: Date | null;
}

export function isActiveConsent(
  c: ConsentRecord,
  proposalVersion: number,
  purpose: string,
): boolean {
  return (
    c.purpose === purpose &&
    c.proposalVersion === proposalVersion &&
    (c.revokedAt === null || c.revokedAt === undefined)
  );
}

export interface TwoSidedResult {
  authorizedActorIds: string[];
  missingActorIds: string[];
  bothAuthorized: boolean;
}

/**
 * Decide whether BOTH workers of a match have an active consent for the current
 * proposal version. Returns who authorized and who is still missing.
 */
export function evaluateTwoSidedConsent(params: {
  consents: ConsentRecord[];
  participantIds: [string, string];
  proposalVersion: number;
  purpose: string;
}): TwoSidedResult {
  const { consents, participantIds, proposalVersion, purpose } = params;
  const [a, b] = participantIds;

  const activeActorIds = new Set(
    consents
      .filter((c) => isActiveConsent(c, proposalVersion, purpose))
      .map((c) => c.actorId),
  );

  const authorizedActorIds = participantIds.filter((id) =>
    activeActorIds.has(id),
  );
  const missingActorIds = participantIds.filter((id) => !activeActorIds.has(id));

  const distinctParticipants = a !== b;
  const bothAuthorized =
    distinctParticipants &&
    activeActorIds.has(a) &&
    activeActorIds.has(b);

  return { authorizedActorIds, missingActorIds, bothAuthorized };
}
