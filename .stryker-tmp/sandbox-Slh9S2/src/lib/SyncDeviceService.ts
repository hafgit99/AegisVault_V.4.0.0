/**
 * SyncDeviceService — Aegis 4.2 Faz 2 / Adim 2.2
 *
 * Cihaz kaydi, fingerprinting ve trust revocation islemlerini yonetir.
 */
// @ts-nocheck


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
  private static DEVICE_ID_KEY = 'aegis_sync_local_device_id_v1';

  private static createSecureDeviceId(): string {
    if (typeof crypto.randomUUID === 'function') {
      return `dv-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    }
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    return `dv-${Array.from(bytes)
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('')}`;
  }

  private static getStableLocalDeviceId(): string {
    const existing = localStorage.getItem(this.DEVICE_ID_KEY);
    if (typeof existing === 'string' && existing.startsWith('dv-')) {
      return existing;
    }

    const generated = this.createSecureDeviceId();
    localStorage.setItem(this.DEVICE_ID_KEY, generated);
    return generated;
  }

  /**
   * Mevcut cihaz icin fingerprint üretir.
   */
  static getLocalFingerprint(): SyncDeviceFingerprint {
    const platform = typeof navigator !== 'undefined' ? navigator.platform || 'unknown' : 'unknown';
    const id = this.getStableLocalDeviceId();

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

    return list.map((d) => ({
      ...d,
      isCurrent: d.id === local.id,
    }));
  }

  /**
   * Yeni cihaz ekler (Sync Root Secret paylasimi sonrasi).
   */
  static async addDevice(device: SyncDeviceFingerprint): Promise<void> {
    const devices = await this.getDevices();
    if (devices.find((d) => d.id === device.id)) return;

    devices.push({ ...device, isCurrent: false });
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(devices));
  }

  /**
   * Bir cihazı kaldırır (Trust Revocation).
   */
  static async revokeDevice(deviceId: string): Promise<boolean> {
    const devices = await this.getDevices();
    const updated = devices.map((d) => {
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
    localStorage.removeItem(this.DEVICE_ID_KEY);
  }
}
