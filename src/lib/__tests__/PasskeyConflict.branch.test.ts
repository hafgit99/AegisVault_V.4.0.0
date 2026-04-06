// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { PasskeyConflictResolver } from '../sync-conflict';
import type { CanonicalPasskeyFields } from '../canonical-schema';

describe('PasskeyConflictResolver: Branch Coverage', () => {
  const now = new Date().toISOString();
  const past = new Date(Date.now() - 10000).toISOString();
  const future = new Date(Date.now() + 10000).toISOString();

  it('remote has empty credential_id → local_kept', () => {
    const local = { credential_id: 'cid-local' } as CanonicalPasskeyFields;
    const remote = {} as CanonicalPasskeyFields;
    const res = PasskeyConflictResolver.resolve(local, remote);
    expect(res.resolved.credential_id).toBe('cid-local');
    expect(res.action).toBe('local_kept');
  });

  it('same credential_id, local is newer → local_kept', () => {
    const local = { credential_id: 'cid-1', last_auth_at: now } as CanonicalPasskeyFields;
    const remote = { credential_id: 'cid-1', last_auth_at: past } as CanonicalPasskeyFields;
    const res = PasskeyConflictResolver.resolve(local, remote);
    expect(res.resolved.last_auth_at).toBe(now);
    expect(res.action).toBe('local_kept');
  });

  it('same credential_id, equal timestamps → local_kept (>=)', () => {
    const local = { credential_id: 'cid-1', last_auth_at: now } as CanonicalPasskeyFields;
    const remote = { credential_id: 'cid-1', last_auth_at: now } as CanonicalPasskeyFields;
    const res = PasskeyConflictResolver.resolve(local, remote);
    expect(res.action).toBe('local_kept');
  });

  it('same credential_id, falls back to last_registration_at', () => {
    const local = { credential_id: 'cid-1', last_registration_at: now } as CanonicalPasskeyFields;
    const remote = { credential_id: 'cid-1', last_registration_at: past } as CanonicalPasskeyFields;
    const res = PasskeyConflictResolver.resolve(local, remote);
    expect(res.action).toBe('local_kept');
  });

  it('different credential_ids, local more active → local_kept', () => {
    const local = { credential_id: 'cid-A', last_auth_at: now } as CanonicalPasskeyFields;
    const remote = { credential_id: 'cid-B', last_auth_at: past } as CanonicalPasskeyFields;
    const res = PasskeyConflictResolver.resolve(local, remote);
    expect(res.action).toBe('local_kept');
  });

  it('different credential_ids, remote more active → remote_accepted', () => {
    const local = { credential_id: 'cid-A', last_auth_at: past } as CanonicalPasskeyFields;
    const remote = { credential_id: 'cid-B', last_auth_at: now } as CanonicalPasskeyFields;
    const res = PasskeyConflictResolver.resolve(local, remote);
    expect(res.action).toBe('remote_accepted');
  });

  it('different credential_ids, fallback to last_registration_at', () => {
    const local = { credential_id: 'cid-A', last_registration_at: past } as CanonicalPasskeyFields;
    const remote = { credential_id: 'cid-B', last_registration_at: now } as CanonicalPasskeyFields;
    const res = PasskeyConflictResolver.resolve(local, remote);
    expect(res.action).toBe('remote_accepted');
  });

  it('mergeRevocations with empty local list', () => {
    const remote = [{ credentialId: 'id-1', revokedAt: now }];
    const merged = PasskeyConflictResolver.mergeRevocations([], remote);
    expect(merged.length).toBe(1);
  });

  it('mergeRevocations with empty remote list', () => {
    const local = [{ credentialId: 'id-1', revokedAt: now }];
    const merged = PasskeyConflictResolver.mergeRevocations(local, []);
    expect(merged.length).toBe(1);
  });

  it('mergeRevocations keeps local when newer', () => {
    const local = [{ credentialId: 'id-1', revokedAt: now }];
    const remote = [{ credentialId: 'id-1', revokedAt: past }];
    const merged = PasskeyConflictResolver.mergeRevocations(local, remote);
    expect(merged[0].revokedAt).toBe(now);
  });
});
