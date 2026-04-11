// @ts-nocheck
import type { VaultEntry } from '../vaultService';

/**
 * SearchService — Aegis Vault özel (blind) arama ve performans optimizasyon katmanı.
 * 4.2 Performans Hardening (Adım 5.3) kapsamında eklendi.
 *
 * Ana Özellikler:
 * 1. Blind Search: HMAC tabanlı arama indeksiyle şifreli verilerde hızlı arama.
 * 2. Subsequence Matching: Gelişmiş bulanık arama desteği.
 * 3. Tokenization: Performanslı prefix ve kelime bazlı indeksleme.
 */
export class SearchService {
  /**
   * Değerleri normalize et (küçük harf, aksandan arındırma, özel karakter temizliği)
   */
  static normalize(value: string = ''): string {
    return value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .trim();
  }

  /**
   * Alanları kelimelerine ve 2-8 karakterlik prefixlerine ayır (İndeksleme için)
   */
  static tokenize(fields: string[]): string[] {
    const tokenSet = new Set<string>();
    for (const rawField of fields) {
      const normalized = this.normalize(rawField || '');
      if (!normalized) continue;

      const parts = normalized.split(/\s+/).filter(Boolean);
      for (const token of parts) {
        tokenSet.add(token);
        // Prefixleri ekle (Minimum 2 karakter, Maksimum 8 karakter veya token boyutu)
        const maxPrefix = Math.min(8, token.length);
        for (let i = 2; i <= maxPrefix; i++) {
          tokenSet.add(token.slice(0, i));
        }
      }
    }
    return Array.from(tokenSet).slice(0, 256); // Maksimum 256 token sınırla (Performans & Depolama)
  }

  /**
   * Subsequence (LCS-benzeri) arama mantığı.
   * 'needle' karakterlerinin 'haystack' içinde sırasıyla olup olmadığını kontrol eder.
   */
  static isSubsequence(needle: string, haystack: string): boolean {
    if (needle.length > haystack.length) return false;
    let i = 0;
    let j = 0;
    while (i < needle.length && j < haystack.length) {
      if (needle[i] === haystack[j]) i++;
      j++;
    }
    return i === needle.length;
  }

  /**
   * Bellek içi (Decrypted) arama ve sıralama mantığı.
   * Skor bazlı sıralama yapar:
   * - Başlıkta prefix match: 120 puan
   * - Başlıkta içerik: 90 puan
   * - Kullanıcı adında içerik: 60 puan
   * - Web sitesi / Kategori / Etiket: 35-50 puan
   * - Subsequence: 20 puan
   */
  static searchDecrypted(
    entries: VaultEntry[],
    query: string,
    scope: 'all' | 'title' | 'username' | 'tags' = 'all'
  ): VaultEntry[] {
    if (!query.trim()) return entries;

    const queryTokens = this.normalize(query).split(/\s+/).filter(Boolean);

    if (queryTokens.length === 0) return entries;

    const scored = entries
      .map((entry) => {
        const title = this.normalize(entry.title || '');
        const username = this.normalize(entry.username || '');
        const website = this.normalize(entry.website || '');
        const category = this.normalize(entry.category || '');
        const tags = (entry.tags || []).map((t) => this.normalize(t));

        // Kapsama göre alanları belirle
        const scopedFields =
          scope === 'title'
            ? [title]
            : scope === 'username'
              ? [username]
              : scope === 'tags'
                ? tags
                : [title, username, website, category, ...tags];

        const fullByScope = scopedFields.join(' ');

        let score = 0;
        let matchedAllTokens = true;
        let prefixMatchedAllTokens = true;

        for (const token of queryTokens) {
          if (!token) continue;

          let tokenMatched = false;
          const tokenPrefixMatched = scopedFields.some((f) => f.startsWith(token));
          if (!tokenPrefixMatched) prefixMatchedAllTokens = false;

          // Başlık Ağırlığı (En yüksek)
          if ((scope === 'all' || scope === 'title') && title.startsWith(token)) {
            score += 120;
            tokenMatched = true;
          } else if ((scope === 'all' || scope === 'title') && title.includes(token)) {
            score += 90;
            tokenMatched = true;
          }

          // Kullanıcı Adı Ağırlığı
          if (
            !tokenMatched &&
            (scope === 'all' || scope === 'username') &&
            username.includes(token)
          ) {
            score += 60;
            tokenMatched = true;
          }

          // Diğer alanlar
          if (!tokenMatched && scope === 'all' && website.includes(token)) {
            score += 50;
            tokenMatched = true;
          }

          if (!tokenMatched && scope === 'all' && category.includes(token)) {
            score += 35;
            tokenMatched = true;
          }

          if (
            !tokenMatched &&
            (scope === 'all' || scope === 'tags') &&
            tags.some((tag) => tag.includes(token))
          ) {
            score += 40;
            tokenMatched = true;
          }

          // Subsequence (Minimum 3 karakter)
          if (!tokenMatched && token.length >= 3 && this.isSubsequence(token, fullByScope)) {
            score += 20;
            tokenMatched = true;
          }

          if (!tokenMatched) {
            matchedAllTokens = false;
            break;
          }
        }

        return { entry, score, matchedAllTokens, prefixMatchedAllTokens };
      })
      .filter((item) => item.matchedAllTokens);

    // Eğer tam prefix eşleşmesi olan bir set varsa onlara öncelik ver
    const hasPrefixOnlySet = scored.some((item) => item.prefixMatchedAllTokens);
    const resultItems = hasPrefixOnlySet
      ? scored.filter((item) => item.prefixMatchedAllTokens || item.score >= 40)
      : scored;

    return resultItems
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aTime = a.entry.updated_at ? new Date(a.entry.updated_at).getTime() : 0;
        const bTime = b.entry.updated_at ? new Date(b.entry.updated_at).getTime() : 0;
        return bTime - aTime;
      })
      .map((item) => item.entry);
  }
}
