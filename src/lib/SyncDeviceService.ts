/**
 * SyncDeviceService — Aegis 4.2 Faz 2 / Adim 2.2
 * 
 * Cihaz kaydi, fingerprinting ve trust revocation islemlerini yonetir.
 */

export interface SyncDeviceFingerprint {
  id: string; // Unique hash or UUID
  label: string; // "My iPhone", "Windows PC"
  addedAt: string;
  lastSyncAt?: string;
  isCurrent: boolean;
  status: 'active' | 'revoked';
}

export class SyncDeviceService {
  private static STORAGE_KEY = 'aegis_sync_devices_v1';

  /**
   * Mevcut cihaz icin fingerprint üretir.
   */
  static getLocalFingerprint(): SyncDeviceFingerprint {
    const platform = typeof navigator !== 'undefined' ? (navigator.platform || 'unknown') : 'unknown';
    const userAgent = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
    
    // Simple deterministic hash for demo - In production, use hardware-backed UUID if possible
    const hashStr = `${platform}-${userAgent}`;
    let hash = 0;
    for (let i = 0; i < hashStr.length; i++) {
      hash = ((hash << 5) - hash) + hashStr.charCodeAt(i);
      hash |= 0;
    }
    const id = `dv-${Math.abs(hash).toString(16).padStart(8, '0')}`;

    return {
      id,
      label: `Aegis on ${platform}`,
      addedAt: new Date().toISOString(),
      isCurrent: true,
      status: 'active',
    };
  }

  /**
   * Kayıtlı cihazları getirir.
   */
  static async getDevices(): Promise<SyncDeviceFingerprint[]> {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) {
      const current = this.getLocalFingerprint();
      return [current];
    }
    const list = JSON.parse(raw) as SyncDeviceFingerprint[];
    const local = this.getLocalFingerprint();
    
    return list.map(d => ({
      ...d,
      isCurrent: d.id === local.id
    }));
  }

  /**
   * Yeni cihaz ekler (Sync Root Secret paylasimi sonrasi).
   */
  static async addDevice(device: SyncDeviceFingerprint): Promise<void> {
    const devices = await this.getDevices();
    if (devices.find(d => d.id === device.id)) return;
    
    devices.push({ ...device, isCurrent: false });
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(devices));
  }

  /**
   * Bir cihazı kaldırır (Trust Revocation).
   */
  static async revokeDevice(deviceId: string): Promise<boolean> {
    const devices = await this.getDevices();
    const updated = devices.map(d => {
      if (d.id === deviceId) {
        return { ...d, status: 'revoked' as const };
      }
      return d;
    });

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    return true;
  }

  /**
   * Cihaz listesini temizler.
   */
  static clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
