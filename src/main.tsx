import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";

// 1. Unregister any stale Service Workers and clear CacheStorage to prevent outdated pages
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  }).catch((err) => {
    console.warn("ServiceWorker unregister error:", err);
  });
}

if ("caches" in window) {
  caches.keys().then((names) => {
    for (const name of names) {
      caches.delete(name);
    }
  }).catch((err) => {
    console.warn("Cache deletion error:", err);
  });
}

// 2. Bersihkan URL jika ada parameter cache-busting (?nocache=...)
if (window.location.search.includes("nocache=")) {
  const url = new URL(window.location.href);
  url.searchParams.delete("nocache");
  window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
}

// 3. Tangani ChunkLoadError / Dynamic Import Failure akibat update versi aplikasi di server
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
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem("last_chunk_reload", now.toString());
      
      // Bersihkan cache dan reload secara paksa
      if ("caches" in window) {
        caches.keys().then((names) => {
          Promise.all(names.map((name) => caches.delete(name))).then(() => {
            window.location.href = window.location.pathname + "?nocache=" + Date.now() + window.location.hash;
          });
        });
      } else {
        window.location.href = window.location.pathname + "?nocache=" + Date.now() + window.location.hash;
      }
    }
  }
});

createRoot(document.getElementById("root")!).render(<App />);

