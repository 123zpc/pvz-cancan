'use client'

import { useEffect } from 'react'

export function SwRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // 监听来自 SW 的新版本消息
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'NEW_VERSION') {
          // 显示刷新提示
          const banner = document.createElement('div')
          banner.style.cssText =
            'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9999;' +
            'background:#4f46e5;color:#fff;padding:10px 20px;border-radius:24px;' +
            'font-size:14px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.25);' +
            'cursor:pointer;animation:sw-pop 0.3s ease-out'
          banner.textContent = '有新版本，点击刷新'
          banner.onclick = () => {
            window.location.reload()
          }
          document.body.appendChild(banner)
          // 5 秒后自动消失
          setTimeout(() => banner.remove(), 8000)
        }
      })
    })

    // 添加弹出动画
    const style = document.createElement('style')
    style.textContent = '@keyframes sw-pop{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}'
    document.head.appendChild(style)
  }, [])

  return null
}