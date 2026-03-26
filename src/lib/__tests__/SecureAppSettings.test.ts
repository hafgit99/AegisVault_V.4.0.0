// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SecureAppSettings } from '../SecureAppSettings';

describe('SecureAppSettings', () => {
  const originalIndexedDb = globalThis.indexedDB;

  beforeEach(() => {
    localStorage.clear();
    SecureAppSettings.resetForTests();
  });

  afterEach(() => {
    if (originalIndexedDb === undefined) {
      Reflect.deleteProperty(globalThis, 'indexedDB');
    } else {
      Object.defineProperty(globalThis, 'indexedDB', {
        configurable: true,
        writable: true,
        value: originalIndexedDb,
      });
    }
  });

  it('bootstraps legacy settings once and keeps in-memory updates stable', () => {
    localStorage.setItem('aegis_security_mode_profile', 'strict');
    localStorage.setItem('aegis_allow_plaintext_export', '1');
    localStorage.setItem('aegis_hibp_enabled', '1');
    localStorage.setItem('aegis_auto_lock_time', '7');
    localStorage.setItem('aegis:view-density', 'compact');
    localStorage.setItem('aegis:theme-mode', 'dark');
    localStorage.setItem('aegis_seen_tour', 'true');
    localStorage.setItem('aegis_encryption_profile', 'maximum');
    localStorage.setItem(
      'aegis_vault_profiles',
      JSON.stringify([
        {
          id: 'vault-a',
          name: 'Vault A',
          color: '#123456',
          createdAt: '2026-03-17T10:00:00.000Z',
          dbName: 'db-a',
          isDefault: false,
        },
      ])
    );
    localStorage.setItem('aegis_active_vault', 'vault-a');
    localStorage.setItem('aegis_totp_vault_mode', 'separate_2fa_vault');
    localStorage.setItem('aegis_totp_vault_id', 'totp-a');
    localStorage.setItem(
      'aegis_qr_sync_consumed_v1',
      JSON.stringify({ sessionA: '2026-03-17T10:01:00.000Z' })
    );
    localStorage.setItem(
      'aegis_qr_sync_ledger_v1',
      JSON.stringify({
        sessionA: {
          sessionId: 'sessionA',
          createdAt: '2026-03-17T10:00:00.000Z',
          expiresAt: '2026-03-17T10:30:00.000Z',
          entryCount: 2,
          protectionMode: 'transfer-code',
          status: 'created',
        },
      })
    );
    localStorage.setItem(
      'aegis_qr_sync_audit_v1',
      JSON.stringify([
        {
          id: 'audit-1',
          type: 'package_created',
          at: '2026-03-17T10:00:00.000Z',
          metadata: { entryCount: 2 },
        },
      ])
    );
    localStorage.setItem(
      'aegis_shared_spaces_v1',
      JSON.stringify([
        {
          id: 'space-1',
          name: 'Family',
          kind: 'family',
          description: 'shared items',
          default_role: 'viewer',
          allow_export: false,
          require_review: true,
          created_at: '2026-03-17T10:00:00.000Z',
          updated_at: '2026-03-17T10:05:00.000Z',
          members: [
            {
              id: 'member-1',
              name: 'Ada',
              email: 'ada@example.com',
              role: 'admin',
              status: 'active',
            },
          ],
        },
      ])
    );
    localStorage.setItem(
      'aegis_shared_item_assignments_v1',
      JSON.stringify({
        item_1: [
          {
            space_id: 'space-1',
            role: 'viewer',
            shared_by: 'ada@example.com',
          },
        ],
      })
    );
    localStorage.setItem(
      'aegis_sharing_audit_v1',
      JSON.stringify([
        {
          id: 'sharing-audit-1',
          at: '2026-03-17T10:06:00.000Z',
          type: 'space_saved',
          spaceId: 'space-1',
        },
      ])
    );

    expect(SecureAppSettings.getSecurityModeProfile()).toBe('strict');
    expect(SecureAppSettings.getPlaintextExportEnabled()).toBe(true);
    expect(SecureAppSettings.getHibpEnabled()).toBe(true);
    expect(SecureAppSettings.getAutoLockTime()).toBe(7);
    expect(SecureAppSettings.getViewDensity()).toBe('compact');
    expect(SecureAppSettings.getThemeMode()).toBe('dark');
    expect(SecureAppSettings.getHasSeenTour()).toBe(true);
    expect(SecureAppSettings.getEncryptionProfile()).toBe('maximum');
    expect(SecureAppSettings.getVaultProfiles()[0]?.id).toBe('vault-a');
    expect(SecureAppSettings.getActiveVaultId()).toBe('vault-a');
    expect(SecureAppSettings.getTotpVaultMode()).toBe('separate_2fa_vault');
    expect(SecureAppSettings.getTotpVaultId()).toBe('totp-a');
    expect(SecureAppSettings.getQrConsumedPackages()).toEqual({
      sessionA: '2026-03-17T10:01:00.000Z',
    });
    expect(SecureAppSettings.getQrTransferLedger().sessionA?.status).toBe('created');
    expect(SecureAppSettings.getQrTransferAudit()).toHaveLength(1);
    expect(SecureAppSettings.getSharedSpaces()[0]?.id).toBe('space-1');
    expect(SecureAppSettings.getSharedItemAssignments().item_1?.[0]?.space_id).toBe('space-1');
    expect(SecureAppSettings.getSharingAudit()[0]?.type).toBe('space_saved');

    SecureAppSettings.setSecurityModeProfile('maximum');
    localStorage.setItem('aegis_security_mode_profile', 'standard');

    expect(SecureAppSettings.getSecurityModeProfile()).toBe('maximum');
  });

  it('dispatches idle-timeout changes and returns defensive copies', () => {
    const listener = vi.fn();
    window.addEventListener('aegis-secure-setting-changed', listener);

    try {
      SecureAppSettings.setHibpCache({
        hashes: { abc123: 4 },
        lastUpdated: 123,
      });
      SecureAppSettings.setVaultProfiles([
        {
          id: 'vault-a',
          name: 'Vault A',
          color: '#111111',
          createdAt: '2026-03-17T10:00:00.000Z',
          dbName: 'db-a',
          isDefault: true,
        },
      ]);
      SecureAppSettings.setQrTransferAudit([
        {
          id: 'audit-1',
          type: 'package_created',
          at: '2026-03-17T10:00:00.000Z',
          metadata: { approved: true },
        },
      ]);
      SecureAppSettings.setSharedSpaces([
        {
          id: 'space-1',
          name: 'Family',
          kind: 'family',
          description: 'shared items',
          default_role: 'editor',
          allow_export: false,
          require_review: true,
          created_at: '2026-03-17T10:00:00.000Z',
          updated_at: '2026-03-17T10:05:00.000Z',
          members: [
            {
              id: 'member-1',
              name: 'Ada',
              email: 'ada@example.com',
              role: 'viewer',
              status: 'active',
            },
          ],
        },
      ]);
      SecureAppSettings.setSharedItemAssignments({
        item_1: [
          {
            space_id: 'space-1',
            role: 'viewer',
            shared_by: 'ada@example.com',
          },
        ],
      });
      SecureAppSettings.setSharingAudit([
        {
          id: 'sharing-audit-1',
          at: '2026-03-17T10:06:00.000Z',
          type: 'space_saved',
          spaceId: 'space-1',
        },
      ]);
      SecureAppSettings.setSecurityCenterHistory([
        {
          id: 'security-history-1',
          at: '2026-03-17T10:07:00.000Z',
          action: 'reviewed',
          reviewKey: 'missing_second_factor:1',
          issueType: 'missing_second_factor',
          title: 'Github',
        },
      ]);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0]?.[0]).toBeInstanceOf(CustomEvent);

      const hibpCache = SecureAppSettings.getHibpCache();
      const profiles = SecureAppSettings.getVaultProfiles();
      const audit = SecureAppSettings.getQrTransferAudit();
      const sharedSpaces = SecureAppSettings.getSharedSpaces();
      const sharedAssignments = SecureAppSettings.getSharedItemAssignments();
      const sharingAudit = SecureAppSettings.getSharingAudit();
      const securityCenterHistory = SecureAppSettings.getSecurityCenterHistory();

      if (hibpCache?.hashes) {
        hibpCache.hashes.abc123 = 99;
      }
      profiles[0].name = 'Mutated';
      if (audit[0]?.metadata) {
        audit[0].metadata.approved = false;
      }
      if (sharedSpaces[0]) {
        sharedSpaces[0].name = 'Mutated Space';
      }
      if (sharedSpaces[0]?.members[0]) {
        sharedSpaces[0].members[0].name = 'Mutated Member';
      }
      if (sharedAssignments.item_1?.[0]) {
        sharedAssignments.item_1[0].role = 'editor';
      }
      if (sharingAudit[0]) {
        sharingAudit[0].type = 'space_deleted';
      }
      if (securityCenterHistory[0]) {
        securityCenterHistory[0].title = 'Mutated title';
      }

      expect(SecureAppSettings.getHibpCache()?.hashes.abc123).toBe(4);
      expect(SecureAppSettings.getVaultProfiles()[0]?.name).toBe('Vault A');
      expect(SecureAppSettings.getQrTransferAudit()[0]?.metadata?.approved).toBe(true);
      expect(SecureAppSettings.getSharedSpaces()[0]?.name).toBe('Family');
      expect(SecureAppSettings.getSharedSpaces()[0]?.members[0]?.name).toBe('Ada');
      expect(SecureAppSettings.getSharedItemAssignments().item_1?.[0]?.role).toBe('viewer');
      expect(SecureAppSettings.getSharingAudit()[0]?.type).toBe('space_saved');
      expect(SecureAppSettings.getSecurityCenterHistory()[0]?.title).toBe('Github');
      expect(SecureAppSettings.getSecurityCenterHistory()[0]?.action).toBe('reviewed');
    } finally {
      window.removeEventListener('aegis-secure-setting-changed', listener);
    }
  });

  it('initializes from legacy storage when indexedDB is unavailable and clears migrated keys on demand', async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    localStorage.setItem('aegis_allow_plaintext_export', '1');
    localStorage.setItem('aegis_hibp_enabled', '1');

    await SecureAppSettings.initialize();

    expect(SecureAppSettings.getPlaintextExportEnabled()).toBe(true);
    expect(SecureAppSettings.getHibpEnabled()).toBe(true);

    SecureAppSettings.clearMigratedLegacyKeys();

    expect(localStorage.getItem('aegis_allow_plaintext_export')).toBeNull();
    expect(localStorage.getItem('aegis_hibp_enabled')).toBeNull();
  });

  it('initializes from indexedDB when stored state exists and clears legacy keys', async () => {
    const storedState = {
      securityModeProfile: 'maximum',
      plaintextExportEnabled: true,
      hibpEnabled: true,
      hibpCache: {
        hashes: { abc: 3 },
        lastUpdated: 42,
      },
      autoLockTime: 9,
      viewDensity: 'compact',
      themeMode: 'dark',
      hasSeenTour: true,
      encryptionProfile: 'performance',
      vaultProfiles: [
        {
          id: 'vault-db',
          name: 'Vault DB',
          color: '#333333',
          createdAt: '2026-03-17T11:00:00.000Z',
          dbName: 'db-vault',
          isDefault: false,
        },
      ],
      activeVaultId: 'vault-db',
      totpVaultMode: 'separate_2fa_vault',
      totpVaultId: 'totp-db',
      qrConsumedPackages: { pkg1: 'used' },
      qrTransferLedger: {},
      qrTransferAudit: [],
      sharedSpaces: [
        {
          id: 'space-db',
          name: 'DB Space',
          kind: 'team',
          description: 'db shared space',
          default_role: 'viewer',
          allow_export: true,
          require_review: false,
          created_at: '2026-03-17T11:00:00.000Z',
          updated_at: '2026-03-17T11:05:00.000Z',
          members: [],
        },
      ],
      sharedItemAssignments: {
        item_9: [
          {
            space_id: 'space-db',
            role: 'editor',
          },
        ],
      },
      sharingAudit: [
        {
          id: 'sharing-audit-db',
          at: '2026-03-17T11:06:00.000Z',
          type: 'assignment_saved',
          entryId: 'item_9',
        },
      ],
    };

    localStorage.setItem('aegis_allow_plaintext_export', '1');

    const db = {
      objectStoreNames: { contains: () => true },
      close: vi.fn(),
      transaction: vi.fn(() => {
        const tx: Record<string, (() => void) | null> = {
          oncomplete: null,
          onerror: null,
        };
        return {
          objectStore: () => ({
            get: () => {
              const request: Record<string, unknown> = {
                result: storedState,
                onsuccess: null,
                onerror: null,
              };
              queueMicrotask(() => {
                if (typeof request.onsuccess === 'function') {
                  request.onsuccess();
                }
                if (typeof tx.oncomplete === 'function') {
                  tx.oncomplete();
                }
              });
              return request;
            },
          }),
          get oncomplete() {
            return tx.oncomplete;
          },
          set oncomplete(value) {
            tx.oncomplete = value;
          },
          get onerror() {
            return tx.onerror;
          },
          set onerror(value) {
            tx.onerror = value;
          },
        };
      }),
    };

    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      writable: true,
      value: {
        open: vi.fn(() => {
          const request: Record<string, unknown> = {
            result: db,
            error: null,
            onupgradeneeded: null,
            onsuccess: null,
            onerror: null,
          };
          queueMicrotask(() => {
            if (typeof request.onsuccess === 'function') {
              request.onsuccess();
            }
          });
          return request;
        }),
      },
    });

    await SecureAppSettings.initialize();

    expect(SecureAppSettings.getSecurityModeProfile()).toBe('maximum');
    expect(SecureAppSettings.getThemeMode()).toBe('dark');
    expect(SecureAppSettings.getVaultProfiles()[0]?.id).toBe('vault-db');
    expect(SecureAppSettings.getSharedSpaces()[0]?.id).toBe('space-db');
    expect(SecureAppSettings.getSharedItemAssignments().item_9?.[0]?.role).toBe('editor');
    expect(SecureAppSettings.getSharingAudit()[0]?.type).toBe('assignment_saved');
    expect(localStorage.getItem('aegis_allow_plaintext_export')).toBeNull();
  });

  it('falls back to legacy state when indexedDB initialization fails', async () => {
    localStorage.setItem('aegis_security_mode_profile', 'strict');
    localStorage.setItem('aegis:theme-mode', 'dark');

    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      writable: true,
      value: {
        open: vi.fn(() => {
          const request: Record<string, unknown> = {
            result: null,
            error: new Error('db-failed'),
            onupgradeneeded: null,
            onsuccess: null,
            onerror: null,
          };
          queueMicrotask(() => {
            if (typeof request.onerror === 'function') {
              request.onerror();
            }
          });
          return request;
        }),
      },
    });

    await SecureAppSettings.initialize();

    expect(SecureAppSettings.getSecurityModeProfile()).toBe('strict');
    expect(SecureAppSettings.getThemeMode()).toBe('dark');
  });

  it('stores release trust checklist, approvals and history defensively', () => {
    SecureAppSettings.setReleaseTrustChecklist({
      "releaseTrustPackageChecklist.external_audit.manifest": "2026-03-23T20:00:00.000Z",
    });
    SecureAppSettings.setReleaseTrustApprovals({
      external_audit_packet: "2026-03-23T20:05:00.000Z",
    });
    SecureAppSettings.setReleaseTrustHistory([
      {
        id: "rt-history-1",
        at: "2026-03-23T20:05:00.000Z",
        action: "owner_approved",
        targetId: "external_audit_packet",
        title: "External audit packet",
      },
    ]);

    const checklist = SecureAppSettings.getReleaseTrustChecklist();
    const approvals = SecureAppSettings.getReleaseTrustApprovals();
    const history = SecureAppSettings.getReleaseTrustHistory();

    checklist["releaseTrustPackageChecklist.external_audit.manifest"] = "mutated";
    approvals.external_audit_packet = "mutated";
    history[0].title = "mutated";

    expect(
      SecureAppSettings.getReleaseTrustChecklist()["releaseTrustPackageChecklist.external_audit.manifest"]
    ).toBe("2026-03-23T20:00:00.000Z");
    expect(SecureAppSettings.getReleaseTrustApprovals().external_audit_packet).toBe(
      "2026-03-23T20:05:00.000Z"
    );
    expect(SecureAppSettings.getReleaseTrustHistory()[0]?.title).toBe("External audit packet");
  });
});
