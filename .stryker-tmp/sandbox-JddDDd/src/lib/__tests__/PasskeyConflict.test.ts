// @ts-nocheck
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { PasskeyConflictResolver } from '../sync-conflict';
import type { CanonicalPasskeyFields } from '../canonical-schema';

describe('PasskeyConflictResolver: Conflict Paths', () => {
  const now = new Date().toISOString();
  const past = new Date(Date.now() - 10000).toISOString();

  it('1. resolve: Bos credential_id olan kaydedilmez', () => {
    const local = {} as CanonicalPasskeyFields;
    const remote = { credential_id: 'cid-1' } as CanonicalPasskeyFields;

    const res = PasskeyConflictResolver.resolve(local, remote);
    expect(res.resolved.credential_id).toBe('cid-1');
    expect(res.action).toBe('remote_accepted');
  });

  it('2. resolve: Aynı credential_id durumunda güncel olanı alır', () => {
    const local = { credential_id: 'cid-1', last_auth_at: past } as CanonicalPasskeyFields;
    const remote = { credential_id: 'cid-1', last_auth_at: now } as CanonicalPasskeyFields;

    const res = PasskeyConflictResolver.resolve(local, remote);
    expect(res.resolved.last_auth_at).toBe(now);
    expect(res.action).toBe('remote_accepted');
  });

  it('3. mergeRevocations: Çift kayıtları (latest revokedAt) birleştirir', () => {
    const listA = [{ credentialId: 'id-1', revokedAt: past }];
    const listB = [{ credentialId: 'id-1', revokedAt: now }, { credentialId: 'id-2', revokedAt: now }];

    const merged = PasskeyConflictResolver.mergeRevocations(listA, listB);
    expect(merged.length).toBe(2);
    expect(merged.find(r => r.credentialId === 'id-1')?.revokedAt).toBe(now);
  });
});
