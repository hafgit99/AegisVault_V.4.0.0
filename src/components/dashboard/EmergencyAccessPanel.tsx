import { useMemo, useState } from 'react';
import { AlertTriangle, Clock3, LifeBuoy, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  EmergencyAccessAuditEvent,
  EmergencyAccessContact,
  EmergencyAccessPolicy,
  EmergencyAccessRequest,
} from '../../lib/SecureAppSettings';

interface EmergencyAccessPanelProps {
  policy: EmergencyAccessPolicy;
  contacts: EmergencyAccessContact[];
  requests: EmergencyAccessRequest[];
  auditEvents: EmergencyAccessAuditEvent[];
  onUpdatePolicy: (next: Partial<EmergencyAccessPolicy>) => void;
  onSaveContact: (input: {
    id?: string;
    name: string;
    email: string;
    permission: EmergencyAccessContact['permission'];
    wait_hours: number;
    enabled: boolean;
    note?: string;
  }) => void;
  onDeleteContact: (contactId: string) => void;
  onRequestAccess: (contactId: string) => void;
  onApproveRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string) => void;
  onRevokeGrant: (requestId: string) => void;
}

const statusClassName = (status: EmergencyAccessRequest['status']) => {
  if (status === 'granted')
    return 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100';
  if (status === 'approved')
    return 'bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-100';
  if (status === 'pending')
    return 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100';
  if (status === 'rejected' || status === 'revoked')
    return 'bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-200';
  return 'bg-black/10 text-[var(--color-deep-navy)]/70 dark:bg-white/10 dark:text-white/70';
};

export function EmergencyAccessPanel({
  policy,
  contacts,
  requests,
  auditEvents,
  onUpdatePolicy,
  onSaveContact,
  onDeleteContact,
  onRequestAccess,
  onApproveRequest,
  onRejectRequest,
  onRevokeGrant,
}: EmergencyAccessPanelProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<EmergencyAccessContact['permission']>('read_only');
  const [waitHours, setWaitHours] = useState<number>(policy.default_wait_hours);
  const [note, setNote] = useState('');

  const contactsById = useMemo(
    () => Object.fromEntries(contacts.map((contact) => [contact.id, contact])),
    [contacts]
  );

  const pendingRequests = requests.filter(
    (request) => request.status === 'pending' || request.status === 'approved'
  );
  const activeGrants = requests.filter((request) => request.status === 'granted');

  const submitContact = () => {
    const safeName = name.trim();
    const safeEmail = email.trim().toLowerCase();
    if (!safeName || !safeEmail) return;
    onSaveContact({
      name: safeName,
      email: safeEmail,
      permission,
      wait_hours: waitHours,
      enabled: true,
      note: note.trim() || undefined,
    });
    setName('');
    setEmail('');
    setPermission('read_only');
    setWaitHours(policy.default_wait_hours);
    setNote('');
  };

  return (
    <div className="settings-panel rounded-3xl p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-[var(--color-sage-green)]" />
            <h3 className="text-lg font-semibold tracking-tight text-[var(--color-deep-navy)] dark:text-white">
              {t('emergencyAccessTitle')}
            </h3>
          </div>
          <p className="max-w-2xl text-xs leading-relaxed text-[var(--color-deep-navy)]/70 dark:text-white/70">
            {t('emergencyAccessDesc')}
          </p>
        </div>
        <div className="rounded-2xl bg-[var(--color-sage-green)]/10 px-4 py-3 text-center dark:bg-[var(--color-sage-green)]/15">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-deep-navy)]/60 dark:text-white/60">
            {t('emergencyAccessActiveGrants')}
          </div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-deep-navy)] dark:text-white">
            {activeGrants.length}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
        <label className="settings-card-item rounded-2xl p-3 flex items-center justify-between gap-3 text-[11px]">
          <span>{t('emergencyAccessEnabled')}</span>
          <input
            type="checkbox"
            checked={policy.enabled}
            onChange={(event) => onUpdatePolicy({ enabled: event.target.checked })}
          />
        </label>
        <label className="settings-card-item rounded-2xl p-3 flex items-center justify-between gap-3 text-[11px]">
          <span>{t('emergencyAccessManualApproval')}</span>
          <input
            type="checkbox"
            checked={policy.require_manual_approval}
            onChange={(event) => onUpdatePolicy({ require_manual_approval: event.target.checked })}
          />
        </label>
        <label className="settings-card-item rounded-2xl p-3 flex items-center justify-between gap-3 text-[11px]">
          <span>{t('emergencyAccessDefaultWaitHours')}</span>
          <input
            type="number"
            min={1}
            max={720}
            value={policy.default_wait_hours}
            onChange={(event) =>
              onUpdatePolicy({ default_wait_hours: Number(event.target.value || 48) })
            }
            className="settings-inline-input w-20 rounded-lg px-2 py-1 text-right"
          />
        </label>
        <label className="settings-card-item rounded-2xl p-3 flex items-center justify-between gap-3 text-[11px]">
          <span>{t('emergencyAccessGrantTtlHours')}</span>
          <input
            type="number"
            min={1}
            max={720}
            value={policy.grant_ttl_hours}
            onChange={(event) =>
              onUpdatePolicy({ grant_ttl_hours: Number(event.target.value || 24) })
            }
            className="settings-inline-input w-20 rounded-lg px-2 py-1 text-right"
          />
        </label>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="settings-subpanel rounded-2xl border p-5 shadow-inner">
          <div className="mb-3 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-[var(--color-sage-green)]" />
            <h4 className="text-sm font-semibold text-[var(--color-deep-navy)] dark:text-white">
              {t('emergencyAccessTrustedContacts')}
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('emergencyAccessContactName')}
              className="entry-field rounded-lg py-2 px-3 text-sm font-medium outline-none"
            />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('emergencyAccessContactEmail')}
              className="entry-field rounded-lg py-2 px-3 text-sm font-medium outline-none"
            />
            <select
              value={permission}
              onChange={(event) =>
                setPermission(event.target.value === 'full_access' ? 'full_access' : 'read_only')
              }
              className="entry-field rounded-lg py-2 px-3 text-sm font-medium outline-none"
            >
              <option value="read_only">{t('emergencyAccessPermissionReadOnly')}</option>
              <option value="full_access">{t('emergencyAccessPermissionFullAccess')}</option>
            </select>
            <input
              type="number"
              min={1}
              max={720}
              value={waitHours}
              onChange={(event) =>
                setWaitHours(Number(event.target.value || policy.default_wait_hours))
              }
              placeholder={t('emergencyAccessWaitHours')}
              className="entry-field rounded-lg py-2 px-3 text-sm font-medium outline-none"
            />
            <input
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t('emergencyAccessContactNote')}
              className="entry-field md:col-span-2 rounded-lg py-2 px-3 text-sm font-medium outline-none"
            />
            <button
              type="button"
              onClick={submitContact}
              className="rounded-xl bg-[var(--color-sage-green)] px-4 py-2 text-sm font-semibold text-[var(--color-deep-navy)] transition-colors hover:brightness-95 md:col-span-2"
            >
              {t('emergencyAccessAddContact')}
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {contacts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-black/10 px-3 py-4 text-center text-[11px] opacity-65 dark:border-white/10">
                {t('emergencyAccessNoContacts')}
              </div>
            ) : (
              contacts.map((contact) => (
                <div key={contact.id} className="settings-card-item rounded-xl p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-[var(--color-deep-navy)] dark:text-white">
                        {contact.name}
                      </div>
                      <div className="text-[11px] opacity-70">{contact.email}</div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <span className="rounded-full bg-black/5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest dark:bg-white/10">
                        {contact.permission === 'full_access'
                          ? t('emergencyAccessPermissionFullAccess')
                          : t('emergencyAccessPermissionReadOnly')}
                      </span>
                      <span className="rounded-full bg-black/5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest dark:bg-white/10">
                        {t('emergencyAccessWaitHoursValue', { count: contact.wait_hours })}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onRequestAccess(contact.id)}
                      className="rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300"
                    >
                      {t('emergencyAccessSimulateRequest')}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteContact(contact.id)}
                      className="rounded-full bg-red-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-red-700 dark:text-red-200"
                    >
                      {t('emergencyAccessDeleteContact')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="settings-subpanel rounded-2xl border p-5 shadow-inner">
            <div className="mb-3 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-amber-500" />
              <h4 className="text-sm font-semibold text-[var(--color-deep-navy)] dark:text-white">
                {t('emergencyAccessRequests')}
              </h4>
            </div>
            <div className="space-y-2">
              {pendingRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 px-4 py-3 text-sm text-[var(--color-deep-navy)]/60 dark:border-white/10 dark:text-white/60">
                  {t('emergencyAccessNoRequests')}
                </div>
              ) : (
                pendingRequests.slice(0, 6).map((request) => (
                  <div
                    key={request.id}
                    className="rounded-xl border border-black/5 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold">
                        {contactsById[request.contact_id]?.email || request.contact_id}
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${statusClassName(request.status)}`}
                      >
                        {t(`emergencyAccessStatus.${request.status}`)}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] opacity-70">
                      {t('emergencyAccessUnlockAt')}: {new Date(request.unlock_at).toLocaleString()}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => onApproveRequest(request.id)}
                        className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-200"
                      >
                        {t('emergencyAccessApprove')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRejectRequest(request.id)}
                        className="rounded-full bg-red-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-red-700 dark:text-red-200"
                      >
                        {t('emergencyAccessReject')}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="settings-subpanel rounded-2xl border p-5 shadow-inner">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--color-sage-green)]" />
              <h4 className="text-sm font-semibold text-[var(--color-deep-navy)] dark:text-white">
                {t('emergencyAccessGranted')}
              </h4>
            </div>
            <div className="space-y-2">
              {activeGrants.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 px-4 py-3 text-sm text-[var(--color-deep-navy)]/60 dark:border-white/10 dark:text-white/60">
                  {t('emergencyAccessNoGranted')}
                </div>
              ) : (
                activeGrants.slice(0, 4).map((request) => (
                  <div
                    key={request.id}
                    className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-3"
                  >
                    <div className="text-xs font-semibold">
                      {contactsById[request.contact_id]?.email || request.contact_id}
                    </div>
                    <div className="mt-1 text-[11px] opacity-70">
                      {t('emergencyAccessExpiresAt')}:{' '}
                      {request.expires_at ? new Date(request.expires_at).toLocaleString() : '-'}
                    </div>
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onRevokeGrant(request.id)}
                        className="rounded-full bg-red-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-red-700 dark:text-red-200"
                      >
                        {t('emergencyAccessRevoke')}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 settings-subpanel rounded-2xl border p-5 shadow-inner">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-[var(--color-sage-green)]" />
          <h4 className="text-sm font-semibold text-[var(--color-deep-navy)] dark:text-white">
            {t('emergencyAccessAuditTitle')}
          </h4>
        </div>
        <div className="space-y-2">
          {auditEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/10 px-4 py-3 text-sm text-[var(--color-deep-navy)]/60 dark:border-white/10 dark:text-white/60">
              {t('emergencyAccessAuditEmpty')}
            </div>
          ) : (
            auditEvents.slice(0, 6).map((event) => (
              <div
                key={event.id}
                className="rounded-xl border border-black/5 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold">
                    {t(`emergencyAccessAuditType.${event.type}`)}
                  </div>
                  <div className="text-[10px] opacity-60">
                    {new Date(event.at).toLocaleString()}
                  </div>
                </div>
                {event.detail || event.contactId || event.requestId ? (
                  <div className="mt-1 text-[11px] opacity-70">
                    {event.detail || event.contactId || event.requestId}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
        {!policy.enabled ? (
          <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-xs text-amber-700 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <span>{t('emergencyAccessDisabledWarning')}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
