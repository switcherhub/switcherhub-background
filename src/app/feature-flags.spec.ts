import {
  FeatureFlags,
  assertNotFabricatingInProd,
} from './feature-flags';

describe('FeatureFlags (truthfulness guards)', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('defaults DEMO_MODE and BILLING_ENABLED to false', () => {
    delete process.env.DEMO_MODE;
    delete process.env.BILLING_ENABLED;
    expect(FeatureFlags.demoMode).toBe(false);
    expect(FeatureFlags.billingEnabled).toBe(false);
  });

  it('parses truthy strings', () => {
    process.env.DEMO_MODE = 'true';
    expect(FeatureFlags.demoMode).toBe(true);
    process.env.DEMO_MODE = '1';
    expect(FeatureFlags.demoMode).toBe(true);
    process.env.DEMO_MODE = 'off';
    expect(FeatureFlags.demoMode).toBe(false);
  });

  it('assertNotFabricatingInProd throws when DEMO_MODE is off', () => {
    delete process.env.DEMO_MODE;
    expect(() => assertNotFabricatingInProd('test')).toThrow();
  });

  it('assertNotFabricatingInProd allows when DEMO_MODE is on', () => {
    process.env.DEMO_MODE = 'true';
    expect(() => assertNotFabricatingInProd('test')).not.toThrow();
  });
});
