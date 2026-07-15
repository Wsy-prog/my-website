const CACHE_NAME = "my-website-v1";
const STATIC_ASSETS = [
  "/",
  "/blog",
  "/gallery",
  "/travel",
  "/guestbook",
  "/contact",
  "/resume",
  "/favicon.png",
  "/apple-icon.png",
  "/images/avatar.jpg",
  "/images/bg.jpg",
  "/manifest.webmanifest",
];

// 安装：缓存静态资源
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// 激活：清理旧缓存
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

// 拦截请求：网络优先，离线时回退缓存
self.addEventListener("fetch", (event) => {
  // 只缓存 GET 请求
  if (event.request.method !== "GET") return;

  // API 请求不缓存
  if (event.request.url.includes("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 写入缓存
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        // 离线时从缓存读取
        return caches.match(event.request).then((cached) => {
          return cached || new Response("离线中", { status: 503 });
        });
      })
  );
});
