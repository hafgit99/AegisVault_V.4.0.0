// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { VaultCryptoService } from '../vault/VaultCryptoService';
import type { VaultCardDetails, VaultIdentityDetails } from '../../vaultService';

async function generateAesKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

describe('VaultCryptoService', () => {
  let aesKey: CryptoKey;

  beforeEach(async () => {
    aesKey = await generateAesKey();
  });

  describe('encryptTextField / decryptTextField', () => {
    it('encrypts and decrypts a string correctly', async () => {
      const plaintext = 'Hello, Aegis!';
      const { encrypted, iv } = await VaultCryptoService.encryptTextField(aesKey, plaintext);

      expect(encrypted).toBeTruthy();
      expect(iv).toBeTruthy();
      expect(encrypted).not.toBe(plaintext);

      const decrypted = await VaultCryptoService.decryptTextField(aesKey, encrypted, iv);
      expect(decrypted).toBe(plaintext);
    });

    it('encrypts empty string', async () => {
      const { encrypted, iv } = await VaultCryptoService.encryptTextField(aesKey, '');
      const decrypted = await VaultCryptoService.decryptTextField(aesKey, encrypted, iv);
      expect(decrypted).toBe('');
    });

    it('encrypts unicode and special characters', async () => {
      const plaintext = 'Şifre yönetici 🛡️ Türkçe 日本語';
      const { encrypted, iv } = await VaultCryptoService.encryptTextField(aesKey, plaintext);
      const decrypted = await VaultCryptoService.decryptTextField(aesKey, encrypted, iv);
      expect(decrypted).toBe(plaintext);
    });

    it('encrypts long text (10000 chars)', async () => {
      const plaintext = 'A'.repeat(10000);
      const { encrypted, iv } = await VaultCryptoService.encryptTextField(aesKey, plaintext);
      const decrypted = await VaultCryptoService.decryptTextField(aesKey, encrypted, iv);
      expect(decrypted).toBe(plaintext);
    });

    it('throws when aesKey is null', async () => {
      await expect(VaultCryptoService.encryptTextField(null, 'test')).rejects.toThrow(
        'Vault key unavailable'
      );
    });

    it('returns null when decrypting with null key', async () => {
      const result = await VaultCryptoService.decryptTextField(null, 'enc', 'iv');
      expect(result).toBeNull();
    });

    it('returns null when encrypted or iv is undefined', async () => {
      expect(await VaultCryptoService.decryptTextField(aesKey, undefined, 'iv')).toBeNull();
      expect(await VaultCryptoService.decryptTextField(aesKey, 'enc', undefined)).toBeNull();
      expect(await VaultCryptoService.decryptTextField(aesKey)).toBeNull();
    });

    it('returns null when decrypting with wrong key', async () => {
      const wrongKey = await generateAesKey();
      const { encrypted, iv } = await VaultCryptoService.encryptTextField(aesKey, 'secret');
      const result = await VaultCryptoService.decryptTextField(wrongKey, encrypted, iv);
      expect(result).toBeNull();
    });

    it('produces different IVs for same plaintext', async () => {
      const result1 = await VaultCryptoService.encryptTextField(aesKey, 'same');
      const result2 = await VaultCryptoService.encryptTextField(aesKey, 'same');
      expect(result1.iv).not.toBe(result2.iv);
      expect(result1.encrypted).not.toBe(result2.encrypted);
    });
  });

  describe('normalizeCardDetails', () => {
    it('normalizes valid card details', () => {
      const result = VaultCryptoService.normalizeCardDetails({
        cardholder_name: '  Alice Doe  ',
        card_number: '4111111111111111',
        brand: 'visa',
        expiry_month: '12',
        expiry_year: '2026',
        cvv: '123',
      });
      expect(result).not.toBeNull();
      expect(result!.cardholder_name).toBe('Alice Doe');
      expect(result!.card_number).toBe('4111111111111111');
      expect(result!.brand).toBe('visa');
    });

    it('returns null for null input', () => {
      expect(VaultCryptoService.normalizeCardDetails(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(VaultCryptoService.normalizeCardDetails(undefined)).toBeNull();
    });

    it('returns null for empty object (all empty strings)', () => {
      expect(VaultCryptoService.normalizeCardDetails({})).toBeNull();
    });

    it('returns null when all fields are whitespace', () => {
      expect(
        VaultCryptoService.normalizeCardDetails({
          cardholder_name: '   ',
          card_number: '  ',
        })
      ).toBeNull();
    });

    it('handles partial card details with at least one field', () => {
      const result = VaultCryptoService.normalizeCardDetails({
        card_number: '4111111111111111',
      });
      expect(result).not.toBeNull();
      expect(result!.card_number).toBe('4111111111111111');
      expect(result!.cardholder_name).toBe('');
      expect(result!.cvv).toBe('');
    });

    it('trims all string fields', () => {
      const result = VaultCryptoService.normalizeCardDetails({
        cardholder_name: '  Bob  ',
        card_number: '  5500000000000004  ',
        brand: '  mastercard  ',
        expiry_month: ' 03 ',
        expiry_year: ' 27 ',
        cvv: ' 456 ',
        pin: ' 1234 ',
        billing_zip: ' 34000 ',
        billing_address: '  Main St  ',
      });
      expect(result).not.toBeNull();
      expect(result!.cardholder_name).toBe('Bob');
      expect(result!.card_number).toBe('5500000000000004');
      expect(result!.brand).toBe('mastercard');
      expect(result!.expiry_month).toBe('03');
      expect(result!.expiry_year).toBe('27');
      expect(result!.cvv).toBe('456');
      expect(result!.pin).toBe('1234');
      expect(result!.billing_zip).toBe('34000');
      expect(result!.billing_address).toBe('Main St');
    });

    it('handles non-string values gracefully', () => {
      const result = VaultCryptoService.normalizeCardDetails({
        card_number: 12345678 as any,
        brand: null as any,
      });
      expect(result).not.toBeNull();
      expect(result!.card_number).toBe('12345678');
    });
  });

  describe('normalizeIdentityDetails', () => {
    it('normalizes valid identity details', () => {
      const result = VaultCryptoService.normalizeIdentityDetails({
        document_type: 'passport',
        identity_number: 'AB1234567',
        issuing_country: 'TR',
        nationality: 'Turkish',
        date_of_birth: '1990-01-15',
        issued_at: '2020-06-01',
        expires_at: '2030-06-01',
      });
      expect(result).not.toBeNull();
      expect(result!.document_type).toBe('passport');
      expect(result!.identity_number).toBe('AB1234567');
      expect(result!.issuing_country).toBe('TR');
    });

    it('returns null for null input', () => {
      expect(VaultCryptoService.normalizeIdentityDetails(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(VaultCryptoService.normalizeIdentityDetails(undefined)).toBeNull();
    });

    it('returns null for empty object', () => {
      expect(VaultCryptoService.normalizeIdentityDetails({})).toBeNull();
    });

    it('returns null when all fields are whitespace', () => {
      expect(
        VaultCryptoService.normalizeIdentityDetails({
          document_type: '   ',
          identity_number: '  ',
        })
      ).toBeNull();
    });

    it('handles partial identity details', () => {
      const result = VaultCryptoService.normalizeIdentityDetails({
        identity_number: '12345678901',
      });
      expect(result).not.toBeNull();
      expect(result!.identity_number).toBe('12345678901');
      expect(result!.document_type).toBe('');
    });

    it('trims all fields', () => {
      const result = VaultCryptoService.normalizeIdentityDetails({
        document_type: '  national_id  ',
        identity_number: '  12345  ',
        issuing_country: '  TR  ',
        nationality: '  Turkish  ',
        date_of_birth: '  1990-01-15  ',
        issued_at: '  2020-01-01  ',
        expires_at: '  2030-01-01  ',
      });
      expect(result).not.toBeNull();
      expect(result!.document_type).toBe('national_id');
      expect(result!.identity_number).toBe('12345');
      expect(result!.issuing_country).toBe('TR');
    });
  });

  describe('hydrateRichSensitiveFields', () => {
    it('does nothing when aesKey is null', async () => {
      const entries: any[] = [{ totpSecret: 'test' }];
      await VaultCryptoService.hydrateRichSensitiveFields(
        entries,
        null
      );
      expect(entries[0].totpSecret).toBe('test');
    });

    it('does nothing when entries array is empty', async () => {
      const entries: any[] = [];
      await VaultCryptoService.hydrateRichSensitiveFields(
        entries,
        aesKey
      );
      expect(entries).toHaveLength(0);
    });

    it('hydrates TOTP secret from encrypted field', async () => {
      const totpPlain = 'JBSWY3DPEHPK3PXP';
      const { encrypted: totpSecret, iv: totpIv } = await VaultCryptoService.encryptTextField(
        aesKey,
        totpPlain
      );

      const entries: any[] = [
        { totp_secret: totpSecret, totp_iv: totpIv },
      ];

      await VaultCryptoService.hydrateRichSensitiveFields(
        entries,
        aesKey
      );

      expect(entries[0].totpSecret).toBe(totpPlain);
    });

    it('hydrates notes from encrypted_notes', async () => {
      const notesPlain = 'Gizli notlar';
      const { encrypted, iv } = await VaultCryptoService.encryptTextField(aesKey, notesPlain);

      const entries: any[] = [{ encrypted_notes: encrypted, notes_iv: iv }];

      await VaultCryptoService.hydrateRichSensitiveFields(
        entries,
        aesKey
      );

      expect(entries[0].notes).toBe(notesPlain);
    });

    it('skips already-hydrated fields', async () => {
      const entries: any[] = [
        { totpSecret: 'existing', totp_secret: 'encrypted', totp_iv: 'iv' },
      ];

      await VaultCryptoService.hydrateRichSensitiveFields(
        entries,
        aesKey
      );

      expect(entries[0].totpSecret).toBe('existing');
    });

    it('skips entries with corrupted encrypted data gracefully', async () => {
      const entries: any[] = [
        { totp_secret: 'not-valid-hex-data', totp_iv: 'also-invalid' },
      ];

      await VaultCryptoService.hydrateRichSensitiveFields(
        entries,
        aesKey
      );

      // Should not throw, just skip
      expect(entries[0].totpSecret).toBeUndefined();
    });

    it('hydrates passkeyMetadata from encrypted_passkey_meta', async () => {
      const passkeyData = JSON.stringify({
        credentialId: 'abc123',
        rpId: 'example.com',
        userHandle: 'user1',
      });
      const { encrypted, iv } = await VaultCryptoService.encryptTextField(aesKey, passkeyData);

      const entries: any[] = [{ encrypted_passkey_meta: encrypted, passkey_meta_iv: iv }];

      await VaultCryptoService.hydrateRichSensitiveFields(
        entries,
        aesKey
      );

      expect(entries[0].passkeyMetadata).toEqual({
        credentialId: 'abc123',
        rpId: 'example.com',
        userHandle: 'user1',
      });
    });

    it('hydrates cardDetails from encrypted_card_details', async () => {
      const cardData = JSON.stringify({
        cardholder_name: 'Alice',
        card_number: '4111111111111111',
      });
      const { encrypted, iv } = await VaultCryptoService.encryptTextField(aesKey, cardData);

      const entries: any[] = [{ encrypted_card_details: encrypted, card_details_iv: iv }];

      await VaultCryptoService.hydrateRichSensitiveFields(
        entries,
        aesKey
      );

      expect(entries[0].cardDetails).not.toBeNull();
      expect(entries[0].cardDetails.card_number).toBe('4111111111111111');
    });

    it('hydrates identityDetails from encrypted_identity_details', async () => {
      const identityData = JSON.stringify({
        document_type: 'passport',
        identity_number: 'AB1234567',
      });
      const { encrypted, iv } = await VaultCryptoService.encryptTextField(aesKey, identityData);

      const entries: any[] = [{ encrypted_identity_details: encrypted, identity_details_iv: iv }];

      await VaultCryptoService.hydrateRichSensitiveFields(
        entries,
        aesKey
      );

      expect(entries[0].identityDetails).not.toBeNull();
      expect(entries[0].identityDetails.identity_number).toBe('AB1234567');
    });

    it('hydrates multiple entries in parallel', async () => {
      const { encrypted: enc1, iv: iv1 } = await VaultCryptoService.encryptTextField(
        aesKey,
        'secret1'
      );
      const { encrypted: enc2, iv: iv2 } = await VaultCryptoService.encryptTextField(
        aesKey,
        'secret2'
      );

      const entries: any[] = [
        { encrypted_notes: enc1, notes_iv: iv1 },
        { encrypted_notes: enc2, notes_iv: iv2 },
      ];

      await VaultCryptoService.hydrateRichSensitiveFields(
        entries,
        aesKey
      );

      expect(entries[0].notes).toBe('secret1');
      expect(entries[1].notes).toBe('secret2');
    });
  });
});