// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { vaultService } from '../vaultService';
type ImportMetaEnvWithExtensionIds = ImportMetaEnv & {
  VITE_AEGIS_ALLOWED_EXTENSION_IDS?: string;
  VITE_AEGIS_EXTENSION_ID?: string;
};
type ExtensionBridgeMessage = {
  type: 'SYNC_TOKEN';
  token: string | null;
} | {
  type: 'ERROR';
  error: string;
} | {
  type: 'CHALLENGE_RESPONSE';
  nonce: string;
  expiresAt: number;
} | {
  type: 'DECRYPTED_CREDS_RESPONSE';
  data: Array<{
    title: string;
    username: string;
    pass: string;
    website: string;
  }>;
} | {
  type: 'VAULT_LOCKED';
};
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
  connect: (extensionId: string, options: {
    name: string;
  }) => ExtensionPort;
};
type WindowWithChromeRuntime = Window & typeof globalThis & {
  chrome?: {
    runtime?: ChromeRuntimeWithConnect;
  };
};
type PortSession = {
  extensionId: string;
  token: string;
  challengeNonceMap: Map<string, number>;
};
const DEFAULT_ALLOWED_EXTENSION_IDS = stryMutAct_9fa48("0") ? [] : (stryCov_9fa48("0"), [stryMutAct_9fa48("1") ? "" : (stryCov_9fa48("1"), 'gddgomiecgnihlljfkogfjgakedoielk'), stryMutAct_9fa48("2") ? "" : (stryCov_9fa48("2"), 'kjbdjkfijeflhhbnkjgkmccljifidpcc')]);
const ALLOWLIST_STORAGE_KEY = stryMutAct_9fa48("3") ? "" : (stryCov_9fa48("3"), 'aegis_extension_allowlist_v1');
function parseAllowlist(raw: string): string[] {
  if (stryMutAct_9fa48("4")) {
    {}
  } else {
    stryCov_9fa48("4");
    return stryMutAct_9fa48("5") ? raw.split(',').map(id => id.trim()) : (stryCov_9fa48("5"), raw.split(stryMutAct_9fa48("6") ? "" : (stryCov_9fa48("6"), ',')).map(stryMutAct_9fa48("7") ? () => undefined : (stryCov_9fa48("7"), id => stryMutAct_9fa48("8") ? id : (stryCov_9fa48("8"), id.trim()))).filter(Boolean));
  }
}
function buildInitialAllowlist(): string[] {
  if (stryMutAct_9fa48("9")) {
    {}
  } else {
    stryCov_9fa48("9");
    const envRaw = stryMutAct_9fa48("12") ? ((import.meta.env as ImportMetaEnvWithExtensionIds).VITE_AEGIS_ALLOWED_EXTENSION_IDS || (import.meta.env as ImportMetaEnvWithExtensionIds).VITE_AEGIS_EXTENSION_ID) && '' : stryMutAct_9fa48("11") ? false : stryMutAct_9fa48("10") ? true : (stryCov_9fa48("10", "11", "12"), (stryMutAct_9fa48("14") ? (import.meta.env as ImportMetaEnvWithExtensionIds).VITE_AEGIS_ALLOWED_EXTENSION_IDS && (import.meta.env as ImportMetaEnvWithExtensionIds).VITE_AEGIS_EXTENSION_ID : stryMutAct_9fa48("13") ? false : (stryCov_9fa48("13", "14"), (import.meta.env as ImportMetaEnvWithExtensionIds).VITE_AEGIS_ALLOWED_EXTENSION_IDS || (import.meta.env as ImportMetaEnvWithExtensionIds).VITE_AEGIS_EXTENSION_ID)) || (stryMutAct_9fa48("15") ? "Stryker was here!" : (stryCov_9fa48("15"), '')));
    const envIds = parseAllowlist(envRaw);
    return (stryMutAct_9fa48("19") ? envIds.length <= 0 : stryMutAct_9fa48("18") ? envIds.length >= 0 : stryMutAct_9fa48("17") ? false : stryMutAct_9fa48("16") ? true : (stryCov_9fa48("16", "17", "18", "19"), envIds.length > 0)) ? envIds : stryMutAct_9fa48("20") ? [] : (stryCov_9fa48("20"), [...DEFAULT_ALLOWED_EXTENSION_IDS]);
  }
}
class ExtensionBridge {
  private isListening: boolean = stryMutAct_9fa48("21") ? true : (stryCov_9fa48("21"), false);
  private readonly challengeTtlMs = 20_000;
  private allowedExtensionIds: Set<string> = new Set(buildInitialAllowlist());
  private activeSessions: Map<ExtensionPort, PortSession> = new Map();
  constructor() {
    if (stryMutAct_9fa48("22")) {
      {}
    } else {
      stryCov_9fa48("22");
      this.loadAllowlistFromStorage();
    }
  }
  private getRuntime() {
    if (stryMutAct_9fa48("23")) {
      {}
    } else {
      stryCov_9fa48("23");
      return stryMutAct_9fa48("24") ? (window as WindowWithChromeRuntime).chrome.runtime : (stryCov_9fa48("24"), (window as WindowWithChromeRuntime).chrome?.runtime);
    }
  }
  private toHex(buffer: ArrayBuffer): string {
    if (stryMutAct_9fa48("25")) {
      {}
    } else {
      stryCov_9fa48("25");
      const bytes = new Uint8Array(buffer);
      return Array.from(bytes).map(stryMutAct_9fa48("26") ? () => undefined : (stryCov_9fa48("26"), b => b.toString(16).padStart(2, stryMutAct_9fa48("27") ? "" : (stryCov_9fa48("27"), '0')))).join(stryMutAct_9fa48("28") ? "Stryker was here!" : (stryCov_9fa48("28"), ''));
    }
  }
  private isExtensionAllowed(extensionId: string): boolean {
    if (stryMutAct_9fa48("29")) {
      {}
    } else {
      stryCov_9fa48("29");
      return this.allowedExtensionIds.has(extensionId);
    }
  }
  private getAllowlistStorage(): Storage | null {
    if (stryMutAct_9fa48("30")) {
      {}
    } else {
      stryCov_9fa48("30");
      try {
        if (stryMutAct_9fa48("31")) {
          {}
        } else {
          stryCov_9fa48("31");
          return window.localStorage;
        }
      } catch {
        if (stryMutAct_9fa48("32")) {
          {}
        } else {
          stryCov_9fa48("32");
          return null;
        }
      }
    }
  }
  private loadAllowlistFromStorage(): void {
    if (stryMutAct_9fa48("33")) {
      {}
    } else {
      stryCov_9fa48("33");
      const storage = this.getAllowlistStorage();
      if (stryMutAct_9fa48("36") ? false : stryMutAct_9fa48("35") ? true : stryMutAct_9fa48("34") ? storage : (stryCov_9fa48("34", "35", "36"), !storage)) return;
      const raw = storage.getItem(ALLOWLIST_STORAGE_KEY);
      if (stryMutAct_9fa48("39") ? false : stryMutAct_9fa48("38") ? true : stryMutAct_9fa48("37") ? raw : (stryCov_9fa48("37", "38", "39"), !raw)) return;
      const runtimeIds = parseAllowlist(raw);
      if (stryMutAct_9fa48("42") ? runtimeIds.length !== 0 : stryMutAct_9fa48("41") ? false : stryMutAct_9fa48("40") ? true : (stryCov_9fa48("40", "41", "42"), runtimeIds.length === 0)) return;
      this.allowedExtensionIds = new Set(runtimeIds);
    }
  }
  private persistAllowlist(): void {
    if (stryMutAct_9fa48("43")) {
      {}
    } else {
      stryCov_9fa48("43");
      const storage = this.getAllowlistStorage();
      if (stryMutAct_9fa48("46") ? false : stryMutAct_9fa48("45") ? true : stryMutAct_9fa48("44") ? storage : (stryCov_9fa48("44", "45", "46"), !storage)) return;
      storage.setItem(ALLOWLIST_STORAGE_KEY, Array.from(this.allowedExtensionIds).join(stryMutAct_9fa48("47") ? "" : (stryCov_9fa48("47"), ',')));
    }
  }
  private async signSessionPayload(token: string, payload: string): Promise<string> {
    if (stryMutAct_9fa48("48")) {
      {}
    } else {
      stryCov_9fa48("48");
      const key = await window.crypto.subtle.importKey(stryMutAct_9fa48("49") ? "" : (stryCov_9fa48("49"), 'raw'), new TextEncoder().encode(token), stryMutAct_9fa48("50") ? {} : (stryCov_9fa48("50"), {
        name: stryMutAct_9fa48("51") ? "" : (stryCov_9fa48("51"), 'HMAC'),
        hash: stryMutAct_9fa48("52") ? "" : (stryCov_9fa48("52"), 'SHA-256')
      }), stryMutAct_9fa48("53") ? true : (stryCov_9fa48("53"), false), stryMutAct_9fa48("54") ? [] : (stryCov_9fa48("54"), [stryMutAct_9fa48("55") ? "" : (stryCov_9fa48("55"), 'sign')]));
      const signature = await window.crypto.subtle.sign(stryMutAct_9fa48("56") ? "" : (stryCov_9fa48("56"), 'HMAC'), key, new TextEncoder().encode(payload));
      return this.toHex(signature);
    }
  }
  private cleanupExpiredChallenges(session: PortSession, now: number = Date.now()) {
    if (stryMutAct_9fa48("57")) {
      {}
    } else {
      stryCov_9fa48("57");
      for (const [nonce, expiresAt] of session.challengeNonceMap.entries()) {
        if (stryMutAct_9fa48("58")) {
          {}
        } else {
          stryCov_9fa48("58");
          if (stryMutAct_9fa48("62") ? expiresAt > now : stryMutAct_9fa48("61") ? expiresAt < now : stryMutAct_9fa48("60") ? false : stryMutAct_9fa48("59") ? true : (stryCov_9fa48("59", "60", "61", "62"), expiresAt <= now)) {
            if (stryMutAct_9fa48("63")) {
              {}
            } else {
              stryCov_9fa48("63");
              session.challengeNonceMap.delete(nonce);
            }
          }
        }
      }
    }
  }
  private async verifySignedRequest(session: PortSession, type: string, domain: string, nonce: string, ts: number, signature: string): Promise<boolean> {
    if (stryMutAct_9fa48("64")) {
      {}
    } else {
      stryCov_9fa48("64");
      if (stryMutAct_9fa48("67") ? (!nonce || !signature) && !Number.isFinite(ts) : stryMutAct_9fa48("66") ? false : stryMutAct_9fa48("65") ? true : (stryCov_9fa48("65", "66", "67"), (stryMutAct_9fa48("69") ? !nonce && !signature : stryMutAct_9fa48("68") ? false : (stryCov_9fa48("68", "69"), (stryMutAct_9fa48("70") ? nonce : (stryCov_9fa48("70"), !nonce)) || (stryMutAct_9fa48("71") ? signature : (stryCov_9fa48("71"), !signature)))) || (stryMutAct_9fa48("72") ? Number.isFinite(ts) : (stryCov_9fa48("72"), !Number.isFinite(ts))))) return stryMutAct_9fa48("73") ? true : (stryCov_9fa48("73"), false);
      const now = Date.now();
      this.cleanupExpiredChallenges(session, now);
      const nonceExpiresAt = session.challengeNonceMap.get(nonce);
      if (stryMutAct_9fa48("76") ? !nonceExpiresAt && nonceExpiresAt <= now : stryMutAct_9fa48("75") ? false : stryMutAct_9fa48("74") ? true : (stryCov_9fa48("74", "75", "76"), (stryMutAct_9fa48("77") ? nonceExpiresAt : (stryCov_9fa48("77"), !nonceExpiresAt)) || (stryMutAct_9fa48("80") ? nonceExpiresAt > now : stryMutAct_9fa48("79") ? nonceExpiresAt < now : stryMutAct_9fa48("78") ? false : (stryCov_9fa48("78", "79", "80"), nonceExpiresAt <= now)))) return stryMutAct_9fa48("81") ? true : (stryCov_9fa48("81"), false);
      if (stryMutAct_9fa48("85") ? Math.abs(now - ts) <= this.challengeTtlMs : stryMutAct_9fa48("84") ? Math.abs(now - ts) >= this.challengeTtlMs : stryMutAct_9fa48("83") ? false : stryMutAct_9fa48("82") ? true : (stryCov_9fa48("82", "83", "84", "85"), Math.abs(stryMutAct_9fa48("86") ? now + ts : (stryCov_9fa48("86"), now - ts)) > this.challengeTtlMs)) return stryMutAct_9fa48("87") ? true : (stryCov_9fa48("87"), false);
      const payload = stryMutAct_9fa48("88") ? `` : (stryCov_9fa48("88"), `${type}:${stryMutAct_9fa48("91") ? domain && '' : stryMutAct_9fa48("90") ? false : stryMutAct_9fa48("89") ? true : (stryCov_9fa48("89", "90", "91"), domain || (stryMutAct_9fa48("92") ? "Stryker was here!" : (stryCov_9fa48("92"), '')))}:${nonce}:${ts}`);
      const expectedSig = await this.signSessionPayload(session.token, payload);
      if (stryMutAct_9fa48("95") ? expectedSig.length === signature.length : stryMutAct_9fa48("94") ? false : stryMutAct_9fa48("93") ? true : (stryCov_9fa48("93", "94", "95"), expectedSig.length !== signature.length)) return stryMutAct_9fa48("96") ? true : (stryCov_9fa48("96"), false);
      let mismatch = 0;
      for (let i = 0; stryMutAct_9fa48("99") ? i >= expectedSig.length : stryMutAct_9fa48("98") ? i <= expectedSig.length : stryMutAct_9fa48("97") ? false : (stryCov_9fa48("97", "98", "99"), i < expectedSig.length); stryMutAct_9fa48("100") ? i-- : (stryCov_9fa48("100"), i++)) {
        if (stryMutAct_9fa48("101")) {
          {}
        } else {
          stryCov_9fa48("101");
          stryMutAct_9fa48("102") ? mismatch &= expectedSig.charCodeAt(i) ^ signature.charCodeAt(i) : (stryCov_9fa48("102"), mismatch |= expectedSig.charCodeAt(i) ^ signature.charCodeAt(i));
        }
      }
      const valid = stryMutAct_9fa48("105") ? mismatch !== 0 : stryMutAct_9fa48("104") ? false : stryMutAct_9fa48("103") ? true : (stryCov_9fa48("103", "104", "105"), mismatch === 0);
      if (stryMutAct_9fa48("107") ? false : stryMutAct_9fa48("106") ? true : (stryCov_9fa48("106", "107"), valid)) {
        if (stryMutAct_9fa48("108")) {
          {}
        } else {
          stryCov_9fa48("108");
          session.challengeNonceMap.delete(nonce);
        }
      }
      return valid;
    }
  }
  private normalizeDomain(input: string): string {
    if (stryMutAct_9fa48("109")) {
      {}
    } else {
      stryCov_9fa48("109");
      try {
        if (stryMutAct_9fa48("110")) {
          {}
        } else {
          stryCov_9fa48("110");
          const parsed = input.includes(stryMutAct_9fa48("111") ? "" : (stryCov_9fa48("111"), '://')) ? new URL(input) : new URL(stryMutAct_9fa48("112") ? `` : (stryCov_9fa48("112"), `https://${input}`));
          return stryMutAct_9fa48("114") ? parsed.hostname.toUpperCase().replace(/^www\./, '').trim() : stryMutAct_9fa48("113") ? parsed.hostname.toLowerCase().replace(/^www\./, '') : (stryCov_9fa48("113", "114"), parsed.hostname.toLowerCase().replace(stryMutAct_9fa48("115") ? /www\./ : (stryCov_9fa48("115"), /^www\./), stryMutAct_9fa48("116") ? "Stryker was here!" : (stryCov_9fa48("116"), '')).trim());
        }
      } catch {
        if (stryMutAct_9fa48("117")) {
          {}
        } else {
          stryCov_9fa48("117");
          return stryMutAct_9fa48("119") ? (input || '').toUpperCase().replace(/^www\./, '').trim() : stryMutAct_9fa48("118") ? (input || '').toLowerCase().replace(/^www\./, '') : (stryCov_9fa48("118", "119"), (stryMutAct_9fa48("122") ? input && '' : stryMutAct_9fa48("121") ? false : stryMutAct_9fa48("120") ? true : (stryCov_9fa48("120", "121", "122"), input || (stryMutAct_9fa48("123") ? "Stryker was here!" : (stryCov_9fa48("123"), '')))).toLowerCase().replace(stryMutAct_9fa48("124") ? /www\./ : (stryCov_9fa48("124"), /^www\./), stryMutAct_9fa48("125") ? "Stryker was here!" : (stryCov_9fa48("125"), '')).trim());
        }
      }
    }
  }
  private toRegistrableDomain(hostname: string): string {
    if (stryMutAct_9fa48("126")) {
      {}
    } else {
      stryCov_9fa48("126");
      const parts = stryMutAct_9fa48("127") ? (hostname || '').split('.') : (stryCov_9fa48("127"), (stryMutAct_9fa48("130") ? hostname && '' : stryMutAct_9fa48("129") ? false : stryMutAct_9fa48("128") ? true : (stryCov_9fa48("128", "129", "130"), hostname || (stryMutAct_9fa48("131") ? "Stryker was here!" : (stryCov_9fa48("131"), '')))).split(stryMutAct_9fa48("132") ? "" : (stryCov_9fa48("132"), '.')).filter(Boolean));
      if (stryMutAct_9fa48("136") ? parts.length > 2 : stryMutAct_9fa48("135") ? parts.length < 2 : stryMutAct_9fa48("134") ? false : stryMutAct_9fa48("133") ? true : (stryCov_9fa48("133", "134", "135", "136"), parts.length <= 2)) return hostname;
      return stryMutAct_9fa48("137") ? `` : (stryCov_9fa48("137"), `${parts[stryMutAct_9fa48("138") ? parts.length + 2 : (stryCov_9fa48("138"), parts.length - 2)]}.${parts[stryMutAct_9fa48("139") ? parts.length + 1 : (stryCov_9fa48("139"), parts.length - 1)]}`);
    }
  }
  private isExactDomainMatch(entryWebsite: string, requestedDomain: string): boolean {
    if (stryMutAct_9fa48("140")) {
      {}
    } else {
      stryCov_9fa48("140");
      const entryHost = this.normalizeDomain(entryWebsite);
      const reqHost = this.normalizeDomain(requestedDomain);
      if (stryMutAct_9fa48("143") ? !entryHost && !reqHost : stryMutAct_9fa48("142") ? false : stryMutAct_9fa48("141") ? true : (stryCov_9fa48("141", "142", "143"), (stryMutAct_9fa48("144") ? entryHost : (stryCov_9fa48("144"), !entryHost)) || (stryMutAct_9fa48("145") ? reqHost : (stryCov_9fa48("145"), !reqHost)))) return stryMutAct_9fa48("146") ? true : (stryCov_9fa48("146"), false);
      if (stryMutAct_9fa48("149") ? entryHost !== reqHost : stryMutAct_9fa48("148") ? false : stryMutAct_9fa48("147") ? true : (stryCov_9fa48("147", "148", "149"), entryHost === reqHost)) return stryMutAct_9fa48("150") ? false : (stryCov_9fa48("150"), true);
      return stryMutAct_9fa48("153") ? this.toRegistrableDomain(entryHost) !== this.toRegistrableDomain(reqHost) : stryMutAct_9fa48("152") ? false : stryMutAct_9fa48("151") ? true : (stryCov_9fa48("151", "152", "153"), this.toRegistrableDomain(entryHost) === this.toRegistrableDomain(reqHost));
    }
  }
  private attachPort(extensionId: string, port: ExtensionPort): void {
    if (stryMutAct_9fa48("154")) {
      {}
    } else {
      stryCov_9fa48("154");
      const session: PortSession = stryMutAct_9fa48("155") ? {} : (stryCov_9fa48("155"), {
        extensionId,
        token: this.generateToken(),
        challengeNonceMap: new Map()
      });
      this.activeSessions.set(port, session);
      port.postMessage(stryMutAct_9fa48("156") ? {} : (stryCov_9fa48("156"), {
        type: stryMutAct_9fa48("157") ? "" : (stryCov_9fa48("157"), 'SYNC_TOKEN'),
        token: session.token
      }));
      port.onMessage.addListener(async (msg: ExtensionPortRequest) => {
        if (stryMutAct_9fa48("158")) {
          {}
        } else {
          stryCov_9fa48("158");
          const currentSession = this.activeSessions.get(port);
          if (stryMutAct_9fa48("161") ? false : stryMutAct_9fa48("160") ? true : stryMutAct_9fa48("159") ? currentSession : (stryCov_9fa48("159", "160", "161"), !currentSession)) return;
          if (stryMutAct_9fa48("164") ? msg.token === currentSession.token : stryMutAct_9fa48("163") ? false : stryMutAct_9fa48("162") ? true : (stryCov_9fa48("162", "163", "164"), msg.token !== currentSession.token)) {
            if (stryMutAct_9fa48("165")) {
              {}
            } else {
              stryCov_9fa48("165");
              port.postMessage(stryMutAct_9fa48("166") ? {} : (stryCov_9fa48("166"), {
                type: stryMutAct_9fa48("167") ? "" : (stryCov_9fa48("167"), 'ERROR'),
                error: stryMutAct_9fa48("168") ? "" : (stryCov_9fa48("168"), 'UNAUTHORIZED_TOKEN')
              }));
              return;
            }
          }
          if (stryMutAct_9fa48("171") ? msg.type !== 'REQUEST_CHALLENGE' : stryMutAct_9fa48("170") ? false : stryMutAct_9fa48("169") ? true : (stryCov_9fa48("169", "170", "171"), msg.type === (stryMutAct_9fa48("172") ? "" : (stryCov_9fa48("172"), 'REQUEST_CHALLENGE')))) {
            if (stryMutAct_9fa48("173")) {
              {}
            } else {
              stryCov_9fa48("173");
              const nonce = this.generateToken();
              const expiresAt = stryMutAct_9fa48("174") ? Date.now() - this.challengeTtlMs : (stryCov_9fa48("174"), Date.now() + this.challengeTtlMs);
              currentSession.challengeNonceMap.set(nonce, expiresAt);
              port.postMessage(stryMutAct_9fa48("175") ? {} : (stryCov_9fa48("175"), {
                type: stryMutAct_9fa48("176") ? "" : (stryCov_9fa48("176"), 'CHALLENGE_RESPONSE'),
                nonce,
                expiresAt
              }));
              return;
            }
          }
          if (stryMutAct_9fa48("179") ? msg.type !== 'get_decrypted_creds' : stryMutAct_9fa48("178") ? false : stryMutAct_9fa48("177") ? true : (stryCov_9fa48("177", "178", "179"), msg.type === (stryMutAct_9fa48("180") ? "" : (stryCov_9fa48("180"), 'get_decrypted_creds')))) {
            if (stryMutAct_9fa48("181")) {
              {}
            } else {
              stryCov_9fa48("181");
              const nonce = (stryMutAct_9fa48("184") ? typeof msg.nonce !== 'string' : stryMutAct_9fa48("183") ? false : stryMutAct_9fa48("182") ? true : (stryCov_9fa48("182", "183", "184"), typeof msg.nonce === (stryMutAct_9fa48("185") ? "" : (stryCov_9fa48("185"), 'string')))) ? msg.nonce : stryMutAct_9fa48("186") ? "Stryker was here!" : (stryCov_9fa48("186"), '');
              const ts = Number(msg.ts);
              const signature = (stryMutAct_9fa48("189") ? typeof msg.signature !== 'string' : stryMutAct_9fa48("188") ? false : stryMutAct_9fa48("187") ? true : (stryCov_9fa48("187", "188", "189"), typeof msg.signature === (stryMutAct_9fa48("190") ? "" : (stryCov_9fa48("190"), 'string')))) ? msg.signature : stryMutAct_9fa48("191") ? "Stryker was here!" : (stryCov_9fa48("191"), '');
              const domain = (stryMutAct_9fa48("194") ? typeof msg.domain !== 'string' : stryMutAct_9fa48("193") ? false : stryMutAct_9fa48("192") ? true : (stryCov_9fa48("192", "193", "194"), typeof msg.domain === (stryMutAct_9fa48("195") ? "" : (stryCov_9fa48("195"), 'string')))) ? msg.domain : stryMutAct_9fa48("196") ? "Stryker was here!" : (stryCov_9fa48("196"), '');
              const isSigned = await this.verifySignedRequest(currentSession, msg.type, domain, nonce, ts, signature);
              if (stryMutAct_9fa48("199") ? false : stryMutAct_9fa48("198") ? true : stryMutAct_9fa48("197") ? isSigned : (stryCov_9fa48("197", "198", "199"), !isSigned)) {
                if (stryMutAct_9fa48("200")) {
                  {}
                } else {
                  stryCov_9fa48("200");
                  port.postMessage(stryMutAct_9fa48("201") ? {} : (stryCov_9fa48("201"), {
                    type: stryMutAct_9fa48("202") ? "" : (stryCov_9fa48("202"), 'ERROR'),
                    error: stryMutAct_9fa48("203") ? "" : (stryCov_9fa48("203"), 'INVALID_CHALLENGE_SIGNATURE')
                  }));
                  return;
                }
              }
              if (stryMutAct_9fa48("206") ? false : stryMutAct_9fa48("205") ? true : stryMutAct_9fa48("204") ? vaultService.isUnlocked() : (stryCov_9fa48("204", "205", "206"), !vaultService.isUnlocked())) {
                if (stryMutAct_9fa48("207")) {
                  {}
                } else {
                  stryCov_9fa48("207");
                  port.postMessage(stryMutAct_9fa48("208") ? {} : (stryCov_9fa48("208"), {
                    type: stryMutAct_9fa48("209") ? "" : (stryCov_9fa48("209"), 'ERROR'),
                    error: stryMutAct_9fa48("210") ? "" : (stryCov_9fa48("210"), 'VAULT_LOCKED')
                  }));
                  return;
                }
              }
              try {
                if (stryMutAct_9fa48("211")) {
                  {}
                } else {
                  stryCov_9fa48("211");
                  const creds = await vaultService.getPasswords();
                  const filteredCreds = domain ? stryMutAct_9fa48("212") ? creds : (stryCov_9fa48("212"), creds.filter(stryMutAct_9fa48("213") ? () => undefined : (stryCov_9fa48("213"), c => this.isExactDomainMatch(stryMutAct_9fa48("216") ? c.website && '' : stryMutAct_9fa48("215") ? false : stryMutAct_9fa48("214") ? true : (stryCov_9fa48("214", "215", "216"), c.website || (stryMutAct_9fa48("217") ? "Stryker was here!" : (stryCov_9fa48("217"), ''))), domain)))) : stryMutAct_9fa48("218") ? ["Stryker was here"] : (stryCov_9fa48("218"), []);
                  const selected = stryMutAct_9fa48("219") ? filteredCreds.map(c => ({
                    title: c.title,
                    username: c.username,
                    pass: c.pass || '',
                    website: c.website || ''
                  })) : (stryCov_9fa48("219"), filteredCreds.slice(0, 1).map(stryMutAct_9fa48("220") ? () => undefined : (stryCov_9fa48("220"), c => stryMutAct_9fa48("221") ? {} : (stryCov_9fa48("221"), {
                    title: c.title,
                    username: c.username,
                    pass: stryMutAct_9fa48("224") ? c.pass && '' : stryMutAct_9fa48("223") ? false : stryMutAct_9fa48("222") ? true : (stryCov_9fa48("222", "223", "224"), c.pass || (stryMutAct_9fa48("225") ? "Stryker was here!" : (stryCov_9fa48("225"), ''))),
                    website: stryMutAct_9fa48("228") ? c.website && '' : stryMutAct_9fa48("227") ? false : stryMutAct_9fa48("226") ? true : (stryCov_9fa48("226", "227", "228"), c.website || (stryMutAct_9fa48("229") ? "Stryker was here!" : (stryCov_9fa48("229"), '')))
                  }))));
                  port.postMessage(stryMutAct_9fa48("230") ? {} : (stryCov_9fa48("230"), {
                    type: stryMutAct_9fa48("231") ? "" : (stryCov_9fa48("231"), 'DECRYPTED_CREDS_RESPONSE'),
                    data: selected
                  }));
                }
              } catch {
                if (stryMutAct_9fa48("232")) {
                  {}
                } else {
                  stryCov_9fa48("232");
                  port.postMessage(stryMutAct_9fa48("233") ? {} : (stryCov_9fa48("233"), {
                    type: stryMutAct_9fa48("234") ? "" : (stryCov_9fa48("234"), 'ERROR'),
                    error: stryMutAct_9fa48("235") ? "" : (stryCov_9fa48("235"), 'INTERNAL_ERROR')
                  }));
                }
              }
            }
          }
        }
      });
      port.onDisconnect.addListener(() => {
        if (stryMutAct_9fa48("236")) {
          {}
        } else {
          stryCov_9fa48("236");
          const active = this.activeSessions.get(port);
          if (stryMutAct_9fa48("238") ? false : stryMutAct_9fa48("237") ? true : (stryCov_9fa48("237", "238"), active)) {
            if (stryMutAct_9fa48("239")) {
              {}
            } else {
              stryCov_9fa48("239");
              active.challengeNonceMap.clear();
            }
          }
          this.activeSessions.delete(port);
        }
      });
    }
  }
  private messageListener = async (event: MessageEvent) => {
    if (stryMutAct_9fa48("240")) {
      {}
    } else {
      stryCov_9fa48("240");
      if (stryMutAct_9fa48("243") ? event.origin !== window.location.origin || !event.origin.startsWith('chrome-extension://') : stryMutAct_9fa48("242") ? false : stryMutAct_9fa48("241") ? true : (stryCov_9fa48("241", "242", "243"), (stryMutAct_9fa48("245") ? event.origin === window.location.origin : stryMutAct_9fa48("244") ? true : (stryCov_9fa48("244", "245"), event.origin !== window.location.origin)) && (stryMutAct_9fa48("246") ? event.origin.startsWith('chrome-extension://') : (stryCov_9fa48("246"), !(stryMutAct_9fa48("247") ? event.origin.endsWith('chrome-extension://') : (stryCov_9fa48("247"), event.origin.startsWith(stryMutAct_9fa48("248") ? "" : (stryCov_9fa48("248"), 'chrome-extension://')))))))) {
        if (stryMutAct_9fa48("249")) {
          {}
        } else {
          stryCov_9fa48("249");
          return;
        }
      }
      const data = event.data;
      if (stryMutAct_9fa48("252") ? typeof data !== 'object' && !data : stryMutAct_9fa48("251") ? false : stryMutAct_9fa48("250") ? true : (stryCov_9fa48("250", "251", "252"), (stryMutAct_9fa48("254") ? typeof data === 'object' : stryMutAct_9fa48("253") ? false : (stryCov_9fa48("253", "254"), typeof data !== (stryMutAct_9fa48("255") ? "" : (stryCov_9fa48("255"), 'object')))) || (stryMutAct_9fa48("256") ? data : (stryCov_9fa48("256"), !data)))) return;
      if (stryMutAct_9fa48("259") ? data.type === 'AEGIS_EXTENSION_HELLO' : stryMutAct_9fa48("258") ? false : stryMutAct_9fa48("257") ? true : (stryCov_9fa48("257", "258", "259"), data.type !== (stryMutAct_9fa48("260") ? "" : (stryCov_9fa48("260"), 'AEGIS_EXTENSION_HELLO')))) return;
      const incomingExtensionId = data.extensionId;
      if (stryMutAct_9fa48("263") ? !incomingExtensionId && typeof incomingExtensionId !== 'string' : stryMutAct_9fa48("262") ? false : stryMutAct_9fa48("261") ? true : (stryCov_9fa48("261", "262", "263"), (stryMutAct_9fa48("264") ? incomingExtensionId : (stryCov_9fa48("264"), !incomingExtensionId)) || (stryMutAct_9fa48("266") ? typeof incomingExtensionId === 'string' : stryMutAct_9fa48("265") ? false : (stryCov_9fa48("265", "266"), typeof incomingExtensionId !== (stryMutAct_9fa48("267") ? "" : (stryCov_9fa48("267"), 'string')))))) {
        if (stryMutAct_9fa48("268")) {
          {}
        } else {
          stryCov_9fa48("268");
          return;
        }
      }
      if (stryMutAct_9fa48("271") ? false : stryMutAct_9fa48("270") ? true : stryMutAct_9fa48("269") ? this.isExtensionAllowed(incomingExtensionId) : (stryCov_9fa48("269", "270", "271"), !this.isExtensionAllowed(incomingExtensionId))) {
        if (stryMutAct_9fa48("272")) {
          {}
        } else {
          stryCov_9fa48("272");
          return;
        }
      }
      const runtime = this.getRuntime();
      if (stryMutAct_9fa48("275") ? false : stryMutAct_9fa48("274") ? true : stryMutAct_9fa48("273") ? runtime : (stryCov_9fa48("273", "274", "275"), !runtime)) return;
      try {
        if (stryMutAct_9fa48("276")) {
          {}
        } else {
          stryCov_9fa48("276");
          const port = runtime.connect(incomingExtensionId, stryMutAct_9fa48("277") ? {} : (stryCov_9fa48("277"), {
            name: stryMutAct_9fa48("278") ? "" : (stryCov_9fa48("278"), 'aegis-pwa-vault-port')
          }));
          this.attachPort(incomingExtensionId, port);
        }
      } catch (error) {
        if (stryMutAct_9fa48("279")) {
          {}
        } else {
          stryCov_9fa48("279");
          console.error(stryMutAct_9fa48("280") ? "" : (stryCov_9fa48("280"), '[PWA Bridge] Eklenti ile runtime (externally_connectable) baglantisi kurulamad�.'), error);
        }
      }
    }
  };
  public init() {
    if (stryMutAct_9fa48("281")) {
      {}
    } else {
      stryCov_9fa48("281");
      if (stryMutAct_9fa48("283") ? false : stryMutAct_9fa48("282") ? true : (stryCov_9fa48("282", "283"), this.isListening)) return;
      this.isListening = stryMutAct_9fa48("284") ? false : (stryCov_9fa48("284"), true);
      window.addEventListener(stryMutAct_9fa48("285") ? "" : (stryCov_9fa48("285"), 'message'), this.messageListener);
    }
  }
  public getAllowedExtensionIds(): string[] {
    if (stryMutAct_9fa48("286")) {
      {}
    } else {
      stryCov_9fa48("286");
      return Array.from(this.allowedExtensionIds);
    }
  }
  public updateAllowedExtensionIds(ids: string[]): void {
    if (stryMutAct_9fa48("287")) {
      {}
    } else {
      stryCov_9fa48("287");
      const normalized = stryMutAct_9fa48("288") ? ids.map(id => id.trim()) : (stryCov_9fa48("288"), ids.map(stryMutAct_9fa48("289") ? () => undefined : (stryCov_9fa48("289"), id => stryMutAct_9fa48("290") ? id : (stryCov_9fa48("290"), id.trim()))).filter(Boolean));
      if (stryMutAct_9fa48("293") ? normalized.length !== 0 : stryMutAct_9fa48("292") ? false : stryMutAct_9fa48("291") ? true : (stryCov_9fa48("291", "292", "293"), normalized.length === 0)) {
        if (stryMutAct_9fa48("294")) {
          {}
        } else {
          stryCov_9fa48("294");
          this.allowedExtensionIds = new Set(DEFAULT_ALLOWED_EXTENSION_IDS);
        }
      } else {
        if (stryMutAct_9fa48("295")) {
          {}
        } else {
          stryCov_9fa48("295");
          this.allowedExtensionIds = new Set(normalized);
        }
      }
      this.persistAllowlist();
      this.lockAndDisconnect();
    }
  }
  public addAllowedExtensionId(id: string): void {
    if (stryMutAct_9fa48("296")) {
      {}
    } else {
      stryCov_9fa48("296");
      const normalized = stryMutAct_9fa48("297") ? id : (stryCov_9fa48("297"), id.trim());
      if (stryMutAct_9fa48("300") ? false : stryMutAct_9fa48("299") ? true : stryMutAct_9fa48("298") ? normalized : (stryCov_9fa48("298", "299", "300"), !normalized)) return;
      this.allowedExtensionIds.add(normalized);
      this.persistAllowlist();
    }
  }
  public removeAllowedExtensionId(id: string): void {
    if (stryMutAct_9fa48("301")) {
      {}
    } else {
      stryCov_9fa48("301");
      this.allowedExtensionIds.delete(stryMutAct_9fa48("302") ? id : (stryCov_9fa48("302"), id.trim()));
      if (stryMutAct_9fa48("305") ? this.allowedExtensionIds.size !== 0 : stryMutAct_9fa48("304") ? false : stryMutAct_9fa48("303") ? true : (stryCov_9fa48("303", "304", "305"), this.allowedExtensionIds.size === 0)) {
        if (stryMutAct_9fa48("306")) {
          {}
        } else {
          stryCov_9fa48("306");
          this.allowedExtensionIds = new Set(DEFAULT_ALLOWED_EXTENSION_IDS);
        }
      }
      this.persistAllowlist();
      this.lockAndDisconnect();
    }
  }
  public lockAndDisconnect() {
    if (stryMutAct_9fa48("307")) {
      {}
    } else {
      stryCov_9fa48("307");
      for (const [port, session] of this.activeSessions.entries()) {
        if (stryMutAct_9fa48("308")) {
          {}
        } else {
          stryCov_9fa48("308");
          try {
            if (stryMutAct_9fa48("309")) {
              {}
            } else {
              stryCov_9fa48("309");
              port.postMessage(stryMutAct_9fa48("310") ? {} : (stryCov_9fa48("310"), {
                type: stryMutAct_9fa48("311") ? "" : (stryCov_9fa48("311"), 'VAULT_LOCKED')
              }));
              port.disconnect();
            }
          } catch {
            /* port may already be closed */
          }
          session.challengeNonceMap.clear();
          this.activeSessions.delete(port);
        }
      }
    }
  }
  public dispose() {
    if (stryMutAct_9fa48("312")) {
      {}
    } else {
      stryCov_9fa48("312");
      this.isListening = stryMutAct_9fa48("313") ? true : (stryCov_9fa48("313"), false);
      window.removeEventListener(stryMutAct_9fa48("314") ? "" : (stryCov_9fa48("314"), 'message'), this.messageListener);
      this.lockAndDisconnect();
    }
  }
  private generateToken() {
    if (stryMutAct_9fa48("315")) {
      {}
    } else {
      stryCov_9fa48("315");
      const array = new Uint8Array(16);
      window.crypto.getRandomValues(array);
      return Array.from(array, stryMutAct_9fa48("316") ? () => undefined : (stryCov_9fa48("316"), byte => byte.toString(16).padStart(2, stryMutAct_9fa48("317") ? "" : (stryCov_9fa48("317"), '0')))).join(stryMutAct_9fa48("318") ? "Stryker was here!" : (stryCov_9fa48("318"), ''));
    }
  }

  /** @internal ONLY FOR TESTING */
  public reset() {
    if (stryMutAct_9fa48("319")) {
      {}
    } else {
      stryCov_9fa48("319");
      this.isListening = stryMutAct_9fa48("320") ? true : (stryCov_9fa48("320"), false);
      this.activeSessions.clear();
      this.allowedExtensionIds = new Set(buildInitialAllowlist());
      this.loadAllowlistFromStorage();
      window.removeEventListener(stryMutAct_9fa48("321") ? "" : (stryCov_9fa48("321"), 'message'), this.messageListener);
    }
  }
}
export const extensionBridge = new ExtensionBridge();