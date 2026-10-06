self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// The page owns IndexedDB. This worker only wakes it when the radio returns.
self.addEventListener("sync", (event) => {
  if (event.tag !== "fleet-telemetry") return;
  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => client.postMessage({ type: "fleet-flush" }));
    }),
  );
});
