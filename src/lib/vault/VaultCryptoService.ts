import type {
  VaultAttachmentMeta,
  VaultCardDetails,
  VaultEntry,
  VaultIdentityDetails,
} from '../../vaultService';
import type { CanonicalPasskeyFields } from '../canonical-schema';
import {
  hexToBuffer,
  isLikelyHex as isLikelyHexUtil,
  bufferToHex,
  toBufferSource,
} from '../crypto-types';
import { VaultSearchIndexer } from './VaultSearchIndexer';

export class VaultCryptoService {
  static calculateStrength(password: string): number {
    if (!password) return 0;
    let score = 0;
    if (password.length > 8) score += 20;
    if (password.length > 12) score += 20;
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^a-zA-Z0-9]/.test(password)) score += 15;
    return Math.min(score, 100);
  }

  static async encryptTextField(
    aesKey: CryptoKey | null,
    value: string
  ): Promise<{ encrypted: string; iv: string }> {
    if (!aesKey) throw new Error('Vault key unavailable');

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const plainBytes = new TextEncoder().encode(value || '');
    const cipher = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: toBufferSource(iv) },
      aesKey,
      toBufferSource(plainBytes)
    );

    return {
      encrypted: bufferToHex(cipher),
      iv: bufferToHex(iv),
    };
  }

  static async decryptTextField(
    aesKey: CryptoKey | null,
    encrypted?: string,
    iv?: string
  ): Promise<string | null> {
    if (!aesKey || !encrypted || !iv) return null;

    try {
      const cipherArray = isLikelyHexUtil(encrypted)
        ? hexToBuffer(encrypted)
        : Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
      const ivArray = isLikelyHexUtil(iv)
        ? hexToBuffer(iv)
        : Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));

      const plain = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: toBufferSource(ivArray) },
        aesKey,
        toBufferSource(cipherArray)
      );
      return new TextDecoder().decode(plain);
    } catch (error) {
      console.error('DECRYPTION REAL ERROR:', error);
      return null;
    }
  }

  static normalizeCardDetails(details?: Partial<VaultCardDetails> | null): VaultCardDetails | null {
    if (!details || typeof details !== 'object') return null;

    const normalized: VaultCardDetails = {
      cardholder_name: String(details.cardholder_name || '').trim(),
      card_number: String(details.card_number || '').trim(),
      brand: String(details.brand || '').trim(),
      expiry_month: String(details.expiry_month || '').trim(),
      expiry_year: String(details.expiry_year || '').trim(),
      cvv: String(details.cvv || '').trim(),
      pin: String(details.pin || '').trim(),
      billing_zip: String(details.billing_zip || '').trim(),
      billing_address: String(details.billing_address || '').trim(),
    };

    const hasData = Object.values(normalized).some(
      (value) => typeof value === 'string' && value.length > 0
    );
    return hasData ? normalized : null;
  }

  static normalizeIdentityDetails(
    details?: Partial<VaultIdentityDetails> | null
  ): VaultIdentityDetails | null {
    if (!details || typeof details !== 'object') return null;

    const normalized: VaultIdentityDetails = {
      document_type: String(details.document_type || '').trim(),
      identity_number: String(details.identity_number || '').trim(),
      issuing_country: String(details.issuing_country || '').trim(),
      nationality: String(details.nationality || '').trim(),
      date_of_birth: String(details.date_of_birth || '').trim(),
      issued_at: String(details.issued_at || '').trim(),
      expires_at: String(details.expires_at || '').trim(),
    };

    const hasData = Object.values(normalized).some(
      (value) => typeof value === 'string' && value.length > 0
    );
    return hasData ? normalized : null;
  }

  static async hydrateRichSensitiveFields(
    entries: VaultEntry[],
    aesKey: CryptoKey | null,
    normalizeCard: (
      details?: Partial<VaultCardDetails> | null
    ) => VaultCardDetails | null = VaultCryptoService.normalizeCardDetails,
    normalizeIdentity: (
      details?: Partial<VaultIdentityDetails> | null
    ) => VaultIdentityDetails | null = VaultCryptoService.normalizeIdentityDetails
  ): Promise<void> {
    if (!aesKey || entries.length === 0) return;
    const dec = new TextDecoder();

    await Promise.all(
      entries.map(async (entry) => {
        if (!entry.totpSecret && entry.totp_secret && entry.totp_iv) {
          try {
            const totpCipher = isLikelyHexUtil(entry.totp_secret)
              ? hexToBuffer(entry.totp_secret)
              : Uint8Array.from(atob(entry.totp_secret), (c) => c.charCodeAt(0));
            const totpIv = isLikelyHexUtil(entry.totp_iv)
              ? hexToBuffer(entry.totp_iv)
              : Uint8Array.from(atob(entry.totp_iv), (c) => c.charCodeAt(0));
            const totpPlain = await window.crypto.subtle.decrypt(
              { name: 'AES-GCM', iv: toBufferSource(totpIv) },
              aesKey,
              toBufferSource(totpCipher)
            );
            entry.totpSecret = dec.decode(totpPlain);
          } catch {
            /* skip */
          }
        }

        if (!entry.notes && entry.encrypted_notes && entry.notes_iv) {
          try {
            const notesCipher = isLikelyHexUtil(entry.encrypted_notes)
              ? hexToBuffer(entry.encrypted_notes)
              : Uint8Array.from(atob(entry.encrypted_notes), (c) => c.charCodeAt(0));
            const notesIv = isLikelyHexUtil(entry.notes_iv)
              ? hexToBuffer(entry.notes_iv)
              : Uint8Array.from(atob(entry.notes_iv), (c) => c.charCodeAt(0));
            const notesPlain = await window.crypto.subtle.decrypt(
              { name: 'AES-GCM', iv: toBufferSource(notesIv) },
              aesKey,
              toBufferSource(notesCipher)
            );
            entry.notes = dec.decode(notesPlain);
          } catch {
            /* skip */
          }
        }

        if (!entry.passkeyMetadata && entry.encrypted_passkey_meta && entry.passkey_meta_iv) {
          try {
            const passkeyMetaCipher = isLikelyHexUtil(entry.encrypted_passkey_meta)
              ? hexToBuffer(entry.encrypted_passkey_meta)
              : Uint8Array.from(atob(entry.encrypted_passkey_meta), (c) => c.charCodeAt(0));
            const passkeyMetaIv = isLikelyHexUtil(entry.passkey_meta_iv)
              ? hexToBuffer(entry.passkey_meta_iv)
              : Uint8Array.from(atob(entry.passkey_meta_iv), (c) => c.charCodeAt(0));
            const passkeyMetaPlain = await window.crypto.subtle.decrypt(
              { name: 'AES-GCM', iv: toBufferSource(passkeyMetaIv) },
              aesKey,
              toBufferSource(passkeyMetaCipher)
            );
            entry.passkeyMetadata = JSON.parse(
              dec.decode(passkeyMetaPlain)
            ) as CanonicalPasskeyFields;
          } catch {
            /* skip */
          }
        }

        if (!entry.cardDetails && entry.encrypted_card_details && entry.card_details_iv) {
          try {
            const cardDetailsCipher = isLikelyHexUtil(entry.encrypted_card_details)
              ? hexToBuffer(entry.encrypted_card_details)
              : Uint8Array.from(atob(entry.encrypted_card_details), (c) => c.charCodeAt(0));
            const cardDetailsIv = isLikelyHexUtil(entry.card_details_iv)
              ? hexToBuffer(entry.card_details_iv)
              : Uint8Array.from(atob(entry.card_details_iv), (c) => c.charCodeAt(0));
            const cardDetailsPlain = await window.crypto.subtle.decrypt(
              { name: 'AES-GCM', iv: toBufferSource(cardDetailsIv) },
              aesKey,
              toBufferSource(cardDetailsCipher)
            );
            const parsed = JSON.parse(dec.decode(cardDetailsPlain)) as Partial<VaultCardDetails>;
            entry.cardDetails = normalizeCard(parsed);
          } catch {
            /* skip */
          }
        }

        if (
          !entry.identityDetails &&
          entry.encrypted_identity_details &&
          entry.identity_details_iv
        ) {
          try {
            const identityDetailsCipher = isLikelyHexUtil(entry.encrypted_identity_details)
              ? hexToBuffer(entry.encrypted_identity_details)
              : Uint8Array.from(atob(entry.encrypted_identity_details), (c) => c.charCodeAt(0));
            const identityDetailsIv = isLikelyHexUtil(entry.identity_details_iv)
              ? hexToBuffer(entry.identity_details_iv)
              : Uint8Array.from(atob(entry.identity_details_iv), (c) => c.charCodeAt(0));
            const identityDetailsPlain = await window.crypto.subtle.decrypt(
              { name: 'AES-GCM', iv: toBufferSource(identityDetailsIv) },
              aesKey,
              toBufferSource(identityDetailsCipher)
            );
            const parsed = JSON.parse(
              dec.decode(identityDetailsPlain)
            ) as Partial<VaultIdentityDetails>;
            entry.identityDetails = normalizeIdentity(parsed);
          } catch {
            /* skip */
          }
        }
      })
    );
  }

  static async buildMetadataAtRest(args: {
    title: string;
    username: string;
    website: string;
    category: string;
    tags: string[];
    aesKey: CryptoKey | null;
    getSearchIndexHmacKey: () => Promise<CryptoKey>;
  }): Promise<Record<string, unknown>> {
    const { title, username, website, category, tags, aesKey, getSearchIndexHmacKey } = args;

    const metadata: Record<string, unknown> = {
      title,
      username,
      website,
      category,
      tags,
    };

    if (aesKey) {
      const fieldEnc = async (val: string) => {
        const { encrypted, iv } = await this.encryptTextField(aesKey, val);
        return { encrypted, iv };
      };

      const tEnc = await fieldEnc(title);
      metadata.encrypted_title = tEnc.encrypted;
      metadata.title_iv = tEnc.iv;

      const uEnc = await fieldEnc(username);
      metadata.encrypted_username = uEnc.encrypted;
      metadata.username_iv = uEnc.iv;

      const cEnc = await fieldEnc(category);
      metadata.encrypted_category = cEnc.encrypted;
      metadata.category_iv = cEnc.iv;

      const wEnc = await fieldEnc(website);
      metadata.encrypted_website = wEnc.encrypted;
      metadata.website_iv = wEnc.iv;

      const tagsContent = (tags || []).join(',');
      const tagsEnc = await fieldEnc(tagsContent);
      metadata.encrypted_tags = tagsEnc.encrypted;
      metadata.tags_iv = tagsEnc.iv;

      const hmacKey = await getSearchIndexHmacKey();
      const rawTokens = [title, username, website, category, ...(tags || [])];
      const tokens = VaultSearchIndexer.tokenize(rawTokens);
      const uniqueTokens = Array.from(new Set(tokens));

      const searchIndex: string[] = [];
      for (const token of uniqueTokens) {
        const hash = await VaultSearchIndexer.hashToken(token, hmacKey);
        searchIndex.push(hash);
      }
      metadata.search_index = searchIndex;
    }

    return metadata;
  }

  static async encryptAttachmentMetadataList(
    attachments: VaultAttachmentMeta[] | undefined,
    aesKey: CryptoKey | null
  ): Promise<VaultAttachmentMeta[]> {
    if (!attachments || attachments.length === 0 || !aesKey) return [];
    
    return Promise.all(
      attachments.map(async (att) => {
        const nameEnc = await this.encryptTextField(aesKey, att.name || '');
        const typeEnc = await this.encryptTextField(aesKey, att.type || '');
        return {
          id: att.id,
          size: att.size,
          encrypted_name: nameEnc.encrypted,
          name_iv: nameEnc.iv,
          encrypted_type: typeEnc.encrypted,
          type_iv: typeEnc.iv,
        } as VaultAttachmentMeta;
      })
    );
  }

  static async prepareEntryMetadataForUse(
    entry: VaultEntry,
    aesKey: CryptoKey | null
  ): Promise<{ uiEntry: VaultEntry; storageEntry?: VaultEntry }> {
    if (!aesKey) return { uiEntry: entry };

    let storageEntry: VaultEntry | undefined;
    const uiEntry = { ...entry };

    if (!entry.encrypted_title && entry.title) {
      const fieldEnc = async (val: string) => {
        const { encrypted, iv } = await this.encryptTextField(aesKey, val || '');
        return { encrypted, iv };
      };

      const tEnc = await fieldEnc(entry.title);
      uiEntry.encrypted_title = tEnc.encrypted;
      uiEntry.title_iv = tEnc.iv;

      if (entry.category) {
        const cEnc = await fieldEnc(entry.category);
        uiEntry.encrypted_category = cEnc.encrypted;
        uiEntry.category_iv = cEnc.iv;
      }
      
      const tagsString = Array.isArray(entry.tags) ? entry.tags.join(',') : '';
      if (tagsString) {
        const tgEnc = await fieldEnc(tagsString);
        uiEntry.encrypted_tags = tgEnc.encrypted;
        uiEntry.tags_iv = tgEnc.iv;
      }
      
      if (entry.username) {
         const uEnc = await fieldEnc(entry.username);
         uiEntry.encrypted_username = uEnc.encrypted;
         uiEntry.username_iv = uEnc.iv;
      }
      
      if (entry.website) {
         const wEnc = await fieldEnc(entry.website);
         uiEntry.encrypted_website = wEnc.encrypted;
         uiEntry.website_iv = wEnc.iv;
      }

      // We don't generate search_index here because we don't have searchIndexHmacKey.
      // In VaultService, the search index logic handles the lazy migration separately if missing,
      // or the calling logic will dispatch addPassword to rebuild everything. 

      storageEntry = uiEntry;
    }

    return { uiEntry, storageEntry };
  }
}
