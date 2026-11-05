import {
  ConsentRecord,
  evaluateTwoSidedConsent,
  isActiveConsent,
} from './consent.logic';

const PURPOSE = 'authorize_employer_contact';
const A = 'worker-a';
const B = 'worker-b';

function consent(partial: Partial<ConsentRecord>): ConsentRecord {
  return {
    actorId: A,
    proposalVersion: 1,
    purpose: PURPOSE,
    revokedAt: null,
    ...partial,
  };
}

describe('consent logic (two-sided, version-bound)', () => {
  it('isActiveConsent: matches purpose+version and not revoked', () => {
    expect(isActiveConsent(consent({}), 1, PURPOSE)).toBe(true);
    expect(isActiveConsent(consent({ proposalVersion: 2 }), 1, PURPOSE)).toBe(false);
    expect(isActiveConsent(consent({ purpose: 'other' }), 1, PURPOSE)).toBe(false);
    expect(isActiveConsent(consent({ revokedAt: new Date(1) }), 1, PURPOSE)).toBe(false);
  });

  it('AC21: one-sided consent does NOT authorize employer contact', () => {
    const r = evaluateTwoSidedConsent({
      consents: [consent({ actorId: A })],
      participantIds: [A, B],
      proposalVersion: 1,
      purpose: PURPOSE,
    });
    expect(r.bothAuthorized).toBe(false);
    expect(r.missingActorIds).toEqual([B]);
  });

  it('AC22: both workers authorized at current version → both authorized', () => {
    const r = evaluateTwoSidedConsent({
      consents: [consent({ actorId: A }), consent({ actorId: B })],
      participantIds: [A, B],
      proposalVersion: 1,
      purpose: PURPOSE,
    });
    expect(r.bothAuthorized).toBe(true);
    expect(r.missingActorIds).toEqual([]);
  });

  it('AC23: consent at an old version does not count after terms change', () => {
    const r = evaluateTwoSidedConsent({
      consents: [
        consent({ actorId: A, proposalVersion: 2 }), // current
        consent({ actorId: B, proposalVersion: 1 }), // stale
      ],
      participantIds: [A, B],
      proposalVersion: 2,
      purpose: PURPOSE,
    });
    expect(r.bothAuthorized).toBe(false);
    expect(r.missingActorIds).toEqual([B]);
  });

  it('revoked consent is ignored even at current version', () => {
    const r = evaluateTwoSidedConsent({
      consents: [
        consent({ actorId: A }),
        consent({ actorId: B, revokedAt: new Date(1) }),
      ],
      participantIds: [A, B],
      proposalVersion: 1,
      purpose: PURPOSE,
    });
    expect(r.bothAuthorized).toBe(false);
  });

  it('duplicate consents from one actor do not satisfy the other side', () => {
    const r = evaluateTwoSidedConsent({
      consents: [consent({ actorId: A }), consent({ actorId: A })],
      participantIds: [A, B],
      proposalVersion: 1,
      purpose: PURPOSE,
    });
    expect(r.bothAuthorized).toBe(false);
  });

  it('same participant on both sides can never be "both authorized"', () => {
    const r = evaluateTwoSidedConsent({
      consents: [consent({ actorId: A })],
      participantIds: [A, A],
      proposalVersion: 1,
      purpose: PURPOSE,
    });
    expect(r.bothAuthorized).toBe(false);
  });
});
