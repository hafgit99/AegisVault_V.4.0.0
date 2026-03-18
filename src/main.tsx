import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import "@fontsource/geist-sans/index.css";
import "@fontsource/geist-mono/index.css";
import { ElectronFailSafe } from "./components/ElectronFailSafe";

const rootElement = document.getElementById("root");

if (!rootElement) {
  document.body.innerHTML = `
    <div style="min-height:100vh;background:#020617;color:#e2e8f0;font-family:Segoe UI,Arial,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px;">
      <div style="max-width:760px;width:100%;background:#0f172a;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:28px;">
        <h1 style="margin:0 0 12px;font-size:32px;">Aegis Vault recovery screen</h1>
        <p style="margin:0 0 8px;line-height:1.6;color:#cbd5e1;">The application root element could not be found. This usually indicates a packaged renderer load problem.</p>
        <p style="margin:0 0 8px;line-height:1.6;color:#cbd5e1;">Uygulama kok elementi bulunamadi. Bu durum genellikle paketli renderer yukleme sorunu oldugunu gosterir.</p>
        <p style="margin:0;line-height:1.6;color:#fcd34d;">ROOT_ELEMENT_MISSING</p>
      </div>
    </div>
  `;
  throw new Error("ROOT_ELEMENT_MISSING");
}

createRoot(rootElement).render(
  <StrictMode>
    <ElectronFailSafe>
      <App />
    </ElectronFailSafe>
  </StrictMode>
);
