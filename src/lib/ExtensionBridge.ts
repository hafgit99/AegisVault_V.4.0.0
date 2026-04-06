import { vaultService } from '../vaultService';

type ImportMetaEnvWithExtensionIds = ImportMetaEnv & {
  VITE_AEGIS_ALLOWED_EXTENSION_IDS?: string;
  VITE_AEGIS_EXTENSION_ID?: string;
};

type ExtensionBridgeMessage =
  | { type: 'SYNC_TOKEN'; token: string | null }
  | { type: 'ERROR'; error: string }
  | { type: 'CHALLENGE_RESPONSE'; nonce: string; expiresAt: number }
  | {
      type: 'DECRYPTED_CREDS_RESPONSE';
      data: Array<{ title: string; username: string; pass: string; website: string }>;
    }
  | { type: 'VAULT_LOCKED' };

type ExtensionPortRequest = {
  type?: string;
  token?: string | null;
  nonce?: string;
  ts?: number | string;
  signature?: string;
  domain?: string;
};

type ExtensionPort = {
  postMessage: (message: ExtensionBridgeMessage) => void;
  disconnect: () => void;
  onMessage: {
    addListener: (listener: (message: ExtensionPortRequest) => void | Promise<void>) => void;
  };
  onDisconnect: {
    addListener: (listener: () => void) => void;
  };
};

type ChromeRuntimeWithConnect = {
  connect: (extensionId: string, options: { name: string }) => ExtensionPort;
};

type WindowWithChromeRuntime = Window &
  typeof globalThis & {
    chrome?: {
      runtime?: ChromeRuntimeWithConnect;
    };
  };

type PortSession = {
  extensionId: string;
  token: string;
  challengeNonceMap: Map<string, number>;
};

const DEFAULT_ALLOWED_EXTENSION_IDS = [
  'gddgomiecgnihlljfkogfjgakedoielk',
  'kjbdjkfijeflhhbnkjgkmccljifidpcc',
];
const ALLOWLIST_STORAGE_KEY = 'aegis_extension_allowlist_v1';

function parseAllowlist(raw: string): string[] {
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

function buildInitialAllowlist(): string[] {
  const envRaw =
    (import.meta.env as ImportMetaEnvWithExtensionIds).VITE_AEGIS_ALLOWED_EXTENSION_IDS ||
    (import.meta.env as ImportMetaEnvWithExtensionIds).VITE_AEGIS_EXTENSION_ID ||
    '';
  const envIds = parseAllowlist(envRaw);
  return envIds.length > 0 ? envIds : [...DEFAULT_ALLOWED_EXTENSION_IDS];
}

class ExtensionBridge {
  private isListening: boolean = false;
  private readonly challengeTtlMs = 20_000;
  private allowedExtensionIds: Set<string> = new Set(buildInitialAllowlist());
  private activeSessions: Map<ExtensionPort, PortSession> = new Map();

  constructor() {
    this.loadAllowlistFromStorage();
  }

  private getRuntime() {
    return (window as WindowWithChromeRuntime).chrome?.runtime;
  }

  private toHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private isExtensionAllowed(extensionId: string): boolean {
    return this.allowedExtensionIds.has(extensionId);
  }

  private getAllowlistStorage(): Storage | null {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  private loadAllowlistFromStorage(): void {
    const storage = this.getAllowlistStorage();
    if (!storage) return;

    const raw = storage.getItem(ALLOWLIST_STORAGE_KEY);
    if (!raw) return;

    const runtimeIds = parseAllowlist(raw);
    if (runtimeIds.length === 0) return;

    this.allowedExtensionIds = new Set(runtimeIds);
  }

  private persistAllowlist(): void {
    const storage = this.getAllowlistStorage();
    if (!storage) return;
    storage.setItem(ALLOWLIST_STORAGE_KEY, Array.from(this.allowedExtensionIds).join(','));
  }

  private async signSessionPayload(token: string, payload: string): Promise<string> {
    const key = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(token),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await window.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    return this.toHex(signature);
  }

  private cleanupExpiredChallenges(session: PortSession, now: number = Date.now()) {
    for (const [nonce, expiresAt] of session.challengeNonceMap.entries()) {
      if (expiresAt <= now) {
        session.challengeNonceMap.delete(nonce);
      }
    }
  }

  private async verifySignedRequest(
    session: PortSession,
    type: string,
    domain: string,
    nonce: string,
    ts: number,
    signature: string
  ): Promise<boolean> {
    if (!nonce || !signature || !Number.isFinite(ts)) return false;

    const now = Date.now();
    this.cleanupExpiredChallenges(session, now);

    const nonceExpiresAt = session.challengeNonceMap.get(nonce);
    if (!nonceExpiresAt || nonceExpiresAt <= now) return false;
    if (Math.abs(now - ts) > this.challengeTtlMs) return false;

    const payload = `${type}:${domain || ''}:${nonce}:${ts}`;
    const expectedSig = await this.signSessionPayload(session.token, payload);
    if (expectedSig.length !== signature.length) return false;

    let mismatch = 0;
    for (let i = 0; i < expectedSig.length; i++) {
      mismatch |= expectedSig.charCodeAt(i) ^ signature.charCodeAt(i);
    }

    const valid = mismatch === 0;
    if (valid) {
      session.challengeNonceMap.delete(nonce);
    }
    return valid;
  }

  private normalizeDomain(input: string): string {
    try {
      const parsed = input.includes('://') ? new URL(input) : new URL(`https://${input}`);
      return parsed.hostname.toLowerCase().replace(/^www\./, '').trim();
    } catch {
      return (input || '').toLowerCase().replace(/^www\./, '').trim();
    }
  }

  private toRegistrableDomain(hostname: string): string {
    const parts = (hostname || '').split('.').filter(Boolean);
    if (parts.length <= 2) return hostname;
    return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  }

  private isExactDomainMatch(entryWebsite: string, requestedDomain: string): boolean {
    const entryHost = this.normalizeDomain(entryWebsite);
    const reqHost = this.normalizeDomain(requestedDomain);
    if (!entryHost || !reqHost) return false;
    if (entryHost === reqHost) return true;
    return this.toRegistrableDomain(entryHost) === this.toRegistrableDomain(reqHost);
  }

  private attachPort(extensionId: string, port: ExtensionPort): void {
    const session: PortSession = {
      extensionId,
      token: this.generateToken(),
      challengeNonceMap: new Map(),
    };

    this.activeSessions.set(port, session);
    port.postMessage({ type: 'SYNC_TOKEN', token: session.token });

    port.onMessage.addListener(async (msg: ExtensionPortRequest) => {
      const currentSession = this.activeSessions.get(port);
      if (!currentSession) return;

      if (msg.token !== currentSession.token) {
        port.postMessage({ type: 'ERROR', error: 'UNAUTHORIZED_TOKEN' });
        return;
      }

      if (msg.type === 'REQUEST_CHALLENGE') {
        const nonce = this.generateToken();
        const expiresAt = Date.now() + this.challengeTtlMs;
        currentSession.challengeNonceMap.set(nonce, expiresAt);
        port.postMessage({ type: 'CHALLENGE_RESPONSE', nonce, expiresAt });
        return;
      }

      if (msg.type === 'get_decrypted_creds') {
        const nonce = typeof msg.nonce === 'string' ? msg.nonce : '';
        const ts = Number(msg.ts);
        const signature = typeof msg.signature === 'string' ? msg.signature : '';
        const domain = typeof msg.domain === 'string' ? msg.domain : '';

        const isSigned = await this.verifySignedRequest(
          currentSession,
          msg.type,
          domain,
          nonce,
          ts,
          signature
        );
        if (!isSigned) {
          port.postMessage({ type: 'ERROR', error: 'INVALID_CHALLENGE_SIGNATURE' });
          return;
        }

        if (!vaultService.isUnlocked()) {
          port.postMessage({ type: 'ERROR', error: 'VAULT_LOCKED' });
          return;
        }

        try {
          const creds = await vaultService.getPasswords();
          const filteredCreds = domain
            ? creds.filter((c) => this.isExactDomainMatch(c.website || '', domain))
            : [];

          const selected = filteredCreds.slice(0, 1).map((c) => ({
            title: c.title,
            username: c.username,
            pass: c.pass || '',
            website: c.website || '',
          }));

          port.postMessage({
            type: 'DECRYPTED_CREDS_RESPONSE',
            data: selected,
          });
        } catch {
          port.postMessage({ type: 'ERROR', error: 'INTERNAL_ERROR' });
        }
      }
    });

    port.onDisconnect.addListener(() => {
      const active = this.activeSessions.get(port);
      if (active) {
        active.challengeNonceMap.clear();
      }
      this.activeSessions.delete(port);
    });
  }

  private messageListener = async (event: MessageEvent) => {
    if (
      event.origin !== window.location.origin &&
      !event.origin.startsWith('chrome-extension://')
    ) {
      return;
    }

    const data = event.data;
    if (typeof data !== 'object' || !data) return;

    if (data.type !== 'AEGIS_EXTENSION_HELLO') return;

    const incomingExtensionId = data.extensionId;
    if (!incomingExtensionId || typeof incomingExtensionId !== 'string') {
      return;
    }

    if (!this.isExtensionAllowed(incomingExtensionId)) {
      return;
    }

    const runtime = this.getRuntime();
    if (!runtime) return;

    try {
      const port = runtime.connect(incomingExtensionId, { name: 'aegis-pwa-vault-port' });
      this.attachPort(incomingExtensionId, port);
    } catch (error) {
      console.error(
        '[PWA Bridge] Eklenti ile runtime (externally_connectable) baglantisi kurulamadý.',
        error
      );
    }
  };

  public init() {
    if (this.isListening) return;
    this.isListening = true;
    window.addEventListener('message', this.messageListener);
  }

  public getAllowedExtensionIds(): string[] {
    return Array.from(this.allowedExtensionIds);
  }

  public updateAllowedExtensionIds(ids: string[]): void {
    const normalized = ids
      .map((id) => id.trim())
      .filter(Boolean);

    if (normalized.length === 0) {
      this.allowedExtensionIds = new Set(DEFAULT_ALLOWED_EXTENSION_IDS);
    } else {
      this.allowedExtensionIds = new Set(normalized);
    }

    this.persistAllowlist();
    this.lockAndDisconnect();
  }

  public addAllowedExtensionId(id: string): void {
    const normalized = id.trim();
    if (!normalized) return;
    this.allowedExtensionIds.add(normalized);
    this.persistAllowlist();
  }

  public removeAllowedExtensionId(id: string): void {
    this.allowedExtensionIds.delete(id.trim());
    if (this.allowedExtensionIds.size === 0) {
      this.allowedExtensionIds = new Set(DEFAULT_ALLOWED_EXTENSION_IDS);
    }
    this.persistAllowlist();
    this.lockAndDisconnect();
  }

  public lockAndDisconnect() {
    for (const [port, session] of this.activeSessions.entries()) {
      try {
        port.postMessage({ type: 'VAULT_LOCKED' });
        port.disconnect();
      } catch {
        /* port may already be closed */
      }
      session.challengeNonceMap.clear();
      this.activeSessions.delete(port);
    }
  }

  public dispose() {
    this.isListening = false;
    window.removeEventListener('message', this.messageListener);
    this.lockAndDisconnect();
  }

  private generateToken() {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  /** @internal ONLY FOR TESTING */
  public reset() {
    this.isListening = false;
    this.activeSessions.clear();
    this.allowedExtensionIds = new Set(buildInitialAllowlist());
    this.loadAllowlistFromStorage();
    window.removeEventListener('message', this.messageListener);
  }
}

export const extensionBridge = new ExtensionBridge();
