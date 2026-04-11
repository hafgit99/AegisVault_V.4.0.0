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
  if (stryMutAct_9fa48("1499")) {
    {}
  } else {
    stryCov_9fa48("1499");
    return stryMutAct_9fa48("1502") ? typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined' || typeof navigator.credentials !== 'undefined' : stryMutAct_9fa48("1501") ? false : stryMutAct_9fa48("1500") ? true : (stryCov_9fa48("1500", "1501", "1502"), (stryMutAct_9fa48("1504") ? typeof window !== 'undefined' || typeof window.PublicKeyCredential !== 'undefined' : stryMutAct_9fa48("1503") ? true : (stryCov_9fa48("1503", "1504"), (stryMutAct_9fa48("1506") ? typeof window === 'undefined' : stryMutAct_9fa48("1505") ? true : (stryCov_9fa48("1505", "1506"), typeof window !== (stryMutAct_9fa48("1507") ? "" : (stryCov_9fa48("1507"), 'undefined')))) && (stryMutAct_9fa48("1509") ? typeof window.PublicKeyCredential === 'undefined' : stryMutAct_9fa48("1508") ? true : (stryCov_9fa48("1508", "1509"), typeof window.PublicKeyCredential !== (stryMutAct_9fa48("1510") ? "" : (stryCov_9fa48("1510"), 'undefined')))))) && (stryMutAct_9fa48("1512") ? typeof navigator.credentials === 'undefined' : stryMutAct_9fa48("1511") ? true : (stryCov_9fa48("1511", "1512"), typeof navigator.credentials !== (stryMutAct_9fa48("1513") ? "" : (stryCov_9fa48("1513"), 'undefined')))));
  }
}

/** Conditional UI (autofill) destegini kontrol eder */
export async function isConditionalMediationSupported(): Promise<boolean> {
  if (stryMutAct_9fa48("1514")) {
    {}
  } else {
    stryCov_9fa48("1514");
    if (stryMutAct_9fa48("1517") ? false : stryMutAct_9fa48("1516") ? true : stryMutAct_9fa48("1515") ? isWebAuthnSupported() : (stryCov_9fa48("1515", "1516", "1517"), !isWebAuthnSupported())) return stryMutAct_9fa48("1518") ? true : (stryCov_9fa48("1518"), false);
    try {
      if (stryMutAct_9fa48("1519")) {
        {}
      } else {
        stryCov_9fa48("1519");
        if (stryMutAct_9fa48("1522") ? typeof PublicKeyCredential.isConditionalMediationAvailable !== 'function' : stryMutAct_9fa48("1521") ? false : stryMutAct_9fa48("1520") ? true : (stryCov_9fa48("1520", "1521", "1522"), typeof PublicKeyCredential.isConditionalMediationAvailable === (stryMutAct_9fa48("1523") ? "" : (stryCov_9fa48("1523"), 'function')))) {
          if (stryMutAct_9fa48("1524")) {
            {}
          } else {
            stryCov_9fa48("1524");
            return await PublicKeyCredential.isConditionalMediationAvailable();
          }
        }
      }
    } catch {
      /* tarayici desteklemiyorsa sessizce false don */
    }
    return stryMutAct_9fa48("1525") ? true : (stryCov_9fa48("1525"), false);
  }
}

/** RP ID'yi URL'den cikarir */
export function extractRpIdFromUrl(url: string): string {
  if (stryMutAct_9fa48("1526")) {
    {}
  } else {
    stryCov_9fa48("1526");
    try {
      if (stryMutAct_9fa48("1527")) {
        {}
      } else {
        stryCov_9fa48("1527");
        const parsed = new URL((stryMutAct_9fa48("1528") ? url.endsWith('http') : (stryCov_9fa48("1528"), url.startsWith(stryMutAct_9fa48("1529") ? "" : (stryCov_9fa48("1529"), 'http')))) ? url : stryMutAct_9fa48("1530") ? `` : (stryCov_9fa48("1530"), `https://${url}`));
        return parsed.hostname;
      }
    } catch {
      if (stryMutAct_9fa48("1531")) {
        {}
      } else {
        stryCov_9fa48("1531");
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
    if (stryMutAct_9fa48("1532")) {
      {}
    } else {
      stryCov_9fa48("1532");
      if (stryMutAct_9fa48("1535") ? false : stryMutAct_9fa48("1534") ? true : stryMutAct_9fa48("1533") ? isWebAuthnSupported() : (stryCov_9fa48("1533", "1534", "1535"), !isWebAuthnSupported())) {
        if (stryMutAct_9fa48("1536")) {
          {}
        } else {
          stryCov_9fa48("1536");
          throw new Error(stryMutAct_9fa48("1537") ? "" : (stryCov_9fa48("1537"), 'WebAuthn is not supported in this browser.'));
        }
      }
      const userId = options.userId ? new TextEncoder().encode(options.userId) : window.crypto.getRandomValues(new Uint8Array(32));
      const challenge = window.crypto.getRandomValues(new Uint8Array(32));
      const excludeCredentials: PublicKeyCredentialDescriptor[] = (stryMutAct_9fa48("1540") ? options.excludeCredentialIds && [] : stryMutAct_9fa48("1539") ? false : stryMutAct_9fa48("1538") ? true : (stryCov_9fa48("1538", "1539", "1540"), options.excludeCredentialIds || (stryMutAct_9fa48("1541") ? ["Stryker was here"] : (stryCov_9fa48("1541"), [])))).map(stryMutAct_9fa48("1542") ? () => undefined : (stryCov_9fa48("1542"), id => stryMutAct_9fa48("1543") ? {} : (stryCov_9fa48("1543"), {
        type: 'public-key' as const,
        id: base64urlToBuffer(id)
      })));
      const publicKeyOptions: PublicKeyCredentialCreationOptions = stryMutAct_9fa48("1544") ? {} : (stryCov_9fa48("1544"), {
        challenge,
        rp: stryMutAct_9fa48("1545") ? {} : (stryCov_9fa48("1545"), {
          id: options.rpId,
          name: stryMutAct_9fa48("1548") ? options.rpName && options.rpId : stryMutAct_9fa48("1547") ? false : stryMutAct_9fa48("1546") ? true : (stryCov_9fa48("1546", "1547", "1548"), options.rpName || options.rpId)
        }),
        user: stryMutAct_9fa48("1549") ? {} : (stryCov_9fa48("1549"), {
          id: userId,
          name: options.userName,
          displayName: stryMutAct_9fa48("1552") ? options.userDisplayName && options.userName : stryMutAct_9fa48("1551") ? false : stryMutAct_9fa48("1550") ? true : (stryCov_9fa48("1550", "1551", "1552"), options.userDisplayName || options.userName)
        }),
        pubKeyCredParams: stryMutAct_9fa48("1553") ? [] : (stryCov_9fa48("1553"), [stryMutAct_9fa48("1554") ? {} : (stryCov_9fa48("1554"), {
          type: stryMutAct_9fa48("1555") ? "" : (stryCov_9fa48("1555"), 'public-key'),
          alg: stryMutAct_9fa48("1556") ? +7 : (stryCov_9fa48("1556"), -7)
        }), // ES256
        stryMutAct_9fa48("1557") ? {} : (stryCov_9fa48("1557"), {
          type: stryMutAct_9fa48("1558") ? "" : (stryCov_9fa48("1558"), 'public-key'),
          alg: stryMutAct_9fa48("1559") ? +257 : (stryCov_9fa48("1559"), -257)
        }) // RS256
        ]),
        timeout: stryMutAct_9fa48("1562") ? options.timeout && 60000 : stryMutAct_9fa48("1561") ? false : stryMutAct_9fa48("1560") ? true : (stryCov_9fa48("1560", "1561", "1562"), options.timeout || 60000),
        attestation: stryMutAct_9fa48("1565") ? options.attestation && 'none' : stryMutAct_9fa48("1564") ? false : stryMutAct_9fa48("1563") ? true : (stryCov_9fa48("1563", "1564", "1565"), options.attestation || (stryMutAct_9fa48("1566") ? "" : (stryCov_9fa48("1566"), 'none'))),
        excludeCredentials,
        authenticatorSelection: stryMutAct_9fa48("1567") ? {} : (stryCov_9fa48("1567"), {
          authenticatorAttachment: stryMutAct_9fa48("1570") ? options.authenticatorAttachment && 'platform' : stryMutAct_9fa48("1569") ? false : stryMutAct_9fa48("1568") ? true : (stryCov_9fa48("1568", "1569", "1570"), options.authenticatorAttachment || (stryMutAct_9fa48("1571") ? "" : (stryCov_9fa48("1571"), 'platform'))),
          residentKey: stryMutAct_9fa48("1574") ? options.residentKey && 'preferred' : stryMutAct_9fa48("1573") ? false : stryMutAct_9fa48("1572") ? true : (stryCov_9fa48("1572", "1573", "1574"), options.residentKey || (stryMutAct_9fa48("1575") ? "" : (stryCov_9fa48("1575"), 'preferred'))),
          userVerification: stryMutAct_9fa48("1578") ? options.userVerification && 'preferred' : stryMutAct_9fa48("1577") ? false : stryMutAct_9fa48("1576") ? true : (stryCov_9fa48("1576", "1577", "1578"), options.userVerification || (stryMutAct_9fa48("1579") ? "" : (stryCov_9fa48("1579"), 'preferred')))
        })
      });

      // Note: When attachment is 'cross-platform', browsers usually offer QR code (hybrid).
      // We allow the user to specify it via options, defaulting to 'platform'.
      if (stryMutAct_9fa48("1582") ? options.authenticatorAttachment === 'cross-platform' || publicKeyOptions.authenticatorSelection : stryMutAct_9fa48("1581") ? false : stryMutAct_9fa48("1580") ? true : (stryCov_9fa48("1580", "1581", "1582"), (stryMutAct_9fa48("1584") ? options.authenticatorAttachment !== 'cross-platform' : stryMutAct_9fa48("1583") ? true : (stryCov_9fa48("1583", "1584"), options.authenticatorAttachment === (stryMutAct_9fa48("1585") ? "" : (stryCov_9fa48("1585"), 'cross-platform')))) && publicKeyOptions.authenticatorSelection)) {
        if (stryMutAct_9fa48("1586")) {
          {}
        } else {
          stryCov_9fa48("1586");
          publicKeyOptions.authenticatorSelection.authenticatorAttachment = stryMutAct_9fa48("1587") ? "" : (stryCov_9fa48("1587"), 'cross-platform');
        }
      }
      try {
        if (stryMutAct_9fa48("1588")) {
          {}
        } else {
          stryCov_9fa48("1588");
          const resp = await navigator.credentials.create(stryMutAct_9fa48("1589") ? {} : (stryCov_9fa48("1589"), {
            publicKey: publicKeyOptions
          }));
          const credential = resp as PublicKeyCredential;
          if (stryMutAct_9fa48("1592") ? false : stryMutAct_9fa48("1591") ? true : stryMutAct_9fa48("1590") ? credential : (stryCov_9fa48("1590", "1591", "1592"), !credential)) return null;
          const response = credential.response as AuthenticatorAttestationResponse;
          const publicKeyBytes = stryMutAct_9fa48("1593") ? response.getPublicKey() : (stryCov_9fa48("1593"), response.getPublicKey?.());

          // Transport bilgisi
          let transports: string[] = stryMutAct_9fa48("1594") ? ["Stryker was here"] : (stryCov_9fa48("1594"), []);
          if (stryMutAct_9fa48("1597") ? typeof response.getTransports !== 'function' : stryMutAct_9fa48("1596") ? false : stryMutAct_9fa48("1595") ? true : (stryCov_9fa48("1595", "1596", "1597"), typeof response.getTransports === (stryMutAct_9fa48("1598") ? "" : (stryCov_9fa48("1598"), 'function')))) {
            if (stryMutAct_9fa48("1599")) {
              {}
            } else {
              stryCov_9fa48("1599");
              transports = response.getTransports() as string[];
            }
          }

          // Algoritma bilgisi
          let algorithm = stryMutAct_9fa48("1600") ? +7 : (stryCov_9fa48("1600"), -7); // ES256 varsayilan
          if (stryMutAct_9fa48("1603") ? typeof response.getPublicKeyAlgorithm !== 'function' : stryMutAct_9fa48("1602") ? false : stryMutAct_9fa48("1601") ? true : (stryCov_9fa48("1601", "1602", "1603"), typeof response.getPublicKeyAlgorithm === (stryMutAct_9fa48("1604") ? "" : (stryCov_9fa48("1604"), 'function')))) {
            if (stryMutAct_9fa48("1605")) {
              {}
            } else {
              stryCov_9fa48("1605");
              algorithm = response.getPublicKeyAlgorithm();
            }
          }
          return stryMutAct_9fa48("1606") ? {} : (stryCov_9fa48("1606"), {
            credentialId: credential.id,
            publicKeyBase64: publicKeyBytes ? bufferToBase64url(publicKeyBytes) : stryMutAct_9fa48("1607") ? "Stryker was here!" : (stryCov_9fa48("1607"), ''),
            rpId: options.rpId,
            userHandle: bufferToBase64url(userId instanceof Uint8Array ? stryMutAct_9fa48("1608") ? userId.buffer : (stryCov_9fa48("1608"), userId.buffer.slice(userId.byteOffset, stryMutAct_9fa48("1609") ? userId.byteOffset - userId.byteLength : (stryCov_9fa48("1609"), userId.byteOffset + userId.byteLength))) : userId),
            displayName: stryMutAct_9fa48("1612") ? options.userDisplayName && options.userName : stryMutAct_9fa48("1611") ? false : stryMutAct_9fa48("1610") ? true : (stryCov_9fa48("1610", "1611", "1612"), options.userDisplayName || options.userName),
            transport: transports,
            authenticatorAttachment: stryMutAct_9fa48("1615") ? ((credential as PublicKeyCredentialWithAttachment).authenticatorAttachment || options.authenticatorAttachment) && 'platform' : stryMutAct_9fa48("1614") ? false : stryMutAct_9fa48("1613") ? true : (stryCov_9fa48("1613", "1614", "1615"), (stryMutAct_9fa48("1617") ? (credential as PublicKeyCredentialWithAttachment).authenticatorAttachment && options.authenticatorAttachment : stryMutAct_9fa48("1616") ? false : (stryCov_9fa48("1616", "1617"), (credential as PublicKeyCredentialWithAttachment).authenticatorAttachment || options.authenticatorAttachment)) || (stryMutAct_9fa48("1618") ? "" : (stryCov_9fa48("1618"), 'platform'))),
            algorithm,
            registeredAt: new Date().toISOString()
          });
        }
      } catch (error) {
        if (stryMutAct_9fa48("1619")) {
          {}
        } else {
          stryCov_9fa48("1619");
          console.error(stryMutAct_9fa48("1620") ? "" : (stryCov_9fa48("1620"), '[WebAuthnService] Site passkey registration failed:'), error);
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
    if (stryMutAct_9fa48("1621")) {
      {}
    } else {
      stryCov_9fa48("1621");
      if (stryMutAct_9fa48("1624") ? false : stryMutAct_9fa48("1623") ? true : stryMutAct_9fa48("1622") ? isWebAuthnSupported() : (stryCov_9fa48("1622", "1623", "1624"), !isWebAuthnSupported())) {
        if (stryMutAct_9fa48("1625")) {
          {}
        } else {
          stryCov_9fa48("1625");
          throw new Error(stryMutAct_9fa48("1626") ? "" : (stryCov_9fa48("1626"), 'WebAuthn is not supported in this browser.'));
        }
      }
      const challenge = window.crypto.getRandomValues(new Uint8Array(32));
      const allowCredentials: PublicKeyCredentialDescriptor[] | undefined = stryMutAct_9fa48("1627") ? options.allowCredentialIds.map(id => ({
        type: 'public-key' as const,
        id: base64urlToBuffer(id),
        transports: ['internal', 'hybrid', 'usb', 'ble', 'nfc'] as AuthenticatorTransport[]
      })) : (stryCov_9fa48("1627"), options.allowCredentialIds?.map(stryMutAct_9fa48("1628") ? () => undefined : (stryCov_9fa48("1628"), id => stryMutAct_9fa48("1629") ? {} : (stryCov_9fa48("1629"), {
        type: 'public-key' as const,
        id: base64urlToBuffer(id),
        transports: ['internal', 'hybrid', 'usb', 'ble', 'nfc'] as AuthenticatorTransport[]
      }))));
      const publicKeyOptions: PublicKeyCredentialRequestOptions = stryMutAct_9fa48("1630") ? {} : (stryCov_9fa48("1630"), {
        challenge,
        rpId: options.rpId,
        allowCredentials,
        userVerification: stryMutAct_9fa48("1633") ? options.userVerification && 'preferred' : stryMutAct_9fa48("1632") ? false : stryMutAct_9fa48("1631") ? true : (stryCov_9fa48("1631", "1632", "1633"), options.userVerification || (stryMutAct_9fa48("1634") ? "" : (stryCov_9fa48("1634"), 'preferred'))),
        timeout: stryMutAct_9fa48("1637") ? options.timeout && 60000 : stryMutAct_9fa48("1636") ? false : stryMutAct_9fa48("1635") ? true : (stryCov_9fa48("1635", "1636", "1637"), options.timeout || 60000)
      });
      try {
        if (stryMutAct_9fa48("1638")) {
          {}
        } else {
          stryCov_9fa48("1638");
          const assertion = (await navigator.credentials.get({
            publicKey: publicKeyOptions
          })) as PublicKeyCredential | null;
          if (stryMutAct_9fa48("1641") ? false : stryMutAct_9fa48("1640") ? true : stryMutAct_9fa48("1639") ? assertion : (stryCov_9fa48("1639", "1640", "1641"), !assertion)) return null;
          const response = assertion.response as AuthenticatorAssertionResponse;
          return stryMutAct_9fa48("1642") ? {} : (stryCov_9fa48("1642"), {
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
        if (stryMutAct_9fa48("1643")) {
          {}
        } else {
          stryCov_9fa48("1643");
          console.error(stryMutAct_9fa48("1644") ? "" : (stryCov_9fa48("1644"), '[WebAuthnService] Site passkey authentication failed:'), error);
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
    if (stryMutAct_9fa48("1645")) {
      {}
    } else {
      stryCov_9fa48("1645");
      return stryMutAct_9fa48("1646") ? {} : (stryCov_9fa48("1646"), {
        rp_id: result.rpId,
        credential_id: result.credentialId,
        user_handle: result.userHandle,
        display_name: result.displayName,
        transport: result.transport.join(stryMutAct_9fa48("1647") ? "" : (stryCov_9fa48("1647"), ',')),
        authenticator_attachment: result.authenticatorAttachment,
        algorithm: String(result.algorithm),
        mode: stryMutAct_9fa48("1648") ? "" : (stryCov_9fa48("1648"), 'site_passkey_active'),
        server_verified: stryMutAct_9fa48("1649") ? true : (stryCov_9fa48("1649"), false),
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
    if (stryMutAct_9fa48("1650")) {
      {}
    } else {
      stryCov_9fa48("1650");
      return stryMutAct_9fa48("1651") ? {} : (stryCov_9fa48("1651"), {
        ...existing,
        credential_id: stryMutAct_9fa48("1654") ? existing.credential_id && authResult.credentialId : stryMutAct_9fa48("1653") ? false : stryMutAct_9fa48("1652") ? true : (stryCov_9fa48("1652", "1653", "1654"), existing.credential_id || authResult.credentialId),
        server_verified: stryMutAct_9fa48("1655") ? false : (stryCov_9fa48("1655"), true),
        last_auth_at: authResult.authenticatedAt
      });
    }
  }
}