// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Plus, ShieldAlert, Trash2, Users, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import type {
  CanonicalSharedMember,
  CanonicalSharedMemberStatus,
  CanonicalSharedRole,
  CanonicalSharedSpace,
  CanonicalSharedSpaceKind,
} from '../../lib/canonical-schema';
import { SharedSpaceService } from '../../lib/SharedSpaceService';
import { SharingOverviewService } from '../../lib/SharingOverviewService';
import { useVault } from '../../contexts/VaultContext';

interface SharedSpacesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSpaceId?: string | null;
  focusContext?: 'audit' | 'issue' | null;
}

const KIND_OPTIONS: CanonicalSharedSpaceKind[] = ['family', 'team', 'private'];
const ROLE_OPTIONS: Exclude<CanonicalSharedRole, 'owner'>[] = ['viewer', 'editor', 'admin'];
const MEMBER_ROLE_OPTIONS: CanonicalSharedRole[] = ['viewer', 'editor', 'admin'];
const STATUS_OPTIONS: CanonicalSharedMemberStatus[] = ['active', 'pending', 'emergency_only'];

type DraftSpace = Partial<CanonicalSharedSpace>;
type DraftMember = Partial<CanonicalSharedMember>;

const createEmptyDraftSpace = (): DraftSpace => ({
  kind: 'family',
  default_role: 'viewer',
  allow_export: true,
  require_review: true,
  members: [],
});

export function SharedSpacesModal({
  isOpen,
  onClose,
  initialSpaceId = null,
  focusContext = null,
}: SharedSpacesModalProps) {
  const { t } = useTranslation();
  const { passwords } = useVault();
  const [spaces, setSpaces] = useState<CanonicalSharedSpace[]>([]);
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [draftSpace, setDraftSpace] = useState<DraftSpace>(createEmptyDraftSpace());
  const [draftMember, setDraftMember] = useState<DraftMember>({
    role: 'viewer',
    status: 'active',
  });
  const [pulseFocus, setPulseFocus] = useState(false);
  const [createModeHighlight, setCreateModeHighlight] = useState(false);
  const [createModeTick, setCreateModeTick] = useState(0);
  const spaceButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const formScrollRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const report = useMemo(() => SharingOverviewService.buildReport(passwords), [passwords]);

  const refreshSpaces = () => {
    setSpaces(SharedSpaceService.listSpaces());
  };

  const beginEdit = (space?: CanonicalSharedSpace) => {
    if (!space) {
      setEditingSpaceId(null);
      setDraftSpace(createEmptyDraftSpace());
      setDraftMember({ role: 'viewer', status: 'active' });
      setCreateModeHighlight(true);
      setCreateModeTick((current) => current + 1);
      return;
    }

    setCreateModeHighlight(false);
    setEditingSpaceId(space.id);
    setDraftSpace({
      ...space,
      members: space.members.map((member) => ({ ...member })),
    });
    setDraftMember({
      role: space.default_role,
      status: 'active',
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    refreshSpaces();
    const targetSpace = initialSpaceId
      ? SharedSpaceService.listSpaces().find((space) => space.id === initialSpaceId)
      : undefined;
    beginEdit(targetSpace);
  }, [initialSpaceId, isOpen]);

  useEffect(() => {
    if (!isOpen || !initialSpaceId) {
      setPulseFocus(false);
      return;
    }
    setPulseFocus(true);
    const timer = window.setTimeout(() => setPulseFocus(false), 1800);
    return () => window.clearTimeout(timer);
  }, [initialSpaceId, isOpen]);

  useEffect(() => {
    if (!isOpen || !initialSpaceId) return;
    const targetNode = spaceButtonRefs.current[initialSpaceId];
    if (!targetNode) return;
    targetNode.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });
  }, [initialSpaceId, isOpen, spaces]);

  useEffect(() => {
    if (!isOpen || editingSpaceId !== null) return;
    formScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    const timer = window.setTimeout(() => nameInputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [createModeTick, editingSpaceId, isOpen]);

  useEffect(() => {
    if (!isOpen || !createModeHighlight) return;
    const timer = window.setTimeout(() => setCreateModeHighlight(false), 2200);
    return () => window.clearTimeout(timer);
  }, [createModeHighlight, isOpen]);

  const addMember = () => {
    if (!(draftMember.name || '').trim() && !(draftMember.email || '').trim()) {
      toast.info(t('sharedSpacesMemberRequired'));
      return;
    }

    const nextMember: CanonicalSharedMember = {
      id: draftMember.id || crypto.randomUUID(),
      name: (draftMember.name || '').trim(),
      email: (draftMember.email || '').trim(),
      role: (draftMember.role || 'viewer') as CanonicalSharedRole,
      status: (draftMember.status || 'active') as CanonicalSharedMemberStatus,
      device_label: (draftMember.device_label || '').trim() || undefined,
      notes: (draftMember.notes || '').trim() || undefined,
      last_verified_at: new Date().toISOString(),
    };

    setDraftSpace((current) => ({
      ...current,
      members: [...(current.members || []), nextMember],
    }));
    setDraftMember({
      role: draftSpace.default_role || 'viewer',
      status: 'active',
    });
  };

  const removeMember = (memberId: string) => {
    setDraftSpace((current) => ({
      ...current,
      members: (current.members || []).filter((member) => member.id !== memberId),
    }));
  };

  const updateMemberStatus = (memberId: string, status: CanonicalSharedMemberStatus) => {
    setDraftSpace((current) => ({
      ...current,
      members: (current.members || []).map((member) =>
        member.id === memberId
          ? {
              ...member,
              status,
              last_verified_at: new Date().toISOString(),
            }
          : member
      ),
    }));
  };

  const saveSpace = () => {
    const saved = SharedSpaceService.saveSpace({
      ...draftSpace,
      id: editingSpaceId || draftSpace.id,
      members: draftSpace.members || [],
    });

    if (!saved) {
      toast.error(t('sharedSpacesSaveFailed'));
      return;
    }

    refreshSpaces();
    setEditingSpaceId(saved.id);
    beginEdit(saved);
    toast.success(t('sharedSpacesSaved'));
  };

  const deleteSpace = (spaceId: string) => {
    const confirmed = window.confirm(t('sharedSpacesDeleteConfirm'));
    if (!confirmed) return;

    const deleted = SharedSpaceService.deleteSpace(spaceId);
    if (!deleted) {
      toast.error(t('sharedSpacesDeleteFailed'));
      return;
    }

    refreshSpaces();
    if (editingSpaceId === spaceId) {
      beginEdit();
    }
    toast.success(t('sharedSpacesDeleted'));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-[var(--color-deep-navy)]/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="settings-drawer-surface relative z-10 flex h-[min(94vh,980px)] w-full max-w-6xl flex-col overflow-hidden rounded-[2.25rem] border border-white/20 shadow-2xl lg:flex-row">
        <div className="sr-only" aria-live="polite">
          {initialSpaceId && editingSpaceId === initialSpaceId
            ? t('sharedSpacesLiveFocus', {
                target: draftSpace.name || t('sharedSpacesTitle'),
              })
            : ''}
        </div>
        <aside className="overflow-y-auto border-b border-white/10 bg-gradient-to-br from-[#789072] via-[#6f866b] to-[#5f745e] p-5 text-white lg:w-[290px] lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/12 backdrop-blur-sm">
                <Users className="h-6 w-6" />
              </div>
              <h2 className="text-[1.8rem] font-bold tracking-tight">{t('sharedSpacesTitle')}</h2>
              <p className="mt-2 max-w-sm text-sm leading-7 text-white/78">
                {t('sharedSpacesDesc')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="rounded-[1.5rem] border border-white/14 bg-white/10 p-4 backdrop-blur-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/65">
              {t('sharedSpacesHealthTitle')}
            </div>
            <div className="mt-2 text-3xl font-black">{report.score}</div>
            <p className="mt-2 text-sm leading-7 text-white/78">
              {t('sharedSpacesHealthSummary', {
                spaces: report.summary.spaces,
                items: report.summary.sharedItems,
                pending: report.summary.pendingMembers,
              })}
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {spaces.map((space) => (
              <button
                key={space.id}
                ref={(node) => {
                  spaceButtonRefs.current[space.id] = node;
                }}
                onClick={() => beginEdit(space)}
                aria-pressed={editingSpaceId === space.id}
                aria-label={t('sharedSpacesOpenAria', { target: space.name })}
                className={`w-full rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                  editingSpaceId === space.id
                    ? initialSpaceId === space.id
                      ? pulseFocus
                        ? 'border-white/45 bg-white/20 ring-2 ring-white/35 shadow-[0_0_0_10px_rgba(255,255,255,0.06)]'
                        : 'border-white/40 bg-white/20 ring-2 ring-white/30'
                      : 'border-white/30 bg-white/18'
                    : 'border-white/10 bg-white/8 hover:bg-white/14'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{space.name}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/60">
                      {t(`sharingOverviewKind.${space.kind}`)}
                    </div>
                  </div>
                  <div className="text-right text-xs text-white/75">
                    {initialSpaceId === space.id ? (
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                        {t('sharedSpacesFocusedBadge')}
                      </div>
                    ) : null}
                    <div>{t('sharedSpacesMembersCount', { count: space.members.length })}</div>
                    <div>
                      {t('sharedSpacesDefaultRole', {
                        role: t(`sharedSpacesRole.${space.default_role}`),
                      })}
                    </div>
                  </div>
                </div>
              </button>
            ))}

            <button
              onClick={() => beginEdit()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/25 px-4 py-3.5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
            >
              <Plus className="h-4 w-4" />
              {t('sharedSpacesCreateBtn')}
            </button>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="border-b border-white/8 px-5 py-4 lg:px-6">
            <div className="settings-card-surface-muted rounded-[1.5rem] border px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-sage-green)]">
                    {editingSpaceId ? t('sharedSpacesTitle') : t('sharedSpacesCreateBtn')}
                  </div>
                  <div className="text-base font-semibold text-[var(--color-deep-navy)] dark:text-white">
                    {draftSpace.name?.trim()
                      ? draftSpace.name
                      : t('sharedSpacesFieldNamePlaceholder')}
                  </div>
                  <div className="text-xs text-[var(--color-deep-navy)]/65 dark:text-white/65">
                    {t('sharedSpacesHealthSummary', {
                      spaces: report.summary.spaces,
                      items: report.summary.sharedItems,
                      pending: report.summary.pendingMembers,
                    })}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="settings-badge-muted rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em]">
                    {t(`sharingOverviewKind.${draftSpace.kind || 'family'}`)}
                  </span>
                  <span className="settings-badge-positive rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em]">
                    {t('sharedSpacesMembersCount', { count: draftSpace.members?.length || 0 })}
                  </span>
                </div>
              </div>
            </div>

            {initialSpaceId && editingSpaceId === initialSpaceId ? (
              <div
                className={`mt-4 rounded-[1.5rem] border border-[var(--color-sage-green)]/20 bg-[var(--color-sage-green)]/10 px-5 py-4 text-sm text-[var(--color-deep-navy)] dark:border-[var(--color-sage-green)]/25 dark:bg-[var(--color-sage-green)]/10 dark:text-white ${pulseFocus ? 'shadow-[0_0_0_10px_rgba(117,141,114,0.08)]' : ''}`}
              >
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-sage-green)]">
                  {focusContext === 'audit'
                    ? t('sharedSpacesFocusAuditTitle')
                    : t('sharedSpacesFocusIssueTitle')}
                </div>
                <div className="mt-1 text-xs opacity-80">
                  {t('sharedSpacesFocusDescription', {
                    target: draftSpace.name || t('sharedSpacesTitle'),
                  })}
                </div>
                {pulseFocus ? (
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-sage-green)]/80">
                    {t('sharedSpacesFocusPulseHint')}
                  </div>
                ) : null}
              </div>
            ) : null}

            {!editingSpaceId && createModeHighlight ? (
              <div className="mt-4 rounded-[1.5rem] border border-[var(--color-sage-green)]/20 bg-[var(--color-sage-green)]/10 px-5 py-4 text-sm text-[var(--color-deep-navy)] shadow-[0_0_0_10px_rgba(117,141,114,0.08)] dark:border-[var(--color-sage-green)]/25 dark:bg-[var(--color-sage-green)]/10 dark:text-white">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-sage-green)]">
                  {t('sharedSpacesCreateReadyTitle')}
                </div>
                <div className="mt-1 text-xs opacity-80">{t('sharedSpacesCreateReadyDesc')}</div>
              </div>
            ) : null}
          </div>

          <div ref={formScrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5 lg:px-6">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-deep-navy)]/60 dark:text-white/60">
                    {t('sharedSpacesFieldName')}
                  </span>
                  <input
                    ref={nameInputRef}
                    value={draftSpace.name || ''}
                    onChange={(event) =>
                      setDraftSpace((current) => ({ ...current, name: event.target.value }))
                    }
                    className="w-full rounded-2xl border px-4 py-3 text-sm shadow-inner outline-none qr-scanner-input"
                    placeholder={t('sharedSpacesFieldNamePlaceholder')}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-deep-navy)]/60 dark:text-white/60">
                    {t('sharedSpacesFieldKind')}
                  </span>
                  <select
                    value={draftSpace.kind || 'family'}
                    onChange={(event) =>
                      setDraftSpace((current) => ({
                        ...current,
                        kind: event.target.value as CanonicalSharedSpaceKind,
                      }))
                    }
                    className="w-full rounded-2xl border px-4 py-3 text-sm shadow-inner outline-none qr-scanner-input"
                  >
                    {KIND_OPTIONS.map((kind) => (
                      <option key={kind} value={kind}>
                        {t(`sharingOverviewKind.${kind}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-deep-navy)]/60 dark:text-white/60">
                  {t('sharedSpacesFieldDescription')}
                </span>
                <textarea
                  value={draftSpace.description || ''}
                  onChange={(event) =>
                    setDraftSpace((current) => ({ ...current, description: event.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-2xl border px-4 py-3 text-sm shadow-inner outline-none qr-scanner-input"
                  placeholder={t('sharedSpacesFieldDescriptionPlaceholder')}
                />
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-deep-navy)]/60 dark:text-white/60">
                    {t('sharedSpacesFieldDefaultRole')}
                  </span>
                  <select
                    value={draftSpace.default_role || 'viewer'}
                    onChange={(event) =>
                      setDraftSpace((current) => ({
                        ...current,
                        default_role: event.target.value as Exclude<CanonicalSharedRole, 'owner'>,
                      }))
                    }
                    className="w-full rounded-2xl border px-4 py-3 text-sm shadow-inner outline-none qr-scanner-input"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {t(`sharedSpacesRole.${role}`)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="settings-card-surface-muted flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-inner">
                  <input
                    type="checkbox"
                    checked={Boolean(draftSpace.allow_export)}
                    onChange={(event) =>
                      setDraftSpace((current) => ({
                        ...current,
                        allow_export: event.target.checked,
                      }))
                    }
                  />
                  <span className="text-sm text-[var(--color-deep-navy)] dark:text-white">
                    {t('sharedSpacesAllowExport')}
                  </span>
                </label>

                <label className="settings-card-surface-muted flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-inner">
                  <input
                    type="checkbox"
                    checked={Boolean(draftSpace.require_review)}
                    onChange={(event) =>
                      setDraftSpace((current) => ({
                        ...current,
                        require_review: event.target.checked,
                      }))
                    }
                  />
                  <span className="text-sm text-[var(--color-deep-navy)] dark:text-white">
                    {t('sharedSpacesRequireReview')}
                  </span>
                </label>
              </div>

              <div className="settings-subpanel rounded-[1.5rem] border p-5 shadow-inner">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-deep-navy)] dark:text-white">
                      {t('sharedSpacesMembersTitle')}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--color-deep-navy)]/65 dark:text-white/65">
                      {t('sharedSpacesMembersDesc')}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--color-sage-green)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-sage-green)]">
                    {t('sharedSpacesMembersCount', { count: draftSpace.members?.length || 0 })}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={draftMember.name || ''}
                    onChange={(event) =>
                      setDraftMember((current) => ({ ...current, name: event.target.value }))
                    }
                    className="rounded-2xl border px-4 py-3 text-sm shadow-inner outline-none qr-scanner-input"
                    placeholder={t('sharedSpacesMemberName')}
                  />
                  <input
                    value={draftMember.email || ''}
                    onChange={(event) =>
                      setDraftMember((current) => ({ ...current, email: event.target.value }))
                    }
                    className="rounded-2xl border px-4 py-3 text-sm shadow-inner outline-none qr-scanner-input"
                    placeholder={t('sharedSpacesMemberEmail')}
                  />
                  <select
                    value={draftMember.role || 'viewer'}
                    onChange={(event) =>
                      setDraftMember((current) => ({
                        ...current,
                        role: event.target.value as CanonicalSharedRole,
                      }))
                    }
                    className="rounded-2xl border px-4 py-3 text-sm shadow-inner outline-none qr-scanner-input"
                  >
                    {MEMBER_ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {t(`sharedSpacesRole.${role}`)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={draftMember.status || 'active'}
                    onChange={(event) =>
                      setDraftMember((current) => ({
                        ...current,
                        status: event.target.value as CanonicalSharedMemberStatus,
                      }))
                    }
                    className="rounded-2xl border px-4 py-3 text-sm shadow-inner outline-none qr-scanner-input"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {t(`sharedSpacesStatus.${status}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={addMember}
                  className="settings-action-btn-primary mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-md transition-transform active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  {t('sharedSpacesAddMemberBtn')}
                </button>

                <div className="mt-4 space-y-3">
                  {(draftSpace.members || []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed px-4 py-3 text-sm text-[var(--color-deep-navy)]/60 dark:text-white/60">
                      {t('sharedSpacesMembersEmpty')}
                    </div>
                  ) : (
                    (draftSpace.members || []).map((member) => (
                      <div
                        key={member.id}
                        className="settings-card-surface rounded-2xl border px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-[var(--color-deep-navy)] dark:text-white">
                              {member.name || member.email || t('sharedSpacesUnknownMember')}
                            </div>
                            <div className="mt-1 text-xs text-[var(--color-deep-navy)]/60 dark:text-white/60">
                              {member.email || t(`sharedSpacesStatus.${member.status}`)} |{' '}
                              {t(`sharedSpacesRole.${member.role}`)}
                            </div>
                            <div className="mt-1 text-[11px] font-medium text-[var(--color-sage-green)] dark:text-[var(--color-sage-green)]">
                              {t(`sharedSpacesMemberActionHint.${member.status}`)}
                            </div>
                          </div>
                          <button
                            onClick={() => removeMember(member.id)}
                            className="rounded-full p-2 text-red-500 transition-colors hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {member.status === 'pending' ? (
                            <button
                              onClick={() => updateMemberStatus(member.id, 'active')}
                              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-sage-green)]/30 px-3 py-2 text-xs font-semibold text-[var(--color-sage-green)] transition-colors hover:bg-[var(--color-sage-green)]/10"
                            >
                              <Check className="h-3.5 w-3.5" />
                              {t('sharedSpacesApproveMemberBtn')}
                            </button>
                          ) : null}
                          {member.status !== 'emergency_only' ? (
                            <button
                              onClick={() => updateMemberStatus(member.id, 'emergency_only')}
                              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 px-3 py-2 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-500/10"
                            >
                              <ShieldAlert className="h-3.5 w-3.5" />
                              {t('sharedSpacesEmergencyOnlyBtn')}
                            </button>
                          ) : (
                            <button
                              onClick={() => updateMemberStatus(member.id, 'active')}
                              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-sage-green)]/30 px-3 py-2 text-xs font-semibold text-[var(--color-sage-green)] transition-colors hover:bg-[var(--color-sage-green)]/10"
                            >
                              <Check className="h-3.5 w-3.5" />
                              {t('sharedSpacesRestoreActiveBtn')}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/8 bg-[var(--color-cloud-dancer)]/92 px-5 py-4 backdrop-blur-sm dark:bg-[#182132]/92 lg:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:justify-between">
              <button
                onClick={() => (editingSpaceId ? deleteSpace(editingSpaceId) : beginEdit())}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 px-4 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                disabled={!editingSpaceId}
              >
                <Trash2 className="h-4 w-4" />
                {t('sharedSpacesDeleteBtn')}
              </button>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="settings-pill-secondary rounded-2xl px-5 py-3 text-sm font-semibold"
                >
                  {t('close')}
                </button>
                <button
                  onClick={saveSpace}
                  className="settings-action-btn-primary rounded-2xl px-5 py-3 text-sm font-semibold shadow-md transition-transform active:scale-95"
                >
                  {t('sharedSpacesSaveBtn')}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
