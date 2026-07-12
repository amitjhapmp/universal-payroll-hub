const CACHE_NAME="universal-payroll-hub-v6-2026-07-11";
const APP_FILES=["./","./index.html","./styles-v600.css","./js/main-v600.js","./js/storage-v600.js","./js/charts.js","./manifest.webmanifest","./assets/avatar.png","./assets/icon-192.png","./assets/icon-512.png"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_FILES)))});
self.addEventListener("activate",e=>e.waitUntil(Promise.all([clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))])));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match("./index.html"))))});
