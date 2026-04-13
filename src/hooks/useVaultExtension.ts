/**
 * useVaultExtension — Electron Extension Bridge Hook
 *
 * VaultContext.tsx'teki ~200 satırlık inline extension sync
 * kodunu izole eder. Provider artık sadece bu hook'u çağırır.
 *
 * Sorumluluklar:
 *   - Domain bazlı credential sağlayıcı kaydı
 *   - Passkey provider ve auth handler kaydı
 *   - Autosave credential handler
 *   - CLI operasyon handler
 *   - Cleanup (unmount)
 */
import { useEffect, type DependencyList } from 'react';
import { vaultService, type VaultEntry } from '../vaultService';
import { WebAuthnService } from '../lib/WebAuthnService';
import type { SitePasskeyAuthResult, SitePasskeyAuthOptions } from '../lib/WebAuthnService';
import type { CanonicalPasskeyFields } from '../lib/canonical-schema';
import { AliasProviderService } from '../lib/AliasProviderService';

// ─── Types ───────────────────────────────────────────────────────

type DomainCredential = Pick<
  VaultEntry,
  'title' | 'username' | 'pass' | 'website' | 'category' | 'cardDetails' | 'identityDetails'
>;

type AutosaveCredentialCandidate = {
  title?: string;
  username?: string;
  pass?: string;
  website?: string;
  submittedAt?: string;
  source?: string;
};

type VaultCliOperationPayload = Record<string, unknown>;
type VaultCliHandler = (
  operation: string,
  payload?: VaultCliOperationPayload
) => Promise<{ ok: boolean; error?: string; data?: unknown }>;

type DomainPasskeyInfo = {
  title: string;
  username: string;
  website: string;
  passkeyMetadata?: CanonicalPasskeyFields | null;
};

import DOMPurify from 'dompurify';

type ElectronVaultState = {
  unlocked: boolean;
  entryCount: number;
};

type ElectronBridgeApi = {
  syncVaultState?: (state: ElectronVaultState) => void;
  setDomainCredentialProvider?: (provider: ((domain: string) => DomainCredential[]) | null) => void;
  setDomainPasskeyProvider?: (provider: ((domain: string) => DomainPasskeyInfo[]) | null) => void;
  setPasskeyAuthHandler?: (
    handler: ((options: SitePasskeyAuthOptions) => Promise<SitePasskeyAuthResult | null>) | null
  ) => void;
  setAutosaveCredentialHandler?: (
    handler:
      | ((
          credential: AutosaveCredentialCandidate
        ) => Promise<{ saved: boolean; action?: string; entryId?: number; error?: string }>)
      | null
  ) => void;
  setVaultCliHandler?: (handler: VaultCliHandler | null) => void;
  lockVault?: () => void;
};

type WindowWithAegisElectron = Window &
  typeof globalThis & {
    aegisElectron?: ElectronBridgeApi;
  };

// ─── Yardımcı fonksiyonlar ────────────────────────────────────────

const normalizeDomain = (input: string): string => {
  try {
    const parsed = input.includes('://') ? new URL(input) : new URL(`https://${input}`);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return (input || '')
      .toLowerCase()
      .replace(/^www\./, '')
      .trim();
  }
};

const isDomainMatch = (entryWebsite: string, requestedDomain: string): boolean => {
  const entryDomain = normalizeDomain(entryWebsite);
  const wanted = normalizeDomain(requestedDomain);
  if (!entryDomain || !wanted) return false;
  return (
    entryDomain === wanted ||
    entryDomain.endsWith(`.${wanted}`) ||
    wanted.endsWith(`.${entryDomain}`)
  );
};

const sanitizeCliEntry = (entry: Partial<VaultEntry>) => ({
  id: Number(entry.id),
  title: DOMPurify.sanitize(String(entry.title || '')).slice(0, 256),
  username: DOMPurify.sanitize(String(entry.username || '')).slice(0, 256),
  pass: String(entry.pass || '').slice(0, 1024),
  website: DOMPurify.sanitize(String(entry.website || '')).slice(0, 512),
  category: DOMPurify.sanitize(String(entry.category || 'General')).slice(0, 64),
  tags: Array.isArray(entry.tags)
    ? entry.tags.slice(0, 32).map((tag) => DOMPurify.sanitize(String(tag || '')).slice(0, 64))
    : [],
  updated_at: String(entry.updated_at || ''),
  deletedAt: typeof entry.deletedAt === 'string' ? entry.deletedAt : undefined,
});

const findEntryById = async (entryId: number): Promise<VaultEntry | null> => {
  if (!Number.isFinite(entryId)) return null;
  const active = await vaultService.getPasswords('', '', false, 'all');
  const inActive = active.find((item) => Number(item.id) === entryId);
  if (inActive) return inActive;
  const trash = await vaultService.getPasswords('', '', true, 'all');
  return trash.find((item) => Number(item.id) === entryId) || null;
};

// ─── Hook ─────────────────────────────────────────────────────────

interface UseVaultExtensionOptions {
  passwords: VaultEntry[];
  loadPasswords: () => void;
  getElectronApi: () => unknown;
}

export function useVaultExtension({ passwords, loadPasswords }: UseVaultExtensionOptions): void {
  useEffect(() => {
    // ─── Domain Credential Provider ──────────────────────────
    const getMatchesForDomain = (domain: string) => {
      const normalizedDomain = normalizeDomain(domain);
      if (!normalizedDomain) return [];
      return passwords
        .filter((p) => p.pass && p.website && isDomainMatch(p.website, normalizedDomain))
        .slice(0, 5)
        .map((p) => ({
          title: p.title,
          username: p.username,
          pass: p.pass,
          website: p.website,
          category: p.category,
          cardDetails: p.cardDetails,
          identityDetails: p.identityDetails,
        }));
    };

    // ─── Domain Passkey Provider ─────────────────────────────
    const getPasskeysForDomain = (domain: string) => {
      const normalizedDomain = normalizeDomain(domain);
      if (!normalizedDomain) return [];
      return passwords
        .filter((p) => p.website && isDomainMatch(p.website, normalizedDomain) && p.passkeyMetadata)
        .slice(0, 5)
        .map((p) => ({
          title: p.title,
          username: p.username,
          website: p.website,
          passkeyMetadata: p.passkeyMetadata,
        }));
    };

    // ─── Passkey Auth Handler ────────────────────────────────
    const handlePasskeyAuthRequest = async (options: SitePasskeyAuthOptions) => {
      if (passwords.length === 0) throw new Error('VAULT_LOCKED');
      return await WebAuthnService.authenticateSitePasskey(options);
    };

    // ─── Autosave Credential Handler ─────────────────────────
    const handleAutosaveCredential = async (candidate: AutosaveCredentialCandidate) => {
      const website = DOMPurify.sanitize(candidate?.website || '').trim();
      const pass = String(candidate?.pass || '');
      const username = DOMPurify.sanitize(candidate?.username || '').trim();
      const title = DOMPurify.sanitize(candidate?.title || '').trim();

      if (!website || !pass) {
        return { saved: false, action: 'rejected', error: 'INVALID_CREDENTIAL' };
      }
      if (passwords.length === 0) {
        return { saved: false, action: 'rejected', error: 'VAULT_LOCKED' };
      }

      const normalizedDomain = normalizeDomain(website);
      const normalizedUsername = username.toLowerCase();
      const existingForSite = passwords.filter((entry) => {
        if (!entry.website) return false;
        if (!isDomainMatch(entry.website, normalizedDomain)) return false;
        const entryUsername = (entry.username || '').toLowerCase().trim();
        return normalizedUsername ? entryUsername === normalizedUsername : true;
      });

      const exactDuplicate = existingForSite.find((entry) => entry.pass === pass);
      if (exactDuplicate) {
        return {
          saved: false,
          action: 'duplicate',
          entryId: Number.isFinite(Number(exactDuplicate.id))
            ? Number(exactDuplicate.id)
            : undefined,
        };
      }

      const updateTarget = existingForSite.find((entry) => Number.isFinite(Number(entry.id)));
      if (updateTarget && Number.isFinite(Number(updateTarget.id))) {
        const updateId = Number(updateTarget.id);
        await vaultService.updatePassword(updateId, {
          ...updateTarget,
          title: title || updateTarget.title || normalizedDomain,
          username: username || updateTarget.username || '',
          pass,
          website,
        });
        loadPasswords();
        return { saved: true, action: 'updated', entryId: updateId };
      }

      const newId = await vaultService.addPassword({
        title: title || normalizedDomain,
        username,
        pass,
        website,
        category: 'General',
      });
      loadPasswords();
      return {
        saved: true,
        action: 'created',
        entryId: Number.isFinite(Number(newId)) ? Number(newId) : undefined,
      };
    };

    // ─── CLI Handler ─────────────────────────────────────────
    const handleVaultCliOperation: VaultCliHandler = async (operation, payload = {}) => {
      const normalizedOp = String(operation || '')
        .trim()
        .toLowerCase();

      if (normalizedOp === 'list') {
        const query = typeof payload.query === 'string' ? payload.query : '';
        const category = typeof payload.category === 'string' ? payload.category : '';
        const scope = payload.scope === 'trash' ? 'trash' : 'active';
        const cliSearchScope = ((): 'all' | 'title' | 'username' | 'tags' => {
          const candidate = typeof payload.searchScope === 'string' ? payload.searchScope : 'all';
          return ['all', 'title', 'username', 'tags'].includes(candidate)
            ? (candidate as 'all' | 'title' | 'username' | 'tags')
            : 'all';
        })();
        const limitRaw = Number(payload.limit);
        const limit = Number.isFinite(limitRaw)
          ? Math.min(200, Math.max(1, Math.trunc(limitRaw)))
          : 50;
        const entries = await vaultService.getPasswords(
          query,
          category,
          scope === 'trash',
          cliSearchScope
        );
        return {
          ok: true,
          data: entries.slice(0, limit).map((entry) => sanitizeCliEntry(entry)),
        };
      }

      if (normalizedOp === 'get') {
        const entryId = Number(payload.entryId);
        if (!Number.isFinite(entryId)) return { ok: false, error: 'INVALID_ENTRY_ID' };
        const found = await findEntryById(entryId);
        if (!found) return { ok: false, error: 'ENTRY_NOT_FOUND' };
        return { ok: true, data: sanitizeCliEntry(found) };
      }

      if (normalizedOp === 'generate-alias') {
        const website =
          typeof payload.website === 'string'
            ? payload.website
            : typeof payload.domain === 'string'
              ? `https://${payload.domain}`
              : '';
        const title =
          typeof payload.title === 'string' && payload.title.trim()
            ? payload.title.trim()
            : typeof payload.domain === 'string'
              ? payload.domain
              : 'Alias';
        const aliasSeed = AliasProviderService.createAliasDetails({
          website,
          title,
          notes: 'Browser extension requested alias generation',
        });
        const provisioned = await AliasProviderService.provisionAlias({
          providerId: aliasSeed.providerId,
          website,
          title,
          notes: 'Browser extension requested alias generation',
        });
        return {
          ok: true,
          data: {
            alias: provisioned.email,
            providerId: provisioned.provider?.id || aliasSeed.providerId,
            providerLabel: provisioned.provider?.name || aliasSeed.providerLabel,
            providerAliasId: provisioned.providerAliasId,
            providerSyncStatus: provisioned.providerSyncStatus,
            providerManagementUrl:
              provisioned.providerManagementUrl ||
              AliasProviderService.buildManagementUrl(aliasSeed, provisioned.provider),
          },
        };
      }

      if (normalizedOp === 'create') {
        const rawEntry =
          payload.entry && typeof payload.entry === 'object'
            ? (payload.entry as Partial<VaultEntry>)
            : null;
        if (!rawEntry) return { ok: false, error: 'INVALID_ENTRY_PAYLOAD' };
        const cliTitle = DOMPurify.sanitize(String(rawEntry.title || '')).slice(0, 256);
        const cliPass = String(rawEntry.pass || '').slice(0, 1024);
        if (!cliTitle || !cliPass) return { ok: false, error: 'TITLE_AND_PASSWORD_REQUIRED' };
        const entryToCreate: Partial<VaultEntry> = {
          title: cliTitle,
          username: DOMPurify.sanitize(String(rawEntry.username || '')).slice(0, 256),
          pass: cliPass,
          website: DOMPurify.sanitize(String(rawEntry.website || '')).slice(0, 512),
          category: DOMPurify.sanitize(String(rawEntry.category || 'General')).slice(0, 64),
          tags: Array.isArray(rawEntry.tags)
            ? rawEntry.tags
                .slice(0, 32)
                .map((tag) => DOMPurify.sanitize(String(tag || '')).slice(0, 64))
            : [],
        };
        const newId = await vaultService.addPassword(entryToCreate);
        loadPasswords();
        const created = await findEntryById(Number(newId));
        return { ok: true, data: created ? sanitizeCliEntry(created) : { id: Number(newId) } };
      }

      if (normalizedOp === 'update') {
        const entryId = Number(payload.entryId);
        const rawEntry =
          payload.entry && typeof payload.entry === 'object'
            ? (payload.entry as Partial<VaultEntry>)
            : null;
        if (!Number.isFinite(entryId) || !rawEntry)
          return { ok: false, error: 'INVALID_ENTRY_PAYLOAD' };
        const existing = await findEntryById(entryId);
        if (!existing) return { ok: false, error: 'ENTRY_NOT_FOUND' };

        const merged: Partial<VaultEntry> = {
          ...existing,
          ...rawEntry,
          title: DOMPurify.sanitize(String(rawEntry.title ?? existing.title ?? '')).slice(0, 256),
          username: DOMPurify.sanitize(String(rawEntry.username ?? existing.username ?? '')).slice(
            0,
            256
          ),
          website: DOMPurify.sanitize(String(rawEntry.website ?? existing.website ?? '')).slice(
            0,
            512
          ),
          category: DOMPurify.sanitize(
            String(rawEntry.category ?? existing.category ?? 'General')
          ).slice(0, 64),
          pass: String(rawEntry.pass ?? existing.pass ?? '').slice(0, 1024),
          tags: Array.isArray(rawEntry.tags)
            ? rawEntry.tags
                .slice(0, 32)
                .map((tag) => DOMPurify.sanitize(String(tag || '')).slice(0, 64))
            : existing.tags || [],
        };
        if (!merged.title || !merged.pass)
          return { ok: false, error: 'TITLE_AND_PASSWORD_REQUIRED' };
        await vaultService.updatePassword(entryId, merged);
        loadPasswords();
        const updated = await findEntryById(entryId);
        return { ok: true, data: updated ? sanitizeCliEntry(updated) : { id: entryId } };
      }

      if (normalizedOp === 'delete') {
        const entryId = Number(payload.entryId);
        if (!Number.isFinite(entryId)) return { ok: false, error: 'INVALID_ENTRY_ID' };
        await vaultService.moveToTrash(entryId);
        loadPasswords();
        return { ok: true, data: { id: entryId, deleted: true } };
      }

      if (normalizedOp === 'restore') {
        const entryId = Number(payload.entryId);
        if (!Number.isFinite(entryId)) return { ok: false, error: 'INVALID_ENTRY_ID' };
        await vaultService.restoreFromTrash(entryId);
        loadPasswords();
        return { ok: true, data: { id: entryId, restored: true } };
      }

      if (normalizedOp === 'empty-trash') {
        await vaultService.emptyTrash();
        loadPasswords();
        return { ok: true, data: { emptied: true } };
      }

      return { ok: false, error: 'UNSUPPORTED_OPERATION' };
    };

    // ─── Electron Bridge Kaydı ───────────────────────────────
    try {
      const electronApi = (window as WindowWithAegisElectron).aegisElectron;
      if (electronApi?.syncVaultState) {
        electronApi.syncVaultState({
          unlocked: true,
          entryCount: passwords.filter((p) => Boolean(p.pass && p.website && p.website.trim()))
            .length,
        });
      }
      if (electronApi?.setDomainCredentialProvider) {
        electronApi.setDomainCredentialProvider((domain: string) => getMatchesForDomain(domain));
      }
      if (electronApi?.setDomainPasskeyProvider) {
        electronApi.setDomainPasskeyProvider((domain: string) => getPasskeysForDomain(domain));
      }
      if (electronApi?.setPasskeyAuthHandler) {
        electronApi.setPasskeyAuthHandler(handlePasskeyAuthRequest);
      }
      if (electronApi?.setAutosaveCredentialHandler) {
        electronApi.setAutosaveCredentialHandler(handleAutosaveCredential);
      }
      if (electronApi?.setVaultCliHandler) {
        electronApi.setVaultCliHandler(handleVaultCliOperation);
      }
    } catch {
      // Electron bridge bu ortamda mevcut olmayabilir
    }

    // ─── Cleanup ─────────────────────────────────────────────
    return () => {
      try {
        const electronApi = (window as WindowWithAegisElectron).aegisElectron;
        if (electronApi?.setDomainCredentialProvider) {
          electronApi.setDomainCredentialProvider(null);
        }
        if (electronApi?.setDomainPasskeyProvider) {
          electronApi.setDomainPasskeyProvider(null);
        }
        if (electronApi?.setPasskeyAuthHandler) {
          electronApi.setPasskeyAuthHandler(null);
        }
        if (electronApi?.setAutosaveCredentialHandler) {
          electronApi.setAutosaveCredentialHandler(null);
        }
        if (electronApi?.setVaultCliHandler) {
          electronApi.setVaultCliHandler(null);
        }
      } catch {
        // cleanup hatası ana akış için kritik değil
      }
    };
  }, [passwords, loadPasswords]);
}
