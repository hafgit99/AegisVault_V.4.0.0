/// <reference types="chrome"/>

let isVaultUnlocked = false;

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Aegis Vault] Extension Installed');
  
  chrome.contextMenus.create({
    id: "aegis-generate-password",
    title: "Bu Alan İçin Şifre Üret (AegisVault)",
    contexts: ["editable"]
  });

  chrome.contextMenus.create({
    id: "aegis-fill-password",
    title: "Bu Alanı Doldur (Aegis)",
    contexts: ["editable"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "aegis-generate-password") {
    console.log("Generate password requested for tab", tab?.id);
    if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: "ACTION_GENERATE_PASSWORD" });
    }
  } else if (info.menuItemId === "aegis-fill-password") {
    console.log("Fill password requested for tab", tab?.id);
    if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: "ACTION_FILL_PASSWORD" });
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "WEB_TO_EXTENSION") {
    const payload = message.payload;
    
    switch (payload.action) {
      case "SYNC_VAULT_STATE":
        // Sync the state (Locked vs Unlocked)
        // No keys are passed here, just the status!
        isVaultUnlocked = payload.isUnlocked;
        console.log(`[Aegis Vault] State synced - Unlocked: ${isVaultUnlocked}`);
        break;
        
      case "CREDENTIALS_RESPONSE":
        // The Vault decrypted the requested info. Pass this safely back to the Popup.
        console.log("[Aegis Vault] Received credential response from Vault processor.");
        chrome.runtime.sendMessage({
          type: "CREDENTIALS_READY",
          data: payload.data
        });
        break;
    }
  }

  // Handle requests from the generic Extension Popup
  if (message.type === "GET_VAULT_STATUS") {
    sendResponse({ isUnlocked: isVaultUnlocked });
  }

  if (message.type === "REQUEST_CREDENTIALS") {
    if (!isVaultUnlocked) {
       sendResponse({ error: "VAULT_LOCKED", message: "Giriş bilgisi istenebilmesi için kasanın açık olması gerekiyor." });
       return true;
    }
    
    // Send a secure signal to the Web App (the "brain") to decrypt and send credentials back
    chrome.tabs.query({ url: "*://localhost/*", currentWindow: true }, (tabs) => {
       // Only send it to authorized Vault domains if found
       const vaultTabs = tabs.filter(t => t.url && (t.url.includes("localhost:5173") || t.url.includes("aegis-vault.com")));
       
       if (vaultTabs.length > 0) {
         chrome.tabs.sendMessage(vaultTabs[0].id!, {
           type: "EXTENSION_TO_WEB",
           payload: { 
             action: "REQUEST_CREDENTIALS", 
             targetUrl: message.targetUrl 
           }
         });
         sendResponse({ status: "Signal dispatched to Web App" });
       } else {
         sendResponse({ error: "VAULT_NOT_FOUND", message: "Aegis Kasa web sekmesi bulunamadı." });
       }
    });

    return true; // async response
  }

  return true;
});
