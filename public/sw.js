/**
 * Service Worker for FSK Online
 * Simpel service worker der ikke gør noget aktivt
 */

console.log('[SW] Service Worker registreret:', self.location.href);

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installeret');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker aktiveret');
  event.waitUntil(self.clients.claim());
});

// Fetch event - bare forward alle requests
self.addEventListener('fetch', (event) => {
  // Intet caching eller special håndtering
  return;
}); 