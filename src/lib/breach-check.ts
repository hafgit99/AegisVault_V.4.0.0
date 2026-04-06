/**
 * Aegis Vault - HIBP Password Breach Checker
 *
 * Implements k-anonymity checks against HaveIBeenPwned API and keeps a
 * lightweight local cache. For bulk scans it groups by hash prefix so we do
 * one range query per prefix instead of one request per password.
 */

import { SecureAppSettings } from './SecureAppSettings';

interface BreachDatabase {
  hashes: Map<string, number>; // hash -> breach count
  lastUpdated: number;
}

export class OfflineBreachChecker {
  private db: BreachDatabase;
  private rangeCache: Map<string, Map<string, number>>;
  private inFlightRanges: Map<string, Promise<Map<string, number> | null>>;

  constructor() {
    this.db = {
      hashes: new Map<string, number>(),
      lastUpdated: Date.now(),
    };
    this.rangeCache = new Map<string, Map<string, number>>();
    this.inFlightRanges = new Map<string, Promise<Map<string, number> | null>>();
  }

  async initializeLocalDatabase(): Promise<void> {
    try {
      await SecureAppSettings.initialize();
      const cached = SecureAppSettings.getHibpCache();
      if (cached?.hashes) {
        this.db.hashes = new Map(Object.entries(cached.hashes));
        this.db.lastUpdated = cached.lastUpdated || Date.now();
      }
    } catch {
      console.warn('[HIBP] Failed to load local cache');
    }
  }

  private saveLocalCache() {
    try {
      if (this.db.hashes.size > 5000) {
        this.db.hashes.clear();
      }
      SecureAppSettings.setHibpCache({
        hashes: Object.fromEntries(this.db.hashes),
        lastUpdated: this.db.lastUpdated,
      });
    } catch {
      // ignore quota limitations
    }
  }

  private async sha1(text: string): Promise<string> {
    const data = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }

  private async fetchRange(prefix: string): Promise<Map<string, number> | null> {
    if (this.rangeCache.has(prefix)) {
      return this.rangeCache.get(prefix)!;
    }

    if (this.inFlightRanges.has(prefix)) {
      return this.inFlightRanges.get(prefix)!;
    }

    const request = (async () => {
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      if (!response.ok) {
        throw new Error(`HIBP API returned ${response.status}`);
      }

      const text = await response.text();
      const suffixMap = new Map<string, number>();
      for (const line of text.split('\n')) {
        const [suffixRaw, countRaw] = line.split(':');
        const suffix = String(suffixRaw || '')
          .trim()
          .toUpperCase();
        if (!suffix) continue;
        const count = Number.parseInt(String(countRaw || '').trim(), 10);
        suffixMap.set(suffix, Number.isFinite(count) ? count : 0);
      }

      this.rangeCache.set(prefix, suffixMap);
      return suffixMap;
    })()
      .catch(() => null)
      .finally(() => {
        this.inFlightRanges.delete(prefix);
      });

    this.inFlightRanges.set(prefix, request);
    return request;
  }

  /**
   * Batch check with prefix grouping (k-anonymity range API).
   * Returns map keyed by original password value.
   */
  async checkPasswordsBatch(passwords: string[]): Promise<Map<string, number | null>> {
    const uniquePasswords = Array.from(new Set(passwords.filter(Boolean)));
    const resultByPassword = new Map<string, number | null>();
    const missingByPrefix = new Map<string, Array<{ password: string; hash: string }>>();

    await Promise.all(
      uniquePasswords.map(async (password) => {
        const hash = await this.sha1(password);
        if (this.db.hashes.has(hash)) {
          resultByPassword.set(password, this.db.hashes.get(hash)!);
          return;
        }

        const prefix = hash.slice(0, 5);
        const bucket = missingByPrefix.get(prefix) || [];
        bucket.push({ password, hash });
        missingByPrefix.set(prefix, bucket);
      })
    );

    const prefixes = Array.from(missingByPrefix.keys());
    const CONCURRENCY = 4;

    for (let i = 0; i < prefixes.length; i += CONCURRENCY) {
      const slice = prefixes.slice(i, i + CONCURRENCY);
      const rangeResponses = await Promise.all(
        slice.map(async (prefix) => ({ prefix, range: await this.fetchRange(prefix) }))
      );

      for (const { prefix, range } of rangeResponses) {
        const items = missingByPrefix.get(prefix) || [];

        if (!range) {
          for (const { password } of items) {
            resultByPassword.set(password, null);
          }
          continue;
        }

        for (const { password, hash } of items) {
          const suffix = hash.slice(5);
          const count = range.get(suffix) || 0;
          this.db.hashes.set(hash, count);
          resultByPassword.set(password, count);
        }
      }
    }

    this.saveLocalCache();
    return resultByPassword;
  }

  async checkPassword(password: string): Promise<number | null> {
    if (!password) return 0;

    try {
      const batch = await this.checkPasswordsBatch([password]);
      return batch.get(password) ?? null;
    } catch (err) {
      console.error('[BreachCheck] Check failed:', err);
      return null;
    }
  }
}

export const breachChecker = new OfflineBreachChecker();
void breachChecker.initializeLocalDatabase();
