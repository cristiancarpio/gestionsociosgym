const CACHE_NAME = 'gymadmin-v2';
const OFFLINE_ASSETS = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(OFFLINE_ASSETS).catch(()=>{})).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // API calls — network only
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleusercontent')) {
    e.respondWith(
      fetch(e.request).catch(()=>new Response(JSON.stringify({ok:false,error:'offline'}),{headers:{'Content-Type':'application/json'}}))
    );
    return;
  }
  // Fonts — stale-while-revalidate
  if (url.hostname.includes('fonts.')) {
    e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{
      const cl=res.clone(); caches.open(CACHE_NAME).then(c=>c.put(e.request,cl)); return res;
    })));
    return;
  }
  // App shell — cache first
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached)return cached;
      return fetch(e.request).then(res=>{
        if(res&&res.status===200&&e.request.method==='GET'){const cl=res.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,cl));}
        return res;
      }).catch(()=>caches.match('/index.html'));
    })
  );
});

self.addEventListener('sync', e => {
  if(e.tag==='gym-sync') e.waitUntil(
    self.clients.matchAll({type:'window'}).then(cls=>cls.forEach(c=>c.postMessage({type:'BG_SYNC_TRIGGER'})))
  );
});
