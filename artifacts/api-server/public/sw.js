const CACHE = "parisa-ai-v1";
const ASSETS = ["/", "/style.css", "/app.js", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.url.includes("/api/")) return;
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).catch(() => caches.match("/")))
  );
});

self.addEventListener("push", (e) => {
  const data = e.data?.json() || { title: "PARISA AI", body: "নতুন বার্তা এসেছে" };
  e.waitUntil(
    self.registration.showNotification(data.title || "PARISA AI", {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [200, 100, 200],
    })
  );
});
