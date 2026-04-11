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
const toArrayBuffer = stryMutAct_9fa48("1388") ? () => undefined : (stryCov_9fa48("1388"), (() => {
  const toArrayBuffer = (value: BufferSource): ArrayBuffer => value instanceof ArrayBuffer ? value : stryMutAct_9fa48("1389") ? value.buffer : (stryCov_9fa48("1389"), value.buffer.slice(value.byteOffset, stryMutAct_9fa48("1390") ? value.byteOffset - value.byteLength : (stryCov_9fa48("1390"), value.byteOffset + value.byteLength)));
  return toArrayBuffer;
})());
export const bufferToBase64url = (buffer: ArrayBuffer): string => {
  if (stryMutAct_9fa48("1391")) {
    {}
  } else {
    stryCov_9fa48("1391");
    const bytes = new Uint8Array(buffer);
    let str = stryMutAct_9fa48("1392") ? "Stryker was here!" : (stryCov_9fa48("1392"), '');
    for (const charCode of bytes) {
      if (stryMutAct_9fa48("1393")) {
        {}
      } else {
        stryCov_9fa48("1393");
        stryMutAct_9fa48("1394") ? str -= String.fromCharCode(charCode) : (stryCov_9fa48("1394"), str += String.fromCharCode(charCode));
      }
    }
    return btoa(str).replace(/\+/g, stryMutAct_9fa48("1395") ? "" : (stryCov_9fa48("1395"), '-')).replace(/\//g, stryMutAct_9fa48("1396") ? "" : (stryCov_9fa48("1396"), '_')).replace(/=/g, stryMutAct_9fa48("1397") ? "Stryker was here!" : (stryCov_9fa48("1397"), ''));
  }
};
export const base64urlToBuffer = (base64url: string): ArrayBuffer => {
  if (stryMutAct_9fa48("1398")) {
    {}
  } else {
    stryCov_9fa48("1398");
    const base64 = base64url.replace(/-/g, stryMutAct_9fa48("1399") ? "" : (stryCov_9fa48("1399"), '+')).replace(/_/g, stryMutAct_9fa48("1400") ? "" : (stryCov_9fa48("1400"), '/'));
    const padLen = stryMutAct_9fa48("1401") ? (4 - base64.length % 4) * 4 : (stryCov_9fa48("1401"), (stryMutAct_9fa48("1402") ? 4 + base64.length % 4 : (stryCov_9fa48("1402"), 4 - (stryMutAct_9fa48("1403") ? base64.length * 4 : (stryCov_9fa48("1403"), base64.length % 4)))) % 4);
    const padded = stryMutAct_9fa48("1404") ? base64 - '='.repeat(padLen) : (stryCov_9fa48("1404"), base64 + (stryMutAct_9fa48("1405") ? "" : (stryCov_9fa48("1405"), '=')).repeat(padLen));
    const str = atob(padded);
    const buffer = new ArrayBuffer(str.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; stryMutAct_9fa48("1408") ? i >= str.length : stryMutAct_9fa48("1407") ? i <= str.length : stryMutAct_9fa48("1406") ? false : (stryCov_9fa48("1406", "1407", "1408"), i < str.length); stryMutAct_9fa48("1409") ? i-- : (stryCov_9fa48("1409"), i++)) {
      if (stryMutAct_9fa48("1410")) {
        {}
      } else {
        stryCov_9fa48("1410");
        bytes[i] = str.charCodeAt(i);
      }
    }
    return buffer;
  }
};

// WebAuthn PRF Encrypt Payload (True Zero-Knowledge Passkey Vault)
export const encryptWithPRF = async (prfKeyBuffer: ArrayBuffer, plaintext: string): Promise<string> => {
  if (stryMutAct_9fa48("1411")) {
    {}
  } else {
    stryCov_9fa48("1411");
    const key = await window.crypto.subtle.importKey(stryMutAct_9fa48("1412") ? "" : (stryCov_9fa48("1412"), 'raw'), toBufferSource(new Uint8Array(prfKeyBuffer)), stryMutAct_9fa48("1413") ? {} : (stryCov_9fa48("1413"), {
      name: stryMutAct_9fa48("1414") ? "" : (stryCov_9fa48("1414"), 'AES-GCM'),
      length: 256
    }), stryMutAct_9fa48("1415") ? true : (stryCov_9fa48("1415"), false), stryMutAct_9fa48("1416") ? [] : (stryCov_9fa48("1416"), [stryMutAct_9fa48("1417") ? "" : (stryCov_9fa48("1417"), 'encrypt')]));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedPlaintext = new TextEncoder().encode(plaintext);
    const ciphertext = await window.crypto.subtle.encrypt(stryMutAct_9fa48("1418") ? {} : (stryCov_9fa48("1418"), {
      name: stryMutAct_9fa48("1419") ? "" : (stryCov_9fa48("1419"), 'AES-GCM'),
      iv: toBufferSource(iv)
    }), key, toBufferSource(encodedPlaintext));

    // Concat IV + Ciphertext and save as Base64url
    const combined = new Uint8Array(stryMutAct_9fa48("1420") ? iv.length - ciphertext.byteLength : (stryCov_9fa48("1420"), iv.length + ciphertext.byteLength));
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return bufferToBase64url(toBufferSource(combined) as ArrayBuffer);
  }
};
export const decryptWithPRF = async (prfKeyBuffer: ArrayBuffer, encryptedDataB64: string): Promise<string> => {
  if (stryMutAct_9fa48("1421")) {
    {}
  } else {
    stryCov_9fa48("1421");
    const key = await window.crypto.subtle.importKey(stryMutAct_9fa48("1422") ? "" : (stryCov_9fa48("1422"), 'raw'), toBufferSource(new Uint8Array(prfKeyBuffer)), stryMutAct_9fa48("1423") ? {} : (stryCov_9fa48("1423"), {
      name: stryMutAct_9fa48("1424") ? "" : (stryCov_9fa48("1424"), 'AES-GCM'),
      length: 256
    }), stryMutAct_9fa48("1425") ? true : (stryCov_9fa48("1425"), false), stryMutAct_9fa48("1426") ? [] : (stryCov_9fa48("1426"), [stryMutAct_9fa48("1427") ? "" : (stryCov_9fa48("1427"), 'decrypt')]));
    const combined = new Uint8Array(base64urlToBuffer(encryptedDataB64));
    const iv = stryMutAct_9fa48("1428") ? combined : (stryCov_9fa48("1428"), combined.slice(0, 12));
    const ciphertext = stryMutAct_9fa48("1429") ? combined : (stryCov_9fa48("1429"), combined.slice(12));
    const decrypted = await window.crypto.subtle.decrypt(stryMutAct_9fa48("1430") ? {} : (stryCov_9fa48("1430"), {
      name: stryMutAct_9fa48("1431") ? "" : (stryCov_9fa48("1431"), 'AES-GCM'),
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
  if (stryMutAct_9fa48("1432")) {
    {}
  } else {
    stryCov_9fa48("1432");
    if (stryMutAct_9fa48("1435") ? false : stryMutAct_9fa48("1434") ? true : stryMutAct_9fa48("1433") ? window.PublicKeyCredential : (stryCov_9fa48("1433", "1434", "1435"), !window.PublicKeyCredential)) {
      if (stryMutAct_9fa48("1436")) {
        {}
      } else {
        stryCov_9fa48("1436");
        throw new Error(stryMutAct_9fa48("1437") ? "" : (stryCov_9fa48("1437"), 'WebAuthn is not supported in this browser.'));
      }
    }
    const challenge = window.crypto.getRandomValues(new Uint8Array(32));
    const userId = window.crypto.getRandomValues(new Uint8Array(16));
    const prfSalt = window.crypto.getRandomValues(new Uint8Array(32));
    const publicKey: CreationOptionsWithPrf = stryMutAct_9fa48("1438") ? {} : (stryCov_9fa48("1438"), {
      challenge,
      rp: stryMutAct_9fa48("1439") ? {} : (stryCov_9fa48("1439"), {
        name: stryMutAct_9fa48("1440") ? "" : (stryCov_9fa48("1440"), 'Aegis Vault Local')
      }),
      user: stryMutAct_9fa48("1441") ? {} : (stryCov_9fa48("1441"), {
        id: userId,
        name: stryMutAct_9fa48("1442") ? "" : (stryCov_9fa48("1442"), 'vault_user'),
        displayName: stryMutAct_9fa48("1443") ? "" : (stryCov_9fa48("1443"), 'Aegis Vault Owner')
      }),
      pubKeyCredParams: stryMutAct_9fa48("1444") ? [] : (stryCov_9fa48("1444"), [stryMutAct_9fa48("1445") ? {} : (stryCov_9fa48("1445"), {
        type: stryMutAct_9fa48("1446") ? "" : (stryCov_9fa48("1446"), 'public-key'),
        alg: stryMutAct_9fa48("1447") ? +7 : (stryCov_9fa48("1447"), -7)
      }), // ES256
      stryMutAct_9fa48("1448") ? {} : (stryCov_9fa48("1448"), {
        type: stryMutAct_9fa48("1449") ? "" : (stryCov_9fa48("1449"), 'public-key'),
        alg: stryMutAct_9fa48("1450") ? +257 : (stryCov_9fa48("1450"), -257)
      }) // RS256
      ]),
      authenticatorSelection: stryMutAct_9fa48("1451") ? {} : (stryCov_9fa48("1451"), {
        userVerification: stryMutAct_9fa48("1452") ? "" : (stryCov_9fa48("1452"), 'preferred')
      }),
      timeout: 60000,
      attestation: stryMutAct_9fa48("1453") ? "" : (stryCov_9fa48("1453"), 'none'),
      extensions: stryMutAct_9fa48("1454") ? {} : (stryCov_9fa48("1454"), {
        prf: stryMutAct_9fa48("1455") ? {} : (stryCov_9fa48("1455"), {
          eval: stryMutAct_9fa48("1456") ? {} : (stryCov_9fa48("1456"), {
            first: prfSalt
          })
        })
      })
    });
    try {
      if (stryMutAct_9fa48("1457")) {
        {}
      } else {
        stryCov_9fa48("1457");
        const credential = (await navigator.credentials.create({
          publicKey
        })) as PublicKeyCredentialWithExtensions | null;
        if (stryMutAct_9fa48("1459") ? false : stryMutAct_9fa48("1458") ? true : (stryCov_9fa48("1458", "1459"), credential)) {
          if (stryMutAct_9fa48("1460")) {
            {}
          } else {
            stryCov_9fa48("1460");
            const extensionResults = credential.getClientExtensionResults();
            if (stryMutAct_9fa48("1463") ? extensionResults.prf || extensionResults.prf.enabled : stryMutAct_9fa48("1462") ? false : stryMutAct_9fa48("1461") ? true : (stryCov_9fa48("1461", "1462", "1463"), extensionResults.prf && extensionResults.prf.enabled)) {
              if (stryMutAct_9fa48("1464")) {
                {}
              } else {
                stryCov_9fa48("1464");
                // Some authenticators return results on creation, some don't.
                // If we don't have .results.first here, we need to assert immediately to get the PRF key.
                if (stryMutAct_9fa48("1467") ? extensionResults.prf.results || extensionResults.prf.results.first : stryMutAct_9fa48("1466") ? false : stryMutAct_9fa48("1465") ? true : (stryCov_9fa48("1465", "1466", "1467"), extensionResults.prf.results && extensionResults.prf.results.first)) {
                  if (stryMutAct_9fa48("1468")) {
                    {}
                  } else {
                    stryCov_9fa48("1468");
                    return stryMutAct_9fa48("1469") ? {} : (stryCov_9fa48("1469"), {
                      id: credential.id,
                      salt: bufferToBase64url(prfSalt.buffer),
                      prfKey: toArrayBuffer(extensionResults.prf.results.first)
                    });
                  }
                } else {
                  if (stryMutAct_9fa48("1470")) {
                    {}
                  } else {
                    stryCov_9fa48("1470");
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
      if (stryMutAct_9fa48("1471")) {
        {}
      } else {
        stryCov_9fa48("1471");
        console.error(stryMutAct_9fa48("1472") ? "" : (stryCov_9fa48("1472"), 'Passkey PRF registration failed:'), error);
      }
    }
    return null;
  }
};
export const authenticatePasskeyWithPRF = async (credentialId: string, saltB64: string): Promise<ArrayBuffer | null> => {
  if (stryMutAct_9fa48("1473")) {
    {}
  } else {
    stryCov_9fa48("1473");
    if (stryMutAct_9fa48("1476") ? false : stryMutAct_9fa48("1475") ? true : stryMutAct_9fa48("1474") ? window.PublicKeyCredential : (stryCov_9fa48("1474", "1475", "1476"), !window.PublicKeyCredential)) {
      if (stryMutAct_9fa48("1477")) {
        {}
      } else {
        stryCov_9fa48("1477");
        throw new Error(stryMutAct_9fa48("1478") ? "" : (stryCov_9fa48("1478"), 'WebAuthn is not supported.'));
      }
    }
    const challenge = window.crypto.getRandomValues(new Uint8Array(32));
    const prfSalt = base64urlToBuffer(saltB64);
    const allowCredentials: PublicKeyCredentialDescriptor[] = stryMutAct_9fa48("1479") ? [] : (stryCov_9fa48("1479"), [stryMutAct_9fa48("1480") ? {} : (stryCov_9fa48("1480"), {
      type: stryMutAct_9fa48("1481") ? "" : (stryCov_9fa48("1481"), 'public-key'),
      id: base64urlToBuffer(credentialId)
    })]);
    const publicKey: RequestOptionsWithPrf = stryMutAct_9fa48("1482") ? {} : (stryCov_9fa48("1482"), {
      challenge,
      allowCredentials,
      userVerification: stryMutAct_9fa48("1483") ? "" : (stryCov_9fa48("1483"), 'required'),
      timeout: 60000,
      extensions: stryMutAct_9fa48("1484") ? {} : (stryCov_9fa48("1484"), {
        prf: stryMutAct_9fa48("1485") ? {} : (stryCov_9fa48("1485"), {
          eval: stryMutAct_9fa48("1486") ? {} : (stryCov_9fa48("1486"), {
            first: prfSalt
          })
        })
      })
    });
    try {
      if (stryMutAct_9fa48("1487")) {
        {}
      } else {
        stryCov_9fa48("1487");
        const assertion = (await navigator.credentials.get({
          publicKey
        })) as PublicKeyCredentialWithExtensions | null;
        if (stryMutAct_9fa48("1489") ? false : stryMutAct_9fa48("1488") ? true : (stryCov_9fa48("1488", "1489"), assertion)) {
          if (stryMutAct_9fa48("1490")) {
            {}
          } else {
            stryCov_9fa48("1490");
            const extensionResults = assertion.getClientExtensionResults();
            if (stryMutAct_9fa48("1493") ? extensionResults.prf && extensionResults.prf.results || extensionResults.prf.results.first : stryMutAct_9fa48("1492") ? false : stryMutAct_9fa48("1491") ? true : (stryCov_9fa48("1491", "1492", "1493"), (stryMutAct_9fa48("1495") ? extensionResults.prf || extensionResults.prf.results : stryMutAct_9fa48("1494") ? true : (stryCov_9fa48("1494", "1495"), extensionResults.prf && extensionResults.prf.results)) && extensionResults.prf.results.first)) {
              if (stryMutAct_9fa48("1496")) {
                {}
              } else {
                stryCov_9fa48("1496");
                return toArrayBuffer(extensionResults.prf.results.first);
              }
            }
          }
        }
      }
    } catch (error) {
      if (stryMutAct_9fa48("1497")) {
        {}
      } else {
        stryCov_9fa48("1497");
        console.error(stryMutAct_9fa48("1498") ? "" : (stryCov_9fa48("1498"), 'Passkey PRF authentication failed:'), error);
      }
    }
    return null;
  }
};