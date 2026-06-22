const CACHE_NAME = "htcare-pwa-v3";
const APP_SHELL = ["/", "/manifest.json", "/icons/icon-192x192.png", "/icons/icon-512x512.png"];
const SUPABASE_HOST = "supabase.co";

const offlinePage = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#0D9488" />
    <title>Sem conexão — HTCare</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: #fbfcfc;
        color: #10201f;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(100%, 420px);
        border: 1px solid rgba(16, 32, 31, 0.08);
        border-radius: 28px;
        background: white;
        padding: 28px;
        text-align: center;
        box-shadow: 0 28px 80px -60px rgba(16, 32, 31, 0.7);
      }
      .carelito {
        width: 86px;
        height: 86px;
        margin: 0 auto 18px;
        border-radius: 26px;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #2f8fc8, #49c7ae);
        color: white;
        font-size: 42px;
        font-weight: 800;
      }
      h1 { margin: 0; font-size: 28px; line-height: 1.1; }
      p { margin: 12px 0 0; color: #536b68; line-height: 1.55; }
      button {
        margin-top: 22px;
        min-height: 46px;
        border: 0;
        border-radius: 999px;
        padding: 0 22px;
        background: #10201f;
        color: white;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="carelito">+</div>
      <h1>Você está sem conexão</h1>
      <p>O Carelito não conseguiu carregar a HTCare agora. Verifique sua internet e tente novamente.</p>
      <button onclick="window.location.reload()">Tentar novamente</button>
    </main>
  </body>
</html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.hostname.includes(SUPABASE_HOST)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.destination === "document") {
    event.respondWith(documentNetworkFirst(request));
    return;
  }

  if (["script", "style"].includes(request.destination)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (["image", "font", "manifest"].includes(request.destination)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw new Error("Network unavailable");
  }
}

async function documentNetworkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(offlinePage, { headers: { "Content-Type": "text/html" } });
  }
}
