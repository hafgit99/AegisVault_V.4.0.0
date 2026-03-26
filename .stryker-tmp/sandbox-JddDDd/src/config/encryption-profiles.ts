/**
 * Aegis Vault Encryption Profiles
 * 
 * Defines how much metadata is encrypted at rest to balance 
 * privacy vs performance (especially for searching).
 */
// @ts-nocheck


export type EncryptionProfile = 'maximum' | 'balanced' | 'performance';

export const ENCRYPTION_PROFILES: Record<EncryptionProfile, string[]> = {
  // En yüksek gizlilik, yavaş tam metin arama
  'maximum': [
    'title', 'username', 'website', 'category', 'tags',
    'notes', 'attachments'
  ],
  // Dengeli (ön tanımlı), isim ve kategori düz okunabilir, kullanıcı adları/url'ler gizli
  'balanced': [
    'username', 'website', 'notes', 'attachments'
  ],
  // Performans odaklı, sadece kritik şeyler şifrelenir
  'performance': [
    'notes', 'attachments'
  ]
};

export function isFieldEncrypted(profile: EncryptionProfile, field: string): boolean {
  if (profile === 'maximum') return true; 
  return ENCRYPTION_PROFILES[profile].includes(field);
}
