/* Mr & Mrs Lifestyle Tracker service worker: shows coach alerts when a client starts or finishes a workout. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('push', function (e) {
  var d = {}; try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: 'Mr & Mrs Lifestyle', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Mr & Mrs Lifestyle', {
    body: d.body || '', icon: '/tracker/icon-192.png', badge: '/tracker/icon-192.png', tag: d.tag || undefined, renotify: !!d.tag,
    data: { url: d.url || '/workout-tracker.html' }
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = new URL((e.notification.data && e.notification.data.url) || '/workout-tracker.html', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) { var c = list[i]; if (c.url.indexOf('/workout-tracker') > -1 && 'navigate' in c) return c.navigate(url).then(function (w) { return w && w.focus(); }); }
    return self.clients.openWindow(url);
  }));
});
