export type CanonicalCategory =
  | 'login'
  | 'passkey'
  | 'card'
  | 'identity'
  | 'note'
  | 'wifi'
  | 'document'
  | 'other';

export interface CanonicalTotpFields {
  secret: string;
  issuer?: string;
  algorithm?: 'SHA-1' | 'SHA-256' | 'SHA-512';
  digits?: number;
  period?: number;
}

export interface CanonicalSecretFields {
  password?: string;
  notes?: string;
  totp?: CanonicalTotpFields | null;
}

export interface CanonicalAttachment {
  id: string;
  name: string;
  mime_type: string;
  size: number;
}

export interface CanonicalPasskeyFields {
  rp_id?: string;
  credential_id?: string;
  user_handle?: string;
  display_name?: string;
  transport?: string;
  authenticator_attachment?: string;
  algorithm?: string;
  mode?: 'vault_unlock' | 'site_passkey_mvp' | 'site_passkey_active' | 'site_passkey_future_rp';
  server_verified?: boolean;
  created_at?: string;
  last_registration_at?: string;
  last_auth_at?: string;
}

export interface CanonicalSharingAssignment {
  space_id: string;
  role: 'viewer' | 'editor';
  shared_by?: string;
  is_sensitive?: boolean;
  emergency_access?: boolean;
  notes?: string;
  last_reviewed_at?: string;
}

export type CanonicalSharedSpaceKind = 'private' | 'family' | 'team';
export type CanonicalSharedRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type CanonicalSharedMemberStatus = 'active' | 'pending' | 'emergency_only';

export interface CanonicalSharedMember {
  id: string;
  name: string;
  email: string;
  role: CanonicalSharedRole;
  status: CanonicalSharedMemberStatus;
  device_label?: string;
  notes?: string;
  last_verified_at?: string;
}

export interface CanonicalSharedSpace {
  id: string;
  name: string;
  kind: CanonicalSharedSpaceKind;
  description: string;
  default_role: Exclude<CanonicalSharedRole, 'owner'>;
  allow_export: boolean;
  require_review: boolean;
  created_at: string;
  updated_at: string;
  members: CanonicalSharedMember[];
}

export interface CanonicalVaultRecord {
  id: string | number;
  title: string;
  username: string;
  url: string;
  category: CanonicalCategory;
  favorite: boolean;
  tags: string[];
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
  secret?: CanonicalSecretFields;
  attachments?: CanonicalAttachment[];
  passkey?: CanonicalPasskeyFields | null;
  sharing?: CanonicalSharingAssignment[];
  custom_data?: Record<string, unknown>;
}

export const normalizeCanonicalCategory = (value?: string): CanonicalCategory => {
  const normalized = (value || '').trim().toLowerCase();
  if (
    normalized === 'login' ||
    normalized === 'passkey' ||
    normalized === 'card' ||
    normalized === 'identity' ||
    normalized === 'note' ||
    normalized === 'wifi' ||
    normalized === 'document'
  ) {
    return normalized;
  }
  return normalized ? 'other' : 'login';
};
