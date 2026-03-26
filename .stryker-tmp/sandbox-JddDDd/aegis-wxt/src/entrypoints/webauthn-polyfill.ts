// @ts-nocheck
import { defineContentScript } from 'wxt/sandbox';

export default defineContentScript({
  matches: ['<all_urls>'],
  world: 'MAIN',
  runAt: 'document_start',
  main() {
    if (typeof window !== 'undefined') {
       // 
       if (window.aegis_webauthn_injected) return;
       // 
       window.aegis_webauthn_injected = true;

       console.log('[Aegis Vault] 🔑 WebAuthn polyfill active (MAIN world)');

       try {
         const originalGet = navigator.credentials.get.bind(navigator.credentials);
         const originalCreate = navigator.credentials.create.bind(navigator.credentials);

         navigator.credentials.get = async function(options) {
           if (!options || !options.publicKey) {
             return originalGet(options);
           }

           console.log('[Aegis Vault] 🛡️ Intercepted WebAuthn GET request', options);

           if (options.mediation === 'conditional') {
             // Notify the extension's isolated content script
             window.postMessage({ 
                 type: 'AEGIS_WEBAUTHN_CONDITIONAL_PENDING', 
                 options: options.publicKey 
             }, window.location.origin);
           }

           return originalGet(options);
         };

         navigator.credentials.create = async function(options) {
           if (!options || !options.publicKey) {
             return originalCreate(options);
           }
           console.log('[Aegis Vault] 🛡️ Intercepted WebAuthn CREATE request', options);
           return originalCreate(options);
         };
       } catch (error) {
         console.warn('[Aegis Vault] WebAuthn polyfill failed to proxy:', error);
       }
    }
  },
});
