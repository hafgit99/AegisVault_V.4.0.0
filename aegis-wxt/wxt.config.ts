import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',
  manifestVersion: 3,
  
  manifest: (env) => ({
    name: "Aegis Vault",
    description: "Secure, zero-knowledge password manager and 2FA authenticator extension. Autofill passwords, sync securely across devices with end-to-end encryption in 2026.",
    version: "4.0.3",
    
    icons: {
      "16": "icon-16.png",
      "32": "icon-32.png",
      "48": "icon-48.png",
      "128": "icon-128.png"
    },
    action: {
      default_icon: {
        "16": "icon-16.png",
        "32": "icon-32.png",
        "48": "icon-48.png",
        "128": "icon-128.png"
      }
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; worker-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
    },
    
    permissions: [
      "storage",
      "activeTab",
      "contextMenus",
      "alarms"
    ],
    host_permissions: [
      "<all_urls>"
    ],
    ...(env.browser === 'firefox' ? {} : {
      externally_connectable: {
        matches: [
          "http://localhost:5173/*",
          "http://127.0.0.1:5173/*",
          "https://*.aegisvault.local/*"
        ]
      }
    }),
    ...(env.browser === 'firefox' ? {
      browser_specific_settings: {
        gecko: {
          id: "aegisvault@example.com",
          strict_min_version: "142.0",
          data_collection_permissions: {
            required: ["none"]
          }
        }
      }
    } : {})
  }),
  
  // WXT-Module for Safari Xcode Converter
  modules: ['wxt-module-safari-xcode'],
  hooks: {
    // We let the wxt module parse the safari settings, but in our case, we can also specify safari explicitly
  },
  
  // Apple App Store Bundle gereksinimi
  safari: {
    bundleId: 'com.aegisvault.extension'
  },
  
  xcode: {
    bundleId: 'com.aegisvault.extension',
    appCategory: 'public.app-category.utilities'
  }
});
