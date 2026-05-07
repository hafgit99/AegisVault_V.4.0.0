import { breachChecker } from './breach-check';

export class HIBPService {
  /**
   * Backward-compatible facade for the unified k-anonymity breach checker.
   * Only the SHA-1 prefix is sent to HIBP; suffix matching and caching stay local.
   */
  static async checkPassword(password: string): Promise<number | null> {
    return breachChecker.checkPassword(password);
  }

  static clearCacheForTests(): void {
    breachChecker.clearCache();
  }
}
