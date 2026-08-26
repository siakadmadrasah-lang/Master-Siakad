import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import ErrorBoundary from "./components/ErrorBoundary";

// 1. Bersihkan URL jika ada parameter cache-busting (?nocache=... atau ?t=...)
try {
  if (window.location.search.includes("nocache=") || window.location.search.includes("t=")) {
    const url = new URL(window.location.href);
    url.searchParams.delete("nocache");
    url.searchParams.delete("t");
    window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
  }
} catch {
  // ignore
}

// 2. Tangani ChunkLoadError / Dynamic Import Failure akibat update versi aplikasi di server
window.addEventListener("error", (event) => {
  const message = event.message || "";
  const isChunkError =
    message.includes("Loading chunk") ||
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("css chunk");

  if (isChunkError) {
    console.warn("Detected chunk loading error due to build update. Forcing fresh reload...");
    const lastReload = sessionStorage.getItem("last_chunk_reload");
    const now = Date.now();

    // Hindari perulangan reload terus menerus jika error berasal dari hal lain
    if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
      sessionStorage.setItem("last_chunk_reload", now.toString());
      
      try {
        if ("caches" in window) {
          caches.keys().then((names) => {
            Promise.all(names.map((name) => caches.delete(name))).then(() => {
              window.location.reload();
            });
          });
        } else {
          window.location.reload();
        }
      } catch {
        window.location.reload();
      }
    }
  }
});

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}


