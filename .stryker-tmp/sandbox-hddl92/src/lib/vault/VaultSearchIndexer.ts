// @ts-nocheck
import { SearchService } from '../SearchService';
import { bufferToHex, toBufferSource } from '../crypto-types';

export class VaultSearchIndexer {
  static normalize(value: string = ''): string {
    return SearchService.normalize(value);
  }

  static tokenize(fields: string[]): string[] {
    return SearchService.tokenize(fields);
  }

  static async getOrCreateHmacKey(
    sensitiveMaterial: Uint8Array | null,
    currentKey: CryptoKey | null
  ): Promise<CryptoKey> {
    if (currentKey) return currentKey;
    if (!sensitiveMaterial) throw new Error('Search index key unavailable');

    const rawKey = new Uint8Array(sensitiveMaterial);
    return window.crypto.subtle.importKey(
      'raw',
      toBufferSource(rawKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
  }

  static async getSearchIndexHmacKey(aesKey: CryptoKey | null): Promise<CryptoKey> {
    if (!aesKey) throw new Error('Vault key unavailable');

    const exportedBytes = await window.crypto.subtle.exportKey('raw', aesKey);
    return window.crypto.subtle.importKey(
      'raw',
      exportedBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
  }

  static async hashToken(token: string, key: CryptoKey): Promise<string> {
    const signature = await window.crypto.subtle.sign(
      'HMAC',
      key,
      toBufferSource(new TextEncoder().encode(token))
    );
    return bufferToHex(signature);
  }

  static async buildIndex(
    args: {
      title: string;
      username: string;
      website: string;
      category: string;
      tags: string[];
    },
    hashFn: (token: string) => Promise<string>
  ): Promise<string[]> {
    const tokens = this.tokenize([
      args.title || '',
      args.username || '',
      args.website || '',
      args.category || '',
      ...(Array.isArray(args.tags) ? args.tags : []),
    ]);

    if (tokens.length === 0) return [];
    return Promise.all(tokens.map((token) => hashFn(token)));
  }
}
