import React, { useState, useEffect } from 'react';
import { IDLE_TIMEOUT_OPTIONS, getIdleTimeout, setIdleTimeout } from '../../config/security-settings';

export const AutoLockSelector: React.FC = () => {
  const [timeoutSec, setTimeoutSec] = useState<number>(300);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTimeoutSec(getIdleTimeout());
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value, 10);
    setTimeoutSec(val);
    setSaving(true);
    setIdleTimeout(val);
    
    setTimeout(() => {
      setSaving(false);
    }, 500);
  };

  return (
    <div className="autolock-selector" style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
        ⏱️ Auto-Lock Timeout
      </label>
      <select 
        value={timeoutSec} 
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
        {IDLE_TIMEOUT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      
      <p style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        {timeoutSec === 0 
          ? "Vault will never lock automatically. Please lock it manually." 
          : `Vault will automatically lock after ${timeoutSec / 60} ${timeoutSec === 60 ? 'minute' : 'minutes'} of inactivity.`}
      </p>
      
      {saving && <span style={{ fontSize: '0.8rem', color: 'var(--accent-color)' }}>Saved automatically.</span>}
    </div>
  );
};
