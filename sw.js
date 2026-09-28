// Service worker: caches the app shell at install, then (on every launch,
// online) ensures every content asset referenced by content/books.json is
// cached — this doubles as the first-run "download everything for offline
// use" pass and the "check for new/changed content" sync, since assets
// already in the cache are skipped and only missing ones are fetched.
const SHELL_CACHE = 'shabadvaani-shell-v9';
const CONTENT_CACHE = 'shabadvaani-content-v2';

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './src/app.js',
  './src/state.js',
  './src/content.js',
  './src/audio-player.js',
  './src/icons.js',
  './src/util.js',
  './src/views/home.js',
  './src/views/book.js',
  './src/views/shabad.js',
  './src/views/bookmarks.js',
  './src/styles.css',
  './fonts/NotoSerif-latin.woff2',
  './fonts/NotoSerif-latin-italic.woff2',
  './fonts/Literata-latin.woff2',
  './fonts/Literata-latin-italic.woff2',
  './fonts/PlusJakartaSans-latin.woff2',
  './fonts/NotoSerifDevanagari.woff2',
  './fonts/NotoSansDevanagari.woff2',
  './fonts/siddhanta.ttf',
  './fonts/MaterialSymbolsOutlined.woff2',
  './icons/favicon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== CONTENT_CACHE)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res.ok && new URL(req.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(req.url.includes('/content/') ? CONTENT_CACHE : SHELL_CACHE)
              .then((cache) => cache.put(req, copy))
              .catch(() => {});
          }
          return res;
        })
        .catch(() => {
          if (req.mode === 'navigate') return caches.match('./index.html');
          return new Response('', { status: 504, statusText: 'Offline' });
        });
    })
  );
});

async function broadcast(message) {
  const clientsList = await self.clients.matchAll({ includeUncontrolled: true });
  clientsList.forEach((client) => client.postMessage(message));
}

async function downloadContent() {
  const cache = await caches.open(CONTENT_CACHE);
  const booksUrl = new URL('content/books.json', self.registration.scope).toString();

  let books;
  try {
    const res = await fetch(booksUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`books.json ${res.status}`);
    const text = await res.text();
    await cache.put(booksUrl, new Response(text, { headers: { 'Content-Type': 'application/json' } }));
    books = JSON.parse(text).books || [];
  } catch (err) {
    const fallback = await cache.match(booksUrl);
    if (!fallback) {
      await broadcast({ type: 'DOWNLOAD_ERROR', message: 'सामग्री लोड नहीं हो सकी। कृपया इंटरनेट कनेक्शन जांचें।' });
      return;
    }
    books = (await fallback.clone().json()).books || [];
  }

  const assetUrls = new Set();
  for (const book of books) {
    if (book.cover) assetUrls.add(new URL(book.cover, booksUrl).toString());
    if (book.audioSource) assetUrls.add(new URL(book.audioSource, booksUrl).toString());
    for (const s of book.shabads || []) {
      if (s.audioSource) assetUrls.add(new URL(s.audioSource, booksUrl).toString());
    }
  }

  const urls = [...assetUrls];
  let cachedCount = 0;
  for (const url of urls) {
    if (await cache.match(url)) cachedCount++;
  }
  await broadcast({ type: 'DOWNLOAD_STATUS', total: urls.length, cached: cachedCount });

  let done = cachedCount;
  for (const url of urls) {
    if (await cache.match(url)) continue;
    try {
      const estimate = ('storage' in self.navigator) ? await self.navigator.storage.estimate() : null;
      if (estimate && estimate.quota && estimate.usage && (estimate.quota - estimate.usage) < 5 * 1024 * 1024) {
        await broadcast({ type: 'DOWNLOAD_ERROR', message: 'डिवाइस पर पर्याप्त स्थान नहीं है। जगह खाली करें और पुनः प्रयास करें।' });
        return;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url} -> ${res.status}`);
      await cache.put(url, res);
    } catch (err) {
      await broadcast({ type: 'DOWNLOAD_ERROR', message: 'कुछ सामग्री डाउनलोड नहीं हो सकी। पुनः प्रयास करें।' });
      return;
    }
    done++;
    await broadcast({ type: 'DOWNLOAD_PROGRESS', done, total: urls.length });
  }

  await broadcast({ type: 'DOWNLOAD_COMPLETE', total: urls.length });
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'START_CONTENT_DOWNLOAD') {
    event.waitUntil(downloadContent());
  }
});
