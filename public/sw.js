const CACHE_PREFIX = "htcare";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.toLowerCase().includes(CACHE_PREFIX))
              .map((key) => caches.delete(key)),
          ),
        ),
      self.registration.unregister(),
      self.clients.claim(),
    ]),
  );
});
