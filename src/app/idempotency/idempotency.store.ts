import { Injectable } from '@nestjs/common';

interface Entry {
  response: unknown;
  expiresAt: number;
}

/**
 * Idempotency store for mutations that could create an email, consent, or deal
 * (spec FR-017). Keyed by `Idempotency-Key` header (+ route). On a repeat, the first
 * response is replayed instead of re-executing the side effect.
 *
 * NOTE: in-memory for the foundation slice. Production with multiple instances MUST
 * back this with Redis (the project already has REDIS_* env + a cache module).
 */
@Injectable()
export class IdempotencyStore {
  private readonly map = new Map<string, Entry>();
  private readonly ttlMs = 24 * 60 * 60 * 1000; // 24h

  private sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.map) {
      if (entry.expiresAt <= now) this.map.delete(key);
    }
  }

  get(key: string): unknown | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return entry.response;
  }

  set(key: string, response: unknown): void {
    if (this.map.size > 10_000) this.sweep();
    this.map.set(key, { response, expiresAt: Date.now() + this.ttlMs });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }
}
