import { ConflictException } from '@nestjs/common';

/**
 * Optimistic concurrency helper (spec FR-017). A stale write (client's expected
 * version != current server version) is rejected with 409 — never silently resolved
 * in favor of an outdated client (AC23).
 */
export class VersionConflictException extends ConflictException {
  constructor(expected: number, actual: number) {
    super({
      error: 'version_conflict',
      message: `Expected version ${expected} but current is ${actual}. Reload and retry.`,
      expected,
      actual,
    });
  }
}

export function assertVersion(expected: number, actual: number): void {
  if (expected !== actual) {
    throw new VersionConflictException(expected, actual);
  }
}
