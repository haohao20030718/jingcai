/* 离线缓存：装到桌面后断网也能打开（iPhone PWA 必需） */
const CACHE = "jct-v1";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // 接口请求一律走网络，不进缓存（离线时自然失败，页面用本地数据）
  if (url.pathname.startsWith("/api/")) return;

  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) {
        // 命中缓存后后台悄悄更新一次
        fetch(req).then(r => {
          if (r && r.ok) caches.open(CACHE).then(c => c.put(req, r.clone()));
        }).catch(() => {});
        return hit;
      }
      return fetch(req).then(r => {
        if (r && r.ok && (req.destination === "document" || /\.(png|webmanifest|js|css)$/.test(url.pathname))) {
          const cp = r.clone();
          caches.open(CACHE).then(c => c.put(req, cp)).catch(() => {});
        }
        return r;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
