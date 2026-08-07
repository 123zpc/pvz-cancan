// 版本号：每次构建时自动更新
const VERSION = '__BUILD_TIME__'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
  // 通知所有页面：新版本已就绪
  self.clients.matchAll({ type: 'window' }).then((clients) => {
    clients.forEach((client) => client.postMessage({ type: 'NEW_VERSION' }))
  })
})

self.addEventListener('fetch', (event) => {
  // 网络优先策略：确保始终获取最新内容
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})