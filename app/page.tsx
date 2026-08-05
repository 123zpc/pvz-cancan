'use client'

import { useCallback, useEffect, useState } from 'react'
import { LEVELS, type Level } from '@/lib/game/data'
import { Battle } from '@/components/game/battle'
import { LevelSelect } from '@/components/game/level-select'
import { MainMenu } from '@/components/game/main-menu'
import {
  clearAuth,
  getProgress,
  getToken,
  getUserName,
  login as apiLogin,
  saveProgress,
  type Progress,
} from '@/lib/api'

type View = 'menu' | 'levels' | 'story' | 'about' | 'battle'

/** 本地兜底进度：后端不可用时使用，保证离线可玩 */
const STORAGE_KEY = 'pvz-cancan-progress-fallback'

function loadLocalProgress(): Progress {
  if (typeof window === 'undefined') return { unlocked: 1, cleared: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { unlocked: 1, cleared: [] }
    const data = JSON.parse(raw)
    return {
      unlocked: Math.max(1, Math.min(LEVELS.length, data.unlocked ?? 1)),
      cleared: Array.isArray(data.cleared) ? data.cleared : [],
    }
  } catch {
    return { unlocked: 1, cleared: [] }
  }
}

function saveLocalProgress(p: Progress) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch { /* 忽略 */ }
}

export default function Page() {
  const [authed, setAuthed] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [view, setView] = useState<View>('menu')
  const [level, setLevel] = useState<Level | null>(null)
  const [unlocked, setUnlocked] = useState(1)
  const [cleared, setCleared] = useState<number[]>([])
  const [userName, setUserName] = useState<string>('')

  // 启动时：检查 token 是否仍有效，并从后端拉取进度
  useEffect(() => {
    const token = getToken()
    if (!token) return // 未登录
    // 有 token：尝试从后端拉进度，失败则清登录态
    getProgress()
      .then((p) => {
        setAuthed(true)
        setUserName(getUserName() ?? '')
        setUnlocked(Math.max(1, Math.min(LEVELS.length, p.unlocked ?? 1)))
        setCleared(Array.isArray(p.cleared) ? p.cleared : [])
      })
      .catch(() => {
        // token 失效或后端不可达：清除登录态，回登录页
        clearAuth()
      })
  }, [])

  // 登录：调用后端 /api/login
  const handlePassword = async () => {
    setPwLoading(true)
    try {
      const result = await apiLogin(pwInput)
      setAuthed(true)
      setUserName(result.name)
      // 登录后拉取云端进度
      try {
        const p = await getProgress()
        setUnlocked(Math.max(1, Math.min(LEVELS.length, p.unlocked ?? 1)))
        setCleared(Array.isArray(p.cleared) ? p.cleared : [])
      } catch {
        // 云端无进度时用本地兜底
        const local = loadLocalProgress()
        setUnlocked(local.unlocked)
        setCleared(local.cleared)
      }
    } catch {
      setPwError(true)
      setTimeout(() => setPwError(false), 600)
    } finally {
      setPwLoading(false)
    }
  }

  // 进度变化时：写本地兜底 + 异步写后端
  useEffect(() => {
    if (!authed) return
    const p: Progress = { unlocked, cleared }
    saveLocalProgress(p)
    saveProgress(p).catch(() => { /* 后端不可达时静默，本地已存 */ })
  }, [authed, unlocked, cleared])

  const handleWin = useCallback((levelId: number) => {
    setCleared((c) => (c.includes(levelId) ? c : [...c, levelId]))
    setUnlocked((u) => Math.max(u, Math.min(LEVELS.length, levelId + 1)))
  }, [])

  const nextLevel = level ? LEVELS.find((l) => l.id === level.id + 1) : undefined

  // 密码门
  if (!authed) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-b from-lawn/30 via-background to-lawn/20 p-6">
        <div className="w-full max-w-xs text-center">
          <div className="mb-6 text-5xl">🌻</div>
          <h1 className="font-display text-2xl font-extrabold text-primary">灿灿专属版</h1>
          <p className="mt-2 text-sm text-muted-foreground">请输入密码进入游戏</p>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handlePassword() }}
            placeholder="· · · · · ·"
            className={`mt-6 w-full rounded-2xl border-2 bg-card/80 px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none transition-colors placeholder:tracking-[0.3em] placeholder:text-muted-foreground/40 focus:border-primary ${
              pwError ? 'animate-pulse border-red-500' : 'border-border'
            }`}
          />
          {pwError && <p className="mt-2 text-sm text-red-500">密码不对哦～</p>}
          <button
            onClick={handlePassword}
            disabled={pwLoading}
            className="mt-4 w-full rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition-transform active:scale-95 disabled:opacity-60"
          >
            {pwLoading ? '进入中…' : '进入'}
          </button>
        </div>
      </div>
    )
  }

  if (view === 'battle' && level) {
    return (
      <Battle
        level={level}
        onExit={() => setView('levels')}
        onWin={handleWin}
        onNext={nextLevel ? () => { setLevel(nextLevel); setView('battle') } : undefined}
      />
    )
  }

  if (view === 'levels') {
    return (
      <LevelSelect
        unlocked={unlocked}
        cleared={cleared}
        onStart={(l) => {
          setLevel(l)
          setView('battle')
        }}
        onBack={() => setView('menu')}
      />
    )
  }

  if (view === 'story') {
    return <StoryView onBack={() => setView('menu')} onPlay={() => setView('levels')} />
  }

  if (view === 'about') {
    return <AboutView onBack={() => setView('menu')} />
  }

  const handleLogout = useCallback(() => {
    clearAuth()
    setAuthed(false)
    setUserName('')
    setPwInput('')
    setView('menu')
    // 重置进度到初始，下次登录会重新从后端拉取
    setUnlocked(1)
    setCleared([])
  }, [])

  return (
    <MainMenu
      onPlay={() => setView('levels')}
      onStory={() => setView('story')}
      onAbout={() => setView('about')}
      userName={userName}
      onLogout={handleLogout}
    />
  )
}

function StoryView({ onBack, onPlay }: { onBack: () => void; onPlay: () => void }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground transition-transform hover:-translate-y-0.5"
      >
        ← 返回菜单
      </button>

      <section className="rounded-3xl border-4 border-primary/25 bg-card p-6 shadow-lg sm:p-10">
        <h1 className="font-display text-3xl font-extrabold text-primary sm:text-4xl">守护草坪的故事</h1>
        <p className="mt-1 text-sm text-muted-foreground">十个关卡，未完待续</p>

        <div className="mt-6 space-y-6">
          <div className="rounded-2xl bg-lawn/20 p-4">
            <h3 className="font-display text-lg font-bold text-primary">第一章 · 初遇</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              那是一个阳光明媚的午后，你在人群中笑着，整个世界都亮了。
              我笨拙地走上前，心跳得像草坪上第一朵向日葵刚绽放。
            </p>
          </div>

          <div className="rounded-2xl bg-lawn/20 p-4">
            <h3 className="font-display text-lg font-bold text-primary">第二章 · 约会</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              每一次约会，紧张得像面对一波路障僵尸。
              但你来的时候，所有不安都化成了笑。那天我们走了很久很久。
            </p>
          </div>

          <div className="rounded-2xl bg-sky-100/60 p-4">
            <h3 className="font-display text-lg font-bold text-sky-700">第三章 · 暖冬</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              冬天很冷，但你的手很暖。
              即使在最冷的夜晚，有你在，心里就一直是春天。
            </p>
          </div>

          <div className="rounded-2xl bg-lawn/20 p-4">
            <h3 className="font-display text-lg font-bold text-primary">第四章 · 磨合</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              不是每一天都完。
              困难不可怕，一起面对就好。
            </p>
          </div>

          <div className="rounded-2xl bg-rose-50 p-4">
            <h3 className="font-display text-lg font-bold text-rose-500">第五章 · 守护</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              你知道，爱不只是一时心动。
              不管未来有多少风雨，我都愿意做你身边最坚固的那道防线。
            </p>
          </div>

          <div className="rounded-2xl bg-lawn/20 p-4">
            <h3 className="font-display text-lg font-bold text-primary">第六章 · 早晨</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              日子一天天过去，最好的浪漫变成了清晨醒来。
              一句早安，平凡得发光。
            </p>
          </div>

          <div className="rounded-2xl bg-sky-100/60 p-4">
            <h3 className="font-display text-lg font-bold text-sky-700">第七章 · 雨天</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              下雨天，也有不一样的风味。
              外面风大雨大，但你的头靠在我肩上，整个世界就安安静静的。
            </p>
          </div>

          <div className="rounded-2xl bg-lawn/20 p-4">
            <h3 className="font-display text-lg font-bold text-primary">第八章 · 日常</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              一起逛超市、一起散步、一起游戏。
              我发现最幸福的事不是轰轰烈烈，而是和你过的每一个普通日子。
            </p>
          </div>

          <div className="rounded-2xl bg-indigo-50 p-4">
            <h3 className="font-display text-lg font-bold text-indigo-500">第九章 · 星空</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              那晚我们坐在公园长椅上看星星。
              我们有说有笑，你笑的时候所有星星都黯然失色。
            </p>
          </div>

          <div className="rounded-2xl bg-rose-50 p-4">
            <h3 className="font-display text-lg font-bold text-rose-500">第十章 · 守护</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              从初遇到永远，这条路我们一起走。
              不管未来还有什么关卡，我都愿意陪你一关一关过下去。
              <span className="mt-2 block font-bold text-rose-500">灿灿，这个游戏是送给你的礼物。愿你永远灿烂。</span>
            </p>
          </div>
        </div>

        <button
          onClick={onPlay}
          className="mt-8 w-full rounded-full bg-primary px-6 py-3 font-display text-base font-bold text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5"
        >
          开始游戏
        </button>
      </section>
    </main>
  )
}

function AboutView({ onBack }: { onBack: () => void }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground transition-transform hover:-translate-y-0.5"
      >
        ← 返回菜单
      </button>

      <section className="rounded-3xl border-4 border-primary/25 bg-card p-6 text-center shadow-lg sm:p-10">
        <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-rose-50">
          <svg className="size-12 text-rose-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 21s-6.7-4.3-9.5-8.5C.5 9.5 1.5 6 4.5 5c2-.7 3.8.2 5 1.7C10.7 5.2 12.5 4.3 14.5 5c3 1 4 4.5 2 7.5C18.7 16.7 12 21 12 21z" />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-extrabold text-primary sm:text-3xl">关于这份礼物</h1>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          这是一款专门为灿灿定制的植物大战僵尸小游戏。
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          每一朵向日葵都像你的笑容一样温暖，每一颗阳光都承载着心意，
          每一道防线都是守护你的承诺。
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          希望灿灿玩的时候，可以开心。
        </p>

        <div className="mt-6 rounded-2xl bg-lawn/20 p-4">
          <p className="font-display text-base font-bold text-primary">
            灿灿，愿你的每一天都阳光灿烂。
          </p>
        </div>

        <p className="mt-6 text-xs text-muted-foreground/60">
          ZPC 制作 · 专属于 LCC 的小游戏
        </p>
      </section>
    </main>
  )
}
