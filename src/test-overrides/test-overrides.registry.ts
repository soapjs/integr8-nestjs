import { Injectable } from '@nestjs/common';
import { OverrideRecord, OverrideListResponse } from './test-overrides.types';

/**
 * Registry storing patches and factories for test overrides
 */
@Injectable()
export class TestOverridesRegistry {
  private store = new Map<string, OverrideRecord>();

  /**
   * List all active overrides
   */
  list(): OverrideListResponse {
    const out: OverrideListResponse = {};
    for (const [token, rec] of this.store.entries()) {
      out[token] = {
        methods: rec.methods ? Array.from(rec.methods.keys()) : [],
        hasFactory: !!rec.factory,
      };
    }
    return out;
  }

  /**
   * Get override record for a token
   */
  get(token: string): OverrideRecord | undefined {
    return this.store.get(token);
  }

  /**
   * Set method patches for a token
   */
  setMethods(token: string, patches: Record<string, Function>): void {
    const rec = this.store.get(token) ?? { methods: new Map<string, Function>() };
    rec.methods ??= new Map<string, Function>();
    for (const [name, fn] of Object.entries(patches)) {
      rec.methods.set(name, fn);
    }
    this.store.set(token, rec);
  }

  /**
   * Set factory function for a token
   */
  setFactory(token: string, factory: () => any): void {
    const rec = this.store.get(token) ?? {};
    rec.factory = factory;
    this.store.set(token, rec as OverrideRecord);
  }

  /**
   * Reset overrides for a specific token
   */
  reset(token: string): void {
    this.store.delete(token);
  }

  /**
   * Reset all overrides
   */
  resetAll(): void {
    this.store.clear();
  }
}

