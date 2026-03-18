import React, { useEffect, useState } from 'react';
import type { EncryptionProfile } from '../../config/encryption-profiles';
import { SecureAppSettings } from '../../lib/SecureAppSettings';

export const EncryptionProfileSelector: React.FC = () => {
  const [profile, setProfile] = useState<EncryptionProfile>(() => {
    return SecureAppSettings.getEncryptionProfile();
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void SecureAppSettings.initialize().then(() => {
      setProfile(SecureAppSettings.getEncryptionProfile());
    });
  }, []);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProfile = e.target.value as EncryptionProfile;
    setProfile(newProfile);
    setSaving(true);
    
    // Değişikliği kaydet
    SecureAppSettings.setEncryptionProfile(newProfile);
    
    // NOT: Gerçek bir uygulamada varolan kayıtları yeni profile göre tekrar şifrelemek (migration) gerekir.
    // Şimdilik sadece yeni eklenen/güncellenen kayıtlara etki edecektir.
    
    setTimeout(() => {
      setSaving(false);
    }, 500);
  };

  return (
    <div className="encryption-profile-selector" style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
        🔐 Metadata Encryption Profile
      </label>
      <select 
        value={profile} 
        onChange={handleChange}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          background: 'var(--surface-color)',
          color: 'var(--text-color)',
          outline: 'none',
          cursor: 'pointer'
        }}
      >
        <option value="maximum">🔐 Maximum Privacy (Slower Search)</option>
        <option value="balanced">⚖️ Balanced (Recommended)</option>
        <option value="performance">⚡ High Performance (Fast Search)</option>
      </select>
      
      <p style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        {profile === 'maximum' && 'All fields (Title, Username, Website, etc.) are encrypted. Search must match exact hashes.'}
        {profile === 'balanced' && 'Titles are plaintext for fast search. Usernames, URLs, and Notes are encrypted.'}
        {profile === 'performance' && 'Only passwords, TOTP, and notes are encrypted. Best performance.'}
      </p>
      
      {saving && <span style={{ fontSize: '0.8rem', color: 'var(--accent-color)' }}>Saved. Applied to new entries.</span>}
    </div>
  );
};
