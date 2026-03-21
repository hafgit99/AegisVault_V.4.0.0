import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'wxt';
import dotenv from 'dotenv';

// .env dosyasını yükle
dotenv.config({ path: path.resolve(__dirname, '.env') });

const chromiumDevKeyPath = path.resolve(__dirname, 'dev', 'chromium-extension-key.txt');
const chromiumDevKey = fs.existsSync(chromiumDevKeyPath)
  ? fs.readFileSync(chromiumDevKeyPath, 'utf8').trim()
  : '';

export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',
  manifestVersion: 3,
  
  manifest: (env) => ({
    name: "Aegis Vault",
    description: "Secure, zero-knowledge password manager and 2FA authenticator extension. Autofill passwords, sync securely across devices with end-to-end encryption in 2026.",
    version: env.browser === 'firefox' ? "4.0.8" : "4.0.5",
    
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
      extension_pages: "script-src 'self'; worker-src 'self' 'wasm-unsafe-eval'; connect-src 'self' http://127.0.0.1:23456 http://localhost:23456; object-src 'self';"
    },
    
    permissions: [
      "storage",
      "activeTab",
      "contextMenus",
      "alarms",
      "scripting",
      ...(env.browser === 'safari' ? [] : ["nativeMessaging"])
    ],
    host_permissions: [
      "<all_urls>"
    ],
    ...(env.browser === 'firefox' ? {} : {
      externally_connectable: {
        matches: [
          "http://localhost:5173/*",
          "http://127.0.0.1:5173/*",
          "https://*.aegisvault.local/*",
          "https://aegisvault.xyz/*",
          "https://*.aegisvault.xyz/*",
          "https://app.aegisvault.xyz/*",
          "https://www.aegisvault.xyz/*"
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
    } : {
      ...(chromiumDevKey ? { key: chromiumDevKey } : {})
    })
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
