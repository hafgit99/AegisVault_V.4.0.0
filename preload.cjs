/**
 * Aegis Vault — Electron Preload Script
 * 
 * SECURITY: Bu dosya contextBridge ile güvenli IPC API'yi renderer'a açar.
 * nodeIntegration: false ve contextIsolation: true ile çalışır.
 * Renderer tarafında `window.aegisElectron` üzerinden erişilir.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aegisElectron', {
  /**
   * Kasa verilerini Electron ana sürecine gönderir (Extension sync için).
   * @param {Array} passwords - Şifresi çözülmüş kasa verileri
   */
  syncVault: (passwords) => {
    // Sadece beklenen veri yapısını kabul et — Girdi validasyonu
    if (!Array.isArray(passwords)) return;
    const sanitized = passwords.map(p => ({
      title: String(p.title || ''),
      username: String(p.username || ''),
      pass: String(p.pass || ''),
      website: String(p.website || '')
    }));
    ipcRenderer.send('sync-vault', sanitized);
  },

  /**
   * Kasa kilitlendiğinde Electron ana sürecine sinyal gönderir.
   */
  lockVault: () => {
    ipcRenderer.send('lock-vault');
  },

  /**
   * Electron ortamında çalışıp çalışmadığını belirtir.
   */
  isElectron: true
});
