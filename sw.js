/* ============================================================
   私调记录 · Service Worker
   - 版本化缓存：发布新版本时把 CACHE 版本号 +1（如 v1 → v2），
     旧缓存会自动清理，页面下次打开即为新版。
   - 页面导航走 network-first：有网时永远拿最新 HTML，
     断网时回退到上次缓存的版本，保证离线可用。
   - 静态资源（图标/清单）走 cache-first：离线也能打开。
   - 新版本 SW 安装后立即接管（skipWaiting + clients.claim）。
   ============================================================ */
const CACHE = "sijiao-record-v3";

const CORE = [
  "./",
  "./index.html",
  "./私调记录.html",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 页面导航：network-first，保证更新发布后拿到最新版
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((m) => m || caches.match("./私调记录.html"))
        )
    );
    return;
  }

  // 静态资源：cache-first
  event.respondWith(
    caches.match(req).then(
      (m) =>
        m ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
    )
  );
});
