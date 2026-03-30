import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker (skip in iframe / preview)
if ('serviceWorker' in navigator) {
  const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const isPreview = window.location.hostname.includes('id-preview--') || window.location.hostname.includes('lovableproject.com');

  if (!isInIframe && !isPreview) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  } else {
    navigator.serviceWorker?.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
  }
}
