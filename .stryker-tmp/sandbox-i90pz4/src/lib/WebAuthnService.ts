/**
 * WebAuthnService — Aegis 4.2 Faz 1 / Adim 1.1
 *
 * Site passkey kayit (registration) ve kimlik dogrulama (authentication)
 * islemlerini yoneten servis katmani.
 *
 * 4.1'deki vault-unlock PRF akisindan farkli olarak bu servis,
 * kullanicinin web sitelerine passkey ile giris yapmasini saglayan
 * relying-party (RP) odakli WebAuthn akislarini yonetir.
 */
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
import { bufferToBase64url, base64urlToBuffer } from './webAuthn';
import type { CanonicalPasskeyFields } from './canonical-schema';

/* ------------------------------------------------------------------ */
/*  Tipler                                                             */
/* ------------------------------------------------------------------ */

/** Site passkey kayit sonucu */
export interface SitePasskeyRegistrationResult {
  credentialId: string;
  publicKeyBase64: string;
  rpId: string;
  userHandle: string;
  displayName: string;
  transport: string[];
  authenticatorAttachment: string;
  algorithm: number;
  registeredAt: string;
}

/** Site passkey kimlik dogrulama sonucu */
export interface SitePasskeyAuthResult {
  credentialId: string;
  rpId: string;
  authenticatorDataBase64: string;
  clientDataJSONBase64: string;
  signatureBase64: string;
  userHandleBase64: string | null;
  authenticatedAt: string;
}

/** Kayit icin gerekli RP bilgisi */
export interface SitePasskeyRegistrationOptions {
  rpId: string;
  rpName: string;
  userName: string;
  userDisplayName: string;
  userId?: string;
  timeout?: number;
  authenticatorAttachment?: AuthenticatorAttachment;
  residentKey?: ResidentKeyRequirement;
  userVerification?: UserVerificationRequirement;
  attestation?: AttestationConveyancePreference;
  excludeCredentialIds?: string[];
}

/** Dogrulama icin gerekli bilgi */
export interface SitePasskeyAuthOptions {
  rpId: string;
  allowCredentialIds?: string[];
  timeout?: number;
  userVerification?: UserVerificationRequirement;
}

/* ------------------------------------------------------------------ */
/*  WebAuthn Tip Genişletmeleri                                        */
/* ------------------------------------------------------------------ */

/** TypeScript DOM lib henüz authenticatorAttachment içermiyor */
interface PublicKeyCredentialWithAttachment extends PublicKeyCredential {
  authenticatorAttachment: string | null;
}

/* ------------------------------------------------------------------ */
/*  Yardimci fonksiyonlar                                              */
/* ------------------------------------------------------------------ */

/** WebAuthn API destegini kontrol eder */
export function isWebAuthnSupported(): boolean {
  if (stryMutAct_9fa48("111")) {
    {}
  } else {
    stryCov_9fa48("111");
    return stryMutAct_9fa48("114") ? typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined' || typeof navigator.credentials !== 'undefined' : stryMutAct_9fa48("113") ? false : stryMutAct_9fa48("112") ? true : (stryCov_9fa48("112", "113", "114"), (stryMutAct_9fa48("116") ? typeof window !== 'undefined' || typeof window.PublicKeyCredential !== 'undefined' : stryMutAct_9fa48("115") ? true : (stryCov_9fa48("115", "116"), (stryMutAct_9fa48("118") ? typeof window === 'undefined' : stryMutAct_9fa48("117") ? true : (stryCov_9fa48("117", "118"), typeof window !== (stryMutAct_9fa48("119") ? "" : (stryCov_9fa48("119"), 'undefined')))) && (stryMutAct_9fa48("121") ? typeof window.PublicKeyCredential === 'undefined' : stryMutAct_9fa48("120") ? true : (stryCov_9fa48("120", "121"), typeof window.PublicKeyCredential !== (stryMutAct_9fa48("122") ? "" : (stryCov_9fa48("122"), 'undefined')))))) && (stryMutAct_9fa48("124") ? typeof navigator.credentials === 'undefined' : stryMutAct_9fa48("123") ? true : (stryCov_9fa48("123", "124"), typeof navigator.credentials !== (stryMutAct_9fa48("125") ? "" : (stryCov_9fa48("125"), 'undefined')))));
  }
}

/** Conditional UI (autofill) destegini kontrol eder */
export async function isConditionalMediationSupported(): Promise<boolean> {
  if (stryMutAct_9fa48("126")) {
    {}
  } else {
    stryCov_9fa48("126");
    if (stryMutAct_9fa48("129") ? false : stryMutAct_9fa48("128") ? true : stryMutAct_9fa48("127") ? isWebAuthnSupported() : (stryCov_9fa48("127", "128", "129"), !isWebAuthnSupported())) return stryMutAct_9fa48("130") ? true : (stryCov_9fa48("130"), false);
    try {
      if (stryMutAct_9fa48("131")) {
        {}
      } else {
        stryCov_9fa48("131");
        if (stryMutAct_9fa48("134") ? typeof PublicKeyCredential.isConditionalMediationAvailable !== 'function' : stryMutAct_9fa48("133") ? false : stryMutAct_9fa48("132") ? true : (stryCov_9fa48("132", "133", "134"), typeof PublicKeyCredential.isConditionalMediationAvailable === (stryMutAct_9fa48("135") ? "" : (stryCov_9fa48("135"), 'function')))) {
          if (stryMutAct_9fa48("136")) {
            {}
          } else {
            stryCov_9fa48("136");
            return await PublicKeyCredential.isConditionalMediationAvailable();
          }
        }
      }
    } catch {
      /* tarayici desteklemiyorsa sessizce false don */
    }
    return stryMutAct_9fa48("137") ? true : (stryCov_9fa48("137"), false);
  }
}

/** RP ID'yi URL'den cikarir */
export function extractRpIdFromUrl(url: string): string {
  if (stryMutAct_9fa48("138")) {
    {}
  } else {
    stryCov_9fa48("138");
    try {
      if (stryMutAct_9fa48("139")) {
        {}
      } else {
        stryCov_9fa48("139");
        const parsed = new URL((stryMutAct_9fa48("140") ? url.endsWith('http') : (stryCov_9fa48("140"), url.startsWith(stryMutAct_9fa48("141") ? "" : (stryCov_9fa48("141"), 'http')))) ? url : stryMutAct_9fa48("142") ? `` : (stryCov_9fa48("142"), `https://${url}`));
        return parsed.hostname;
      }
    } catch {
      if (stryMutAct_9fa48("143")) {
        {}
      } else {
        stryCov_9fa48("143");
        return url;
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Ana servis                                                         */
/* ------------------------------------------------------------------ */

export class WebAuthnService {
  /**
   * Bir web sitesi (RP) icin yeni site passkey kaydeder.
   *
   * Bu fonksiyon `navigator.credentials.create()` kullanarak
   * WebAuthn kayit seremoni baslatir.
   */
  static async registerSitePasskey(options: SitePasskeyRegistrationOptions): Promise<SitePasskeyRegistrationResult | null> {
    if (stryMutAct_9fa48("144")) {
      {}
    } else {
      stryCov_9fa48("144");
      if (stryMutAct_9fa48("147") ? false : stryMutAct_9fa48("146") ? true : stryMutAct_9fa48("145") ? isWebAuthnSupported() : (stryCov_9fa48("145", "146", "147"), !isWebAuthnSupported())) {
        if (stryMutAct_9fa48("148")) {
          {}
        } else {
          stryCov_9fa48("148");
          throw new Error(stryMutAct_9fa48("149") ? "" : (stryCov_9fa48("149"), 'WebAuthn is not supported in this browser.'));
        }
      }
      const userId = options.userId ? new TextEncoder().encode(options.userId) : window.crypto.getRandomValues(new Uint8Array(32));
      const challenge = window.crypto.getRandomValues(new Uint8Array(32));
      const excludeCredentials: PublicKeyCredentialDescriptor[] = (stryMutAct_9fa48("152") ? options.excludeCredentialIds && [] : stryMutAct_9fa48("151") ? false : stryMutAct_9fa48("150") ? true : (stryCov_9fa48("150", "151", "152"), options.excludeCredentialIds || (stryMutAct_9fa48("153") ? ["Stryker was here"] : (stryCov_9fa48("153"), [])))).map(stryMutAct_9fa48("154") ? () => undefined : (stryCov_9fa48("154"), id => stryMutAct_9fa48("155") ? {} : (stryCov_9fa48("155"), {
        type: 'public-key' as const,
        id: base64urlToBuffer(id)
      })));
      const publicKeyOptions: PublicKeyCredentialCreationOptions = stryMutAct_9fa48("156") ? {} : (stryCov_9fa48("156"), {
        challenge,
        rp: stryMutAct_9fa48("157") ? {} : (stryCov_9fa48("157"), {
          id: options.rpId,
          name: stryMutAct_9fa48("160") ? options.rpName && options.rpId : stryMutAct_9fa48("159") ? false : stryMutAct_9fa48("158") ? true : (stryCov_9fa48("158", "159", "160"), options.rpName || options.rpId)
        }),
        user: stryMutAct_9fa48("161") ? {} : (stryCov_9fa48("161"), {
          id: userId,
          name: options.userName,
          displayName: stryMutAct_9fa48("164") ? options.userDisplayName && options.userName : stryMutAct_9fa48("163") ? false : stryMutAct_9fa48("162") ? true : (stryCov_9fa48("162", "163", "164"), options.userDisplayName || options.userName)
        }),
        pubKeyCredParams: stryMutAct_9fa48("165") ? [] : (stryCov_9fa48("165"), [stryMutAct_9fa48("166") ? {} : (stryCov_9fa48("166"), {
          type: stryMutAct_9fa48("167") ? "" : (stryCov_9fa48("167"), 'public-key'),
          alg: stryMutAct_9fa48("168") ? +7 : (stryCov_9fa48("168"), -7)
        }), // ES256
        stryMutAct_9fa48("169") ? {} : (stryCov_9fa48("169"), {
          type: stryMutAct_9fa48("170") ? "" : (stryCov_9fa48("170"), 'public-key'),
          alg: stryMutAct_9fa48("171") ? +257 : (stryCov_9fa48("171"), -257)
        }) // RS256
        ]),
        timeout: stryMutAct_9fa48("174") ? options.timeout && 60000 : stryMutAct_9fa48("173") ? false : stryMutAct_9fa48("172") ? true : (stryCov_9fa48("172", "173", "174"), options.timeout || 60000),
        attestation: stryMutAct_9fa48("177") ? options.attestation && 'none' : stryMutAct_9fa48("176") ? false : stryMutAct_9fa48("175") ? true : (stryCov_9fa48("175", "176", "177"), options.attestation || (stryMutAct_9fa48("178") ? "" : (stryCov_9fa48("178"), 'none'))),
        excludeCredentials,
        authenticatorSelection: stryMutAct_9fa48("179") ? {} : (stryCov_9fa48("179"), {
          authenticatorAttachment: stryMutAct_9fa48("182") ? options.authenticatorAttachment && 'platform' : stryMutAct_9fa48("181") ? false : stryMutAct_9fa48("180") ? true : (stryCov_9fa48("180", "181", "182"), options.authenticatorAttachment || (stryMutAct_9fa48("183") ? "" : (stryCov_9fa48("183"), 'platform'))),
          residentKey: stryMutAct_9fa48("186") ? options.residentKey && 'preferred' : stryMutAct_9fa48("185") ? false : stryMutAct_9fa48("184") ? true : (stryCov_9fa48("184", "185", "186"), options.residentKey || (stryMutAct_9fa48("187") ? "" : (stryCov_9fa48("187"), 'preferred'))),
          userVerification: stryMutAct_9fa48("190") ? options.userVerification && 'preferred' : stryMutAct_9fa48("189") ? false : stryMutAct_9fa48("188") ? true : (stryCov_9fa48("188", "189", "190"), options.userVerification || (stryMutAct_9fa48("191") ? "" : (stryCov_9fa48("191"), 'preferred')))
        })
      });

      // Note: When attachment is 'cross-platform', browsers usually offer QR code (hybrid).
      // We allow the user to specify it via options, defaulting to 'platform'.
      if (stryMutAct_9fa48("194") ? options.authenticatorAttachment === 'cross-platform' || publicKeyOptions.authenticatorSelection : stryMutAct_9fa48("193") ? false : stryMutAct_9fa48("192") ? true : (stryCov_9fa48("192", "193", "194"), (stryMutAct_9fa48("196") ? options.authenticatorAttachment !== 'cross-platform' : stryMutAct_9fa48("195") ? true : (stryCov_9fa48("195", "196"), options.authenticatorAttachment === (stryMutAct_9fa48("197") ? "" : (stryCov_9fa48("197"), 'cross-platform')))) && publicKeyOptions.authenticatorSelection)) {
        if (stryMutAct_9fa48("198")) {
          {}
        } else {
          stryCov_9fa48("198");
          publicKeyOptions.authenticatorSelection.authenticatorAttachment = stryMutAct_9fa48("199") ? "" : (stryCov_9fa48("199"), 'cross-platform');
        }
      }
      try {
        if (stryMutAct_9fa48("200")) {
          {}
        } else {
          stryCov_9fa48("200");
          const resp = await navigator.credentials.create(stryMutAct_9fa48("201") ? {} : (stryCov_9fa48("201"), {
            publicKey: publicKeyOptions
          }));
          const credential = resp as PublicKeyCredential;
          if (stryMutAct_9fa48("204") ? false : stryMutAct_9fa48("203") ? true : stryMutAct_9fa48("202") ? credential : (stryCov_9fa48("202", "203", "204"), !credential)) return null;
          const response = credential.response as AuthenticatorAttestationResponse;
          const publicKeyBytes = stryMutAct_9fa48("205") ? response.getPublicKey() : (stryCov_9fa48("205"), response.getPublicKey?.());

          // Transport bilgisi
          let transports: string[] = stryMutAct_9fa48("206") ? ["Stryker was here"] : (stryCov_9fa48("206"), []);
          if (stryMutAct_9fa48("209") ? typeof response.getTransports !== 'function' : stryMutAct_9fa48("208") ? false : stryMutAct_9fa48("207") ? true : (stryCov_9fa48("207", "208", "209"), typeof response.getTransports === (stryMutAct_9fa48("210") ? "" : (stryCov_9fa48("210"), 'function')))) {
            if (stryMutAct_9fa48("211")) {
              {}
            } else {
              stryCov_9fa48("211");
              transports = response.getTransports() as string[];
            }
          }

          // Algoritma bilgisi
          let algorithm = stryMutAct_9fa48("212") ? +7 : (stryCov_9fa48("212"), -7); // ES256 varsayilan
          if (stryMutAct_9fa48("215") ? typeof response.getPublicKeyAlgorithm !== 'function' : stryMutAct_9fa48("214") ? false : stryMutAct_9fa48("213") ? true : (stryCov_9fa48("213", "214", "215"), typeof response.getPublicKeyAlgorithm === (stryMutAct_9fa48("216") ? "" : (stryCov_9fa48("216"), 'function')))) {
            if (stryMutAct_9fa48("217")) {
              {}
            } else {
              stryCov_9fa48("217");
              algorithm = response.getPublicKeyAlgorithm();
            }
          }
          return stryMutAct_9fa48("218") ? {} : (stryCov_9fa48("218"), {
            credentialId: credential.id,
            publicKeyBase64: publicKeyBytes ? bufferToBase64url(publicKeyBytes) : stryMutAct_9fa48("219") ? "Stryker was here!" : (stryCov_9fa48("219"), ''),
            rpId: options.rpId,
            userHandle: bufferToBase64url(userId instanceof Uint8Array ? stryMutAct_9fa48("220") ? userId.buffer : (stryCov_9fa48("220"), userId.buffer.slice(userId.byteOffset, stryMutAct_9fa48("221") ? userId.byteOffset - userId.byteLength : (stryCov_9fa48("221"), userId.byteOffset + userId.byteLength))) : userId),
            displayName: stryMutAct_9fa48("224") ? options.userDisplayName && options.userName : stryMutAct_9fa48("223") ? false : stryMutAct_9fa48("222") ? true : (stryCov_9fa48("222", "223", "224"), options.userDisplayName || options.userName),
            transport: transports,
            authenticatorAttachment: stryMutAct_9fa48("227") ? ((credential as PublicKeyCredentialWithAttachment).authenticatorAttachment || options.authenticatorAttachment) && 'platform' : stryMutAct_9fa48("226") ? false : stryMutAct_9fa48("225") ? true : (stryCov_9fa48("225", "226", "227"), (stryMutAct_9fa48("229") ? (credential as PublicKeyCredentialWithAttachment).authenticatorAttachment && options.authenticatorAttachment : stryMutAct_9fa48("228") ? false : (stryCov_9fa48("228", "229"), (credential as PublicKeyCredentialWithAttachment).authenticatorAttachment || options.authenticatorAttachment)) || (stryMutAct_9fa48("230") ? "" : (stryCov_9fa48("230"), 'platform'))),
            algorithm,
            registeredAt: new Date().toISOString()
          });
        }
      } catch (error) {
        if (stryMutAct_9fa48("231")) {
          {}
        } else {
          stryCov_9fa48("231");
          console.error(stryMutAct_9fa48("232") ? "" : (stryCov_9fa48("232"), '[WebAuthnService] Site passkey registration failed:'), error);
          return null;
        }
      }
    }
  }

  /**
   * Kayitli bir site passkey ile kimlik dogrulama yapar.
   *
   * Bu fonksiyon `navigator.credentials.get()` kullanarak
   * WebAuthn dogrulama seremoni baslatir.
   */
  static async authenticateSitePasskey(options: SitePasskeyAuthOptions): Promise<SitePasskeyAuthResult | null> {
    if (stryMutAct_9fa48("233")) {
      {}
    } else {
      stryCov_9fa48("233");
      if (stryMutAct_9fa48("236") ? false : stryMutAct_9fa48("235") ? true : stryMutAct_9fa48("234") ? isWebAuthnSupported() : (stryCov_9fa48("234", "235", "236"), !isWebAuthnSupported())) {
        if (stryMutAct_9fa48("237")) {
          {}
        } else {
          stryCov_9fa48("237");
          throw new Error(stryMutAct_9fa48("238") ? "" : (stryCov_9fa48("238"), 'WebAuthn is not supported in this browser.'));
        }
      }
      const challenge = window.crypto.getRandomValues(new Uint8Array(32));
      const allowCredentials: PublicKeyCredentialDescriptor[] | undefined = stryMutAct_9fa48("239") ? options.allowCredentialIds.map(id => ({
        type: 'public-key' as const,
        id: base64urlToBuffer(id),
        transports: ['internal', 'hybrid', 'usb', 'ble', 'nfc'] as AuthenticatorTransport[]
      })) : (stryCov_9fa48("239"), options.allowCredentialIds?.map(stryMutAct_9fa48("240") ? () => undefined : (stryCov_9fa48("240"), id => stryMutAct_9fa48("241") ? {} : (stryCov_9fa48("241"), {
        type: 'public-key' as const,
        id: base64urlToBuffer(id),
        transports: ['internal', 'hybrid', 'usb', 'ble', 'nfc'] as AuthenticatorTransport[]
      }))));
      const publicKeyOptions: PublicKeyCredentialRequestOptions = stryMutAct_9fa48("242") ? {} : (stryCov_9fa48("242"), {
        challenge,
        rpId: options.rpId,
        allowCredentials,
        userVerification: stryMutAct_9fa48("245") ? options.userVerification && 'preferred' : stryMutAct_9fa48("244") ? false : stryMutAct_9fa48("243") ? true : (stryCov_9fa48("243", "244", "245"), options.userVerification || (stryMutAct_9fa48("246") ? "" : (stryCov_9fa48("246"), 'preferred'))),
        timeout: stryMutAct_9fa48("249") ? options.timeout && 60000 : stryMutAct_9fa48("248") ? false : stryMutAct_9fa48("247") ? true : (stryCov_9fa48("247", "248", "249"), options.timeout || 60000)
      });
      try {
        if (stryMutAct_9fa48("250")) {
          {}
        } else {
          stryCov_9fa48("250");
          const assertion = (await navigator.credentials.get({
            publicKey: publicKeyOptions
          })) as PublicKeyCredential | null;
          if (stryMutAct_9fa48("253") ? false : stryMutAct_9fa48("252") ? true : stryMutAct_9fa48("251") ? assertion : (stryCov_9fa48("251", "252", "253"), !assertion)) return null;
          const response = assertion.response as AuthenticatorAssertionResponse;
          return stryMutAct_9fa48("254") ? {} : (stryCov_9fa48("254"), {
            credentialId: assertion.id,
            rpId: options.rpId,
            authenticatorDataBase64: bufferToBase64url(response.authenticatorData),
            clientDataJSONBase64: bufferToBase64url(response.clientDataJSON),
            signatureBase64: bufferToBase64url(response.signature),
            userHandleBase64: response.userHandle ? bufferToBase64url(response.userHandle) : null,
            authenticatedAt: new Date().toISOString()
          });
        }
      } catch (error) {
        if (stryMutAct_9fa48("255")) {
          {}
        } else {
          stryCov_9fa48("255");
          console.error(stryMutAct_9fa48("256") ? "" : (stryCov_9fa48("256"), '[WebAuthnService] Site passkey authentication failed:'), error);
          return null;
        }
      }
    }
  }

  /**
   * Kayit sonucunu CanonicalPasskeyFields formatina donusturur.
   * Bu format VaultEntry.passkeyMetadata ile uyumludur.
   */
  static registrationToPasskeyMetadata(result: SitePasskeyRegistrationResult): CanonicalPasskeyFields {
    if (stryMutAct_9fa48("257")) {
      {}
    } else {
      stryCov_9fa48("257");
      return stryMutAct_9fa48("258") ? {} : (stryCov_9fa48("258"), {
        rp_id: result.rpId,
        credential_id: result.credentialId,
        user_handle: result.userHandle,
        display_name: result.displayName,
        transport: result.transport.join(stryMutAct_9fa48("259") ? "" : (stryCov_9fa48("259"), ',')),
        authenticator_attachment: result.authenticatorAttachment,
        algorithm: String(result.algorithm),
        mode: stryMutAct_9fa48("260") ? "" : (stryCov_9fa48("260"), 'site_passkey_active'),
        server_verified: stryMutAct_9fa48("261") ? true : (stryCov_9fa48("261"), false),
        created_at: result.registeredAt,
        last_registration_at: result.registeredAt,
        last_auth_at: undefined
      });
    }
  }

  /**
   * Basarili dogrulama sonrasi passkey metadata'yi gunceller.
   */
  static updateMetadataAfterAuth(existing: CanonicalPasskeyFields, authResult: SitePasskeyAuthResult): CanonicalPasskeyFields {
    if (stryMutAct_9fa48("262")) {
      {}
    } else {
      stryCov_9fa48("262");
      return stryMutAct_9fa48("263") ? {} : (stryCov_9fa48("263"), {
        ...existing,
        credential_id: stryMutAct_9fa48("266") ? existing.credential_id && authResult.credentialId : stryMutAct_9fa48("265") ? false : stryMutAct_9fa48("264") ? true : (stryCov_9fa48("264", "265", "266"), existing.credential_id || authResult.credentialId),
        server_verified: stryMutAct_9fa48("267") ? false : (stryCov_9fa48("267"), true),
        last_auth_at: authResult.authenticatedAt
      });
    }
  }
}