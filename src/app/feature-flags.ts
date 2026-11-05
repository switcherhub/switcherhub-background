/**
 * Centralized feature flags for the value-first rework (spec 001, Slice 1).
 *
 * Constitution invariants:
 *  - Truthful Data: demonstration/mock data is allowed ONLY when DEMO_MODE is on
 *    (a separate, clearly-labeled build). Production defaults to OFF.
 *  - Billing is decoupled from registration and stays OFF until a versioned
 *    billing policy is selected by the product owner.
 *
 * Flags are read from the environment once at process start. Keep parsing here so
 * callers never compare raw strings.
 */

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === null || value.trim() === '') {
    return defaultValue;
  }
  const v = value.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export const FeatureFlags = {
  /**
   * When true, mock/seed generators (faker-based) may inject synthetic data.
   * MUST be false in production. Default: false.
   */
  get demoMode(): boolean {
    return parseBool(process.env.DEMO_MODE, false);
  },

  /**
   * When false, no real charges are processed; HR approval is never gated on payment.
   * Default: false until a versioned billing_policy is chosen.
   */
  get billingEnabled(): boolean {
    return parseBool(process.env.BILLING_ENABLED, false);
  },

  /**
   * When true, employer contact (inviteHr / contact reveal) is gated on two-sided
   * versioned worker consent (spec FR-015/016). Default: false until the consent
   * flow (app authorize UI + e2e) is wired, so the existing swap flow is unchanged.
   */
  get consentGateEnabled(): boolean {
    return parseBool(process.env.CONSENT_GATE_ENABLED, false);
  },
} as const;

/** Convenience guard used on hot paths to block fabrication when not in demo mode. */
export function assertNotFabricatingInProd(context: string): void {
  if (!FeatureFlags.demoMode) {
    throw new Error(
      `Fabricated/mock data requested in "${context}" but DEMO_MODE is off. ` +
        `This path must not run in production (constitution: Truthful Data).`,
    );
  }
}
