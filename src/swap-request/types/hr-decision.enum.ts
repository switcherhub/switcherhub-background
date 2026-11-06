/**
 * Explicit HR decision (spec §5 S10), separate from payment. "No response" is NOT
 * a decline — it stays `pending`. Contact reveal is gated on two `approved` (not two
 * payments) when HR_DECISION_ENABLED.
 */
export enum HrDecisionEnum {
  PENDING = 'pending',
  APPROVED = 'approved',
  DECLINED = 'declined',
  NEEDS_CLARIFICATION = 'needs_clarification',
}
