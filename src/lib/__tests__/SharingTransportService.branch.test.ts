import { describe, it, expect, vi } from 'vitest';
import { SharingTransportService } from '../SharingTransportService';
import type { VaultEntry } from '../../vaultService';

describe('SharingTransportService Branch Coverage', () => {
  it('should export and import key pairs', () => {
    const keyPair = {
      publicKeyJwk: { kty: 'EC', crv: 'P-256', x: '1', y: '2' },
      privateKeyJwk: { kty: 'EC', crv: 'P-256', x: '1', y: '2', d: '3' },
      publicKeyFingerprint: 'mockFingerprint',
      createdAt: '2023-01-01T00:00:00.000Z',
    };
    const json = SharingTransportService.exportKeyPair(keyPair);
    expect(json).toContain('mockFingerprint');
    
    const imported = SharingTransportService.importKeyPair(json);
    expect(imported.publicKeyFingerprint).toBe('mockFingerprint');
  });

  it('should validate payloads and return correct errors', () => {
    expect(SharingTransportService.validatePayload('invalid json').valid).toBe(false);
    expect(SharingTransportService.validatePayload(JSON.stringify({ version: 'wrong' })).valid).toBe(false);
    expect(SharingTransportService.validatePayload(JSON.stringify({ version: 'aegis-share-v1' })).error).toBe('Missing ephemeral public key');
    expect(SharingTransportService.validatePayload(JSON.stringify({ version: 'aegis-share-v1', ephemeralPublicKey: {} })).error).toBe('Missing ciphertext');
    expect(SharingTransportService.validatePayload(JSON.stringify({ version: 'aegis-share-v1', ephemeralPublicKey: {}, ciphertext: 'c' })).error).toBe('Missing IV');
    expect(SharingTransportService.validatePayload(JSON.stringify({ version: 'aegis-share-v1', ephemeralPublicKey: {}, ciphertext: 'c', iv: 'i' })).error).toBe('Missing HMAC');
    
    const pastPayload = {
      version: 'aegis-share-v1',
      ephemeralPublicKey: {},
      ciphertext: 'c',
      iv: 'i',
      hmac: 'h',
      expiresAt: new Date(Date.now() - 10000).toISOString(),
    };
    expect(SharingTransportService.validatePayload(JSON.stringify(pastPayload)).error).toBe('Payload expired');
    
    const validPayload = {
      ...pastPayload,
      expiresAt: new Date(Date.now() + 10000).toISOString(),
      entryCount: 5,
    };
    const validResult = SharingTransportService.validatePayload(JSON.stringify(validPayload));
    expect(validResult.valid).toBe(true);
    expect(validResult.entryCount).toBe(5);
  });

  it('should categorize payload size properly', () => {
    // mock payload logic
    expect(SharingTransportService.getPayloadSizeCategory('a'.repeat(100))).toBe('small');
    expect(SharingTransportService.getPayloadSizeCategory('a'.repeat(3000))).toBe('medium');
    expect(SharingTransportService.getPayloadSizeCategory('a'.repeat(60000))).toBe('large');
    
    expect(SharingTransportService.getRecommendedTransport('a'.repeat(100))).toBe('qr');
    expect(SharingTransportService.getRecommendedTransport('a'.repeat(3000))).toBe('clipboard');
    expect(SharingTransportService.getRecommendedTransport('a'.repeat(60000))).toBe('file');
  });

  it('should create a share package', async () => {
    const entries = [{ title: 'test', pass: 'p' }] as VaultEntry[];
    const result = await SharingTransportService.createSharePackage(entries, { expiresInHours: 1 });
    expect(result.keyPair).toBeDefined();
    expect(result.result.success).toBe(true);
  });
});
