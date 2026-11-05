/**
 * Why a worker granted consent. Consent is explicit, per-purpose, and bound to a
 * specific proposal_version (spec §8.2, FR-015). The main P1 purpose gates sending
 * a swap request to the worker's own employer.
 */
export enum ConsentPurposeEnum {
  AUTHORIZE_EMPLOYER_CONTACT = 'authorize_employer_contact',
}
