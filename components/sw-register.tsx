'use client'

import { useEffect } from 'react'

const VERSION_KEY = 'pvz-app-version'

function showBanner() {
  // 避免重复弹
  if (document.getElementById('sw-update-banner')) return
  const banner = document.createElement('div')
  banner.id = 'sw-update-banner'
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
  setTimeout(() => banner.remove(), 8000)
}

export function SwRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 注入动画
    const style = document.createElement('style')
    style.textContent = '@keyframes sw-pop{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}'
    document.head.appendChild(style)

    // ── 路径 1：Service Worker（主力） ──
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(() => {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'NEW_VERSION') {
            showBanner()
          }
        })
      }).catch(() => {
        // SW 注册失败，静默降级到路径 2
      })
    }

    // ── 路径 2：定时拉取 version.json（兜底，适用于无 SW 的旧 PWA） ──
    const checkVersion = async () => {
      try {
        const res = await fetch('/version.json?_=' + Date.now(), { cache: 'no-store' })
        if (!res.ok) return
        const { version } = await res.json() as { version: string }
        const stored = localStorage.getItem(VERSION_KEY)

        if (!stored) {
          // 首次访问，记录当前版本
          localStorage.setItem(VERSION_KEY, version)
        } else if (stored !== version) {
          // 版本变化，弹提示
          localStorage.setItem(VERSION_KEY, version)
          showBanner()
        }
      } catch {
        // 静默失败
      }
    }

    // 首次检查
    checkVersion()
    // 每 5 分钟检查一次
    const timer = setInterval(checkVersion, 5 * 60 * 1000)

    return () => clearInterval(timer)
  }, [])

  return null
}