// @ts-nocheck
// Helper to convert base64 to Uint8Array and vice-versa
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
import { toBufferSource } from './crypto-types';
type PrfExtensionResult = {
  enabled?: boolean;
  results?: {
    first?: BufferSource;
  };
};
type PublicKeyCredentialWithExtensions = PublicKeyCredential & {
  getClientExtensionResults: () => AuthenticationExtensionsClientOutputs & {
    prf?: PrfExtensionResult;
  };
};
type CreationOptionsWithPrf = PublicKeyCredentialCreationOptions & {
  extensions: AuthenticationExtensionsClientInputs & {
    prf: {
      eval: {
        first: Uint8Array;
      };
    };
  };
};
type RequestOptionsWithPrf = PublicKeyCredentialRequestOptions & {
  extensions: AuthenticationExtensionsClientInputs & {
    prf: {
      eval: {
        first: BufferSource;
      };
    };
  };
};
const toArrayBuffer = stryMutAct_9fa48("0") ? () => undefined : (stryCov_9fa48("0"), (() => {
  const toArrayBuffer = (value: BufferSource): ArrayBuffer => value instanceof ArrayBuffer ? value : stryMutAct_9fa48("1") ? value.buffer : (stryCov_9fa48("1"), value.buffer.slice(value.byteOffset, stryMutAct_9fa48("2") ? value.byteOffset - value.byteLength : (stryCov_9fa48("2"), value.byteOffset + value.byteLength)));
  return toArrayBuffer;
})());
export const bufferToBase64url = (buffer: ArrayBuffer): string => {
  if (stryMutAct_9fa48("3")) {
    {}
  } else {
    stryCov_9fa48("3");
    const bytes = new Uint8Array(buffer);
    let str = stryMutAct_9fa48("4") ? "Stryker was here!" : (stryCov_9fa48("4"), '');
    for (const charCode of bytes) {
      if (stryMutAct_9fa48("5")) {
        {}
      } else {
        stryCov_9fa48("5");
        stryMutAct_9fa48("6") ? str -= String.fromCharCode(charCode) : (stryCov_9fa48("6"), str += String.fromCharCode(charCode));
      }
    }
    return btoa(str).replace(/\+/g, stryMutAct_9fa48("7") ? "" : (stryCov_9fa48("7"), '-')).replace(/\//g, stryMutAct_9fa48("8") ? "" : (stryCov_9fa48("8"), '_')).replace(/=/g, stryMutAct_9fa48("9") ? "Stryker was here!" : (stryCov_9fa48("9"), ''));
  }
};
export const base64urlToBuffer = (base64url: string): ArrayBuffer => {
  if (stryMutAct_9fa48("10")) {
    {}
  } else {
    stryCov_9fa48("10");
    const base64 = base64url.replace(/-/g, stryMutAct_9fa48("11") ? "" : (stryCov_9fa48("11"), '+')).replace(/_/g, stryMutAct_9fa48("12") ? "" : (stryCov_9fa48("12"), '/'));
    const padLen = stryMutAct_9fa48("13") ? (4 - base64.length % 4) * 4 : (stryCov_9fa48("13"), (stryMutAct_9fa48("14") ? 4 + base64.length % 4 : (stryCov_9fa48("14"), 4 - (stryMutAct_9fa48("15") ? base64.length * 4 : (stryCov_9fa48("15"), base64.length % 4)))) % 4);
    const padded = stryMutAct_9fa48("16") ? base64 - '='.repeat(padLen) : (stryCov_9fa48("16"), base64 + (stryMutAct_9fa48("17") ? "" : (stryCov_9fa48("17"), '=')).repeat(padLen));
    const str = atob(padded);
    const buffer = new ArrayBuffer(str.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; stryMutAct_9fa48("20") ? i >= str.length : stryMutAct_9fa48("19") ? i <= str.length : stryMutAct_9fa48("18") ? false : (stryCov_9fa48("18", "19", "20"), i < str.length); stryMutAct_9fa48("21") ? i-- : (stryCov_9fa48("21"), i++)) {
      if (stryMutAct_9fa48("22")) {
        {}
      } else {
        stryCov_9fa48("22");
        bytes[i] = str.charCodeAt(i);
      }
    }
    return buffer;
  }
};

// WebAuthn PRF Encrypt Payload (True Zero-Knowledge Passkey Vault)
export const encryptWithPRF = async (prfKeyBuffer: ArrayBuffer, plaintext: string): Promise<string> => {
  if (stryMutAct_9fa48("23")) {
    {}
  } else {
    stryCov_9fa48("23");
    const key = await window.crypto.subtle.importKey(stryMutAct_9fa48("24") ? "" : (stryCov_9fa48("24"), 'raw'), toBufferSource(new Uint8Array(prfKeyBuffer)), stryMutAct_9fa48("25") ? {} : (stryCov_9fa48("25"), {
      name: stryMutAct_9fa48("26") ? "" : (stryCov_9fa48("26"), 'AES-GCM'),
      length: 256
    }), stryMutAct_9fa48("27") ? true : (stryCov_9fa48("27"), false), stryMutAct_9fa48("28") ? [] : (stryCov_9fa48("28"), [stryMutAct_9fa48("29") ? "" : (stryCov_9fa48("29"), 'encrypt')]));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedPlaintext = new TextEncoder().encode(plaintext);
    const ciphertext = await window.crypto.subtle.encrypt(stryMutAct_9fa48("30") ? {} : (stryCov_9fa48("30"), {
      name: stryMutAct_9fa48("31") ? "" : (stryCov_9fa48("31"), 'AES-GCM'),
      iv: toBufferSource(iv)
    }), key, toBufferSource(encodedPlaintext));

    // Concat IV + Ciphertext and save as Base64url
    const combined = new Uint8Array(stryMutAct_9fa48("32") ? iv.length - ciphertext.byteLength : (stryCov_9fa48("32"), iv.length + ciphertext.byteLength));
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return bufferToBase64url(toBufferSource(combined) as ArrayBuffer);
  }
};
export const decryptWithPRF = async (prfKeyBuffer: ArrayBuffer, encryptedDataB64: string): Promise<string> => {
  if (stryMutAct_9fa48("33")) {
    {}
  } else {
    stryCov_9fa48("33");
    const key = await window.crypto.subtle.importKey(stryMutAct_9fa48("34") ? "" : (stryCov_9fa48("34"), 'raw'), toBufferSource(new Uint8Array(prfKeyBuffer)), stryMutAct_9fa48("35") ? {} : (stryCov_9fa48("35"), {
      name: stryMutAct_9fa48("36") ? "" : (stryCov_9fa48("36"), 'AES-GCM'),
      length: 256
    }), stryMutAct_9fa48("37") ? true : (stryCov_9fa48("37"), false), stryMutAct_9fa48("38") ? [] : (stryCov_9fa48("38"), [stryMutAct_9fa48("39") ? "" : (stryCov_9fa48("39"), 'decrypt')]));
    const combined = new Uint8Array(base64urlToBuffer(encryptedDataB64));
    const iv = stryMutAct_9fa48("40") ? combined : (stryCov_9fa48("40"), combined.slice(0, 12));
    const ciphertext = stryMutAct_9fa48("41") ? combined : (stryCov_9fa48("41"), combined.slice(12));
    const decrypted = await window.crypto.subtle.decrypt(stryMutAct_9fa48("42") ? {} : (stryCov_9fa48("42"), {
      name: stryMutAct_9fa48("43") ? "" : (stryCov_9fa48("43"), 'AES-GCM'),
      iv: toBufferSource(iv)
    }), key, toBufferSource(ciphertext));
    return new TextDecoder().decode(decrypted);
  }
};
export const registerPasskeyWithPRF = async (): Promise<{
  id: string;
  salt: string;
  prfKey: ArrayBuffer;
} | null> => {
  if (stryMutAct_9fa48("44")) {
    {}
  } else {
    stryCov_9fa48("44");
    if (stryMutAct_9fa48("47") ? false : stryMutAct_9fa48("46") ? true : stryMutAct_9fa48("45") ? window.PublicKeyCredential : (stryCov_9fa48("45", "46", "47"), !window.PublicKeyCredential)) {
      if (stryMutAct_9fa48("48")) {
        {}
      } else {
        stryCov_9fa48("48");
        throw new Error(stryMutAct_9fa48("49") ? "" : (stryCov_9fa48("49"), 'WebAuthn is not supported in this browser.'));
      }
    }
    const challenge = window.crypto.getRandomValues(new Uint8Array(32));
    const userId = window.crypto.getRandomValues(new Uint8Array(16));
    const prfSalt = window.crypto.getRandomValues(new Uint8Array(32));
    const publicKey: CreationOptionsWithPrf = stryMutAct_9fa48("50") ? {} : (stryCov_9fa48("50"), {
      challenge,
      rp: stryMutAct_9fa48("51") ? {} : (stryCov_9fa48("51"), {
        name: stryMutAct_9fa48("52") ? "" : (stryCov_9fa48("52"), 'Aegis Vault Local')
      }),
      user: stryMutAct_9fa48("53") ? {} : (stryCov_9fa48("53"), {
        id: userId,
        name: stryMutAct_9fa48("54") ? "" : (stryCov_9fa48("54"), 'vault_user'),
        displayName: stryMutAct_9fa48("55") ? "" : (stryCov_9fa48("55"), 'Aegis Vault Owner')
      }),
      pubKeyCredParams: stryMutAct_9fa48("56") ? [] : (stryCov_9fa48("56"), [stryMutAct_9fa48("57") ? {} : (stryCov_9fa48("57"), {
        type: stryMutAct_9fa48("58") ? "" : (stryCov_9fa48("58"), 'public-key'),
        alg: stryMutAct_9fa48("59") ? +7 : (stryCov_9fa48("59"), -7)
      }), // ES256
      stryMutAct_9fa48("60") ? {} : (stryCov_9fa48("60"), {
        type: stryMutAct_9fa48("61") ? "" : (stryCov_9fa48("61"), 'public-key'),
        alg: stryMutAct_9fa48("62") ? +257 : (stryCov_9fa48("62"), -257)
      }) // RS256
      ]),
      authenticatorSelection: stryMutAct_9fa48("63") ? {} : (stryCov_9fa48("63"), {
        userVerification: stryMutAct_9fa48("64") ? "" : (stryCov_9fa48("64"), 'preferred')
      }),
      timeout: 60000,
      attestation: stryMutAct_9fa48("65") ? "" : (stryCov_9fa48("65"), 'none'),
      extensions: stryMutAct_9fa48("66") ? {} : (stryCov_9fa48("66"), {
        prf: stryMutAct_9fa48("67") ? {} : (stryCov_9fa48("67"), {
          eval: stryMutAct_9fa48("68") ? {} : (stryCov_9fa48("68"), {
            first: prfSalt
          })
        })
      })
    });
    try {
      if (stryMutAct_9fa48("69")) {
        {}
      } else {
        stryCov_9fa48("69");
        const credential = (await navigator.credentials.create({
          publicKey
        })) as PublicKeyCredentialWithExtensions | null;
        if (stryMutAct_9fa48("71") ? false : stryMutAct_9fa48("70") ? true : (stryCov_9fa48("70", "71"), credential)) {
          if (stryMutAct_9fa48("72")) {
            {}
          } else {
            stryCov_9fa48("72");
            const extensionResults = credential.getClientExtensionResults();
            if (stryMutAct_9fa48("75") ? extensionResults.prf || extensionResults.prf.enabled : stryMutAct_9fa48("74") ? false : stryMutAct_9fa48("73") ? true : (stryCov_9fa48("73", "74", "75"), extensionResults.prf && extensionResults.prf.enabled)) {
              if (stryMutAct_9fa48("76")) {
                {}
              } else {
                stryCov_9fa48("76");
                // Some authenticators return results on creation, some don't.
                // If we don't have .results.first here, we need to assert immediately to get the PRF key.
                if (stryMutAct_9fa48("79") ? extensionResults.prf.results || extensionResults.prf.results.first : stryMutAct_9fa48("78") ? false : stryMutAct_9fa48("77") ? true : (stryCov_9fa48("77", "78", "79"), extensionResults.prf.results && extensionResults.prf.results.first)) {
                  if (stryMutAct_9fa48("80")) {
                    {}
                  } else {
                    stryCov_9fa48("80");
                    return stryMutAct_9fa48("81") ? {} : (stryCov_9fa48("81"), {
                      id: credential.id,
                      salt: bufferToBase64url(prfSalt.buffer),
                      prfKey: toArrayBuffer(extensionResults.prf.results.first)
                    });
                  }
                } else {
                  if (stryMutAct_9fa48("82")) {
                    {}
                  } else {
                    stryCov_9fa48("82");
                    // Re-authenticate immediately to fetch the PRF key
                    return null; // For simplicity in this demo, we expect it during creation (Chromium 116+) or we will fall back on the caller side.
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      if (stryMutAct_9fa48("83")) {
        {}
      } else {
        stryCov_9fa48("83");
        console.error(stryMutAct_9fa48("84") ? "" : (stryCov_9fa48("84"), 'Passkey PRF registration failed:'), error);
      }
    }
    return null;
  }
};
export const authenticatePasskeyWithPRF = async (credentialId: string, saltB64: string): Promise<ArrayBuffer | null> => {
  if (stryMutAct_9fa48("85")) {
    {}
  } else {
    stryCov_9fa48("85");
    if (stryMutAct_9fa48("88") ? false : stryMutAct_9fa48("87") ? true : stryMutAct_9fa48("86") ? window.PublicKeyCredential : (stryCov_9fa48("86", "87", "88"), !window.PublicKeyCredential)) {
      if (stryMutAct_9fa48("89")) {
        {}
      } else {
        stryCov_9fa48("89");
        throw new Error(stryMutAct_9fa48("90") ? "" : (stryCov_9fa48("90"), 'WebAuthn is not supported.'));
      }
    }
    const challenge = window.crypto.getRandomValues(new Uint8Array(32));
    const prfSalt = base64urlToBuffer(saltB64);
    const allowCredentials: PublicKeyCredentialDescriptor[] = stryMutAct_9fa48("91") ? [] : (stryCov_9fa48("91"), [stryMutAct_9fa48("92") ? {} : (stryCov_9fa48("92"), {
      type: stryMutAct_9fa48("93") ? "" : (stryCov_9fa48("93"), 'public-key'),
      id: base64urlToBuffer(credentialId)
    })]);
    const publicKey: RequestOptionsWithPrf = stryMutAct_9fa48("94") ? {} : (stryCov_9fa48("94"), {
      challenge,
      allowCredentials,
      userVerification: stryMutAct_9fa48("95") ? "" : (stryCov_9fa48("95"), 'required'),
      timeout: 60000,
      extensions: stryMutAct_9fa48("96") ? {} : (stryCov_9fa48("96"), {
        prf: stryMutAct_9fa48("97") ? {} : (stryCov_9fa48("97"), {
          eval: stryMutAct_9fa48("98") ? {} : (stryCov_9fa48("98"), {
            first: prfSalt
          })
        })
      })
    });
    try {
      if (stryMutAct_9fa48("99")) {
        {}
      } else {
        stryCov_9fa48("99");
        const assertion = (await navigator.credentials.get({
          publicKey
        })) as PublicKeyCredentialWithExtensions | null;
        if (stryMutAct_9fa48("101") ? false : stryMutAct_9fa48("100") ? true : (stryCov_9fa48("100", "101"), assertion)) {
          if (stryMutAct_9fa48("102")) {
            {}
          } else {
            stryCov_9fa48("102");
            const extensionResults = assertion.getClientExtensionResults();
            if (stryMutAct_9fa48("105") ? extensionResults.prf && extensionResults.prf.results || extensionResults.prf.results.first : stryMutAct_9fa48("104") ? false : stryMutAct_9fa48("103") ? true : (stryCov_9fa48("103", "104", "105"), (stryMutAct_9fa48("107") ? extensionResults.prf || extensionResults.prf.results : stryMutAct_9fa48("106") ? true : (stryCov_9fa48("106", "107"), extensionResults.prf && extensionResults.prf.results)) && extensionResults.prf.results.first)) {
              if (stryMutAct_9fa48("108")) {
                {}
              } else {
                stryCov_9fa48("108");
                return toArrayBuffer(extensionResults.prf.results.first);
              }
            }
          }
        }
      }
    } catch (error) {
      if (stryMutAct_9fa48("109")) {
        {}
      } else {
        stryCov_9fa48("109");
        console.error(stryMutAct_9fa48("110") ? "" : (stryCov_9fa48("110"), 'Passkey PRF authentication failed:'), error);
      }
    }
    return null;
  }
};