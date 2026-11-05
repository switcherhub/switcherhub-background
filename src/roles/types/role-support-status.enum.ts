/**
 * Whether a role can participate in matching.
 * - supported: normalized role, eligible for matching.
 * - pending_review: free-text / ambiguous role; registration allowed but NOT matchable.
 * - unsupported_for_matching: e.g. license-gated roles until verifiable rules exist.
 */
export enum RoleSupportStatusEnum {
  SUPPORTED = 'supported',
  PENDING_REVIEW = 'pending_review',
  UNSUPPORTED_FOR_MATCHING = 'unsupported_for_matching',
}

/** Current taxonomy version; stored on every profile role selection (spec §3.2). */
export const TAXONOMY_VERSION = '2026-11-05.1';
