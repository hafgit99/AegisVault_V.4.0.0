/**
 * useVaultData — Vault CRUD + Filtreleme + Sıralama Hook'u
 *
 * VaultContext'ten ayrıştırılan ilk özel hook.
 * Tüm veri yükleme, arama, sıralama, CRUD işlemlerini kapsar.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { vaultService, type VaultEntry } from '../vaultService';
import { VaultSharingLinkService } from '../lib/VaultSharingLinkService';
import { SecureAppSettings } from '../lib/SecureAppSettings';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';

export type SortOption = 'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc';
export type SearchScope = 'all' | 'title' | 'username' | 'tags';
export type ViewDensity = 'comfortable' | 'compact';

export function useVaultData() {
  const { t } = useTranslation();

  // ─── Core State ───
  const [passwords, setPasswords] = useState<VaultEntry[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const [viewDensity, setViewDensity] = useState<ViewDensity>(() => {
    return SecureAppSettings.getViewDensity();
  });
  const [sortOption, setSortOption] = useState<SortOption>('updated_desc');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());
  const [visibleCount, setVisibleCount] = useState(20);

  // ─── Set referansı (stale closure önleme) ───
  const passwordsRef = useRef<VaultEntry[]>(passwords);
  passwordsRef.current = passwords;

  // ─── 300ms Debounce Search ───
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ─── View Density Persist ───
  useEffect(() => {
    SecureAppSettings.setViewDensity(viewDensity);
  }, [viewDensity]);

  // ─── Veri Yükleme ───
  const loadPasswords = useCallback(() => {
    setIsDecrypting(true);
    const isTrash = categoryFilter === 'Trash';
    vaultService
      .getPasswords(debouncedSearch, categoryFilter, isTrash, searchScope)
      .then((data) => {
        const hydratedData = VaultSharingLinkService.hydrateEntries(data);
        const sortedData = [...hydratedData].sort((a, b) => {
          if (sortOption === 'title_asc') {
            return (a.title || '').localeCompare(b.title || '', undefined, {
              sensitivity: 'base',
              numeric: true,
            });
          }
          if (sortOption === 'title_desc') {
            return (b.title || '').localeCompare(a.title || '', undefined, {
              sensitivity: 'base',
              numeric: true,
            });
          }

          const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          if (sortOption === 'updated_asc') {
            return aTime - bTime;
          }
          return bTime - aTime;
        });

        setPasswords(sortedData);
        setVisibleCount(20);
        setIsDecrypting(false);
      });
  }, [debouncedSearch, categoryFilter, sortOption, searchScope]);

  // İlk yükleme + filtre/arama değişikliği
  useEffect(() => {
    loadPasswords();
  }, [loadPasswords]);

  // ─── Toggles ───
  const toggleVisibility = useCallback((id: number) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ─── CRUD ───
  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : String(error);

  const handleCreateEntry = useCallback(
    async (entry: Partial<VaultEntry>, attachments: File[]) => {
      if (!entry.title || !entry.pass) {
        toast.error(t('titleAndPassRequired'));
        return;
      }

      const cleanEntry = {
        ...entry,
        title: DOMPurify.sanitize(entry.title),
        username: DOMPurify.sanitize(entry.username || ''),
        website: DOMPurify.sanitize(entry.website || ''),
        category: DOMPurify.sanitize(entry.category || 'General'),
        tags: entry.tags?.map((tg) => DOMPurify.sanitize(tg)) || [],
        cardDetails: entry.cardDetails
          ? {
              cardholder_name: DOMPurify.sanitize(entry.cardDetails.cardholder_name || ''),
              card_number: DOMPurify.sanitize(entry.cardDetails.card_number || ''),
              brand: DOMPurify.sanitize(entry.cardDetails.brand || ''),
              expiry_month: DOMPurify.sanitize(entry.cardDetails.expiry_month || ''),
              expiry_year: DOMPurify.sanitize(entry.cardDetails.expiry_year || ''),
              cvv: DOMPurify.sanitize(entry.cardDetails.cvv || ''),
              pin: DOMPurify.sanitize(entry.cardDetails.pin || ''),
              billing_zip: DOMPurify.sanitize(entry.cardDetails.billing_zip || ''),
              billing_address: DOMPurify.sanitize(entry.cardDetails.billing_address || ''),
            }
          : undefined,
        identityDetails: entry.identityDetails
          ? {
              document_type: DOMPurify.sanitize(entry.identityDetails.document_type || ''),
              identity_number: DOMPurify.sanitize(entry.identityDetails.identity_number || ''),
              issuing_country: DOMPurify.sanitize(entry.identityDetails.issuing_country || ''),
              nationality: DOMPurify.sanitize(entry.identityDetails.nationality || ''),
              date_of_birth: DOMPurify.sanitize(entry.identityDetails.date_of_birth || ''),
              issued_at: DOMPurify.sanitize(entry.identityDetails.issued_at || ''),
              expires_at: DOMPurify.sanitize(entry.identityDetails.expires_at || ''),
            }
          : undefined,
        aliasDetails: entry.aliasDetails
          ? {
              providerId: DOMPurify.sanitize(entry.aliasDetails.providerId || ''),
              providerLabel: DOMPurify.sanitize(entry.aliasDetails.providerLabel || ''),
              email: DOMPurify.sanitize(entry.aliasDetails.email || ''),
              website: DOMPurify.sanitize(entry.aliasDetails.website || ''),
              notes: DOMPurify.sanitize(entry.aliasDetails.notes || ''),
              forwardTo: DOMPurify.sanitize(entry.aliasDetails.forwardTo || ''),
              status: entry.aliasDetails.status || 'active',
              exposureCategory: entry.aliasDetails.exposureCategory || 'none',
              exposureCount: Number(entry.aliasDetails.exposureCount || 0),
              createdAt: DOMPurify.sanitize(entry.aliasDetails.createdAt || ''),
              updatedAt: DOMPurify.sanitize(entry.aliasDetails.updatedAt || ''),
              lastUsedAt: DOMPurify.sanitize(entry.aliasDetails.lastUsedAt || ''),
              lastRotatedAt: DOMPurify.sanitize(entry.aliasDetails.lastRotatedAt || ''),
              linkedEntryId: entry.aliasDetails.linkedEntryId,
              providerAliasId: DOMPurify.sanitize(entry.aliasDetails.providerAliasId || ''),
              providerSyncStatus: entry.aliasDetails.providerSyncStatus || 'manual',
              providerManagementUrl: DOMPurify.sanitize(
                entry.aliasDetails.providerManagementUrl || ''
              ),
              watchtowerScore: Number(entry.aliasDetails.watchtowerScore || 0),
              watchtowerState: entry.aliasDetails.watchtowerState || 'healthy',
              history: Array.isArray(entry.aliasDetails.history)
                ? entry.aliasDetails.history.map((item) => ({
                    id: DOMPurify.sanitize(item.id || ''),
                    at: DOMPurify.sanitize(item.at || ''),
                    type: item.type || 'created',
                    email: DOMPurify.sanitize(item.email || ''),
                    providerAliasId: DOMPurify.sanitize(item.providerAliasId || ''),
                    reason: DOMPurify.sanitize(item.reason || ''),
                  }))
                : [],
              rotationQueue: Array.isArray(entry.aliasDetails.rotationQueue)
                ? entry.aliasDetails.rotationQueue.map((item) => ({
                    id: DOMPurify.sanitize(item.id || ''),
                    requestedAt: DOMPurify.sanitize(item.requestedAt || ''),
                    reason: item.reason || 'manual',
                    status: item.status || 'queued',
                    candidateEmail: DOMPurify.sanitize(item.candidateEmail || ''),
                  }))
                : [],
            }
          : undefined,
        sharing: Array.isArray(entry.sharing)
          ? entry.sharing.map((assignment) => ({
              ...assignment,
              space_id: DOMPurify.sanitize(assignment.space_id),
              shared_by: assignment.shared_by
                ? DOMPurify.sanitize(assignment.shared_by)
                : undefined,
              notes: assignment.notes ? DOMPurify.sanitize(assignment.notes) : undefined,
            }))
          : undefined,
      };

      const newId = await vaultService.addPassword(cleanEntry);

      if (newId) {
        if (Array.isArray(cleanEntry.sharing) && cleanEntry.sharing.length > 0) {
          VaultSharingLinkService.setAssignmentsForEntry(newId as number, cleanEntry.sharing);
        } else {
          VaultSharingLinkService.clearAssignmentsForEntry(newId as number);
        }
      }

      if (attachments.length > 0 && newId) {
        toast.info(t('uploadingAttachments'));
        for (const file of attachments) {
          try {
            await vaultService.addAttachment(newId as number, file);
          } catch (error: unknown) {
            toast.error(`Failed to attach ${file.name}: ${getErrorMessage(error)}`);
          }
        }
      }

      loadPasswords();
    },
    [loadPasswords, t]
  );

  const handleDeleteEntry = useCallback(
    async (id: number) => {
      try {
        await vaultService.moveToTrash(id);
        toast.success(t('itemMovedToTrash'));
        loadPasswords();
      } catch (error: unknown) {
        toast.error(`Trash failed: ${getErrorMessage(error)}`);
      }
    },
    [loadPasswords, t]
  );

  const handleRestoreEntry = useCallback(
    async (id: number) => {
      try {
        await vaultService.restoreFromTrash(id);
        toast.success(t('itemRestored'));
        loadPasswords();
      } catch (error: unknown) {
        toast.error(`Restore failed: ${getErrorMessage(error)}`);
      }
    },
    [loadPasswords, t]
  );

  const handleEmptyTrash = useCallback(async () => {
    try {
      await vaultService.emptyTrash();
      toast.success(t('trashEmptied'));
      loadPasswords();
    } catch (error: unknown) {
      toast.error(`Empty trash failed: ${getErrorMessage(error)}`);
    }
  }, [loadPasswords, t]);

  const handleToggleFavorite = useCallback(
    async (id: number, favorite: boolean) => {
      const previousPasswords = passwordsRef.current;
      const nextPasswords = previousPasswords.map((entry) =>
        entry.id === id ? { ...entry, favorite } : entry
      );
      passwordsRef.current = nextPasswords;
      setPasswords(nextPasswords);

      try {
        await vaultService.setFavorite(id, favorite);
        toast.success(favorite ? t('favoriteAdded') : t('favoriteRemoved'));
      } catch (error: unknown) {
        passwordsRef.current = previousPasswords;
        setPasswords(previousPasswords);
        toast.error(`Favorite update failed: ${getErrorMessage(error)}`);
      }
    },
    [t]
  );

  // ─── Tags ───
  const uniqueTags = (() => {
    const set = new Set<string>();
    passwords.forEach((p) => p.tags?.forEach((tg) => set.add(tg)));
    return Array.from(set);
  })();

  return {
    // Veri
    passwords,
    setPasswords,
    passwordsRef,
    isDecrypting,
    searchQuery,
    setSearchQuery,
    searchScope,
    setSearchScope,
    viewDensity,
    setViewDensity,
    sortOption,
    setSortOption,
    categoryFilter,
    setCategoryFilter,
    visiblePasswords,
    setVisiblePasswords,
    toggleVisibility,
    visibleCount,
    setVisibleCount,
    uniqueTags,
    // CRUD
    loadPasswords,
    handleCreateEntry,
    handleDeleteEntry,
    handleRestoreEntry,
    handleEmptyTrash,
    handleToggleFavorite,
  };
}
