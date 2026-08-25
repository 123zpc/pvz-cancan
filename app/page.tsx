'use client'

import { useCallback, useEffect, useState } from 'react'
import { LEVELS, type Level } from '@/lib/game/data'
import { MATCH3_LEVELS, type Match3Level } from '@/lib/game/match3'
import { AdminPanel } from '@/components/game/admin-panel'
import { Battle } from '@/components/game/battle'
import { GamesHub } from '@/components/game/games-hub'
import { LevelSelect } from '@/components/game/level-select'
import { MainMenu } from '@/components/game/main-menu'
import { Match3 } from '@/components/game/match3'
import { Match3Select } from '@/components/game/match3-select'
import { MusicToggle } from '@/components/game/music-toggle'
import { QixiDecor, QixiGreeting } from '@/components/game/qixi-theme'
import { audio } from '@/lib/game/audio'
import {
  ADMIN_USER_ID,
  clearAuth,
  getFestivalConfig,
  getProgress,
  getToken,
  getUserId,
  getUserName,
  login as apiLogin,
  saveProgress,
  type Progress,
} from '@/lib/api'

type View = 'menu' | 'games' | 'levels' | 'story' | 'about' | 'battle' | 'match3-select' | 'match3' | 'admin'

/** 本地兜底进度：后端不可用时使用，保证离线可玩。包含主游戏 + 消消乐 */
const STORAGE_KEY = 'pvz-cancan-progress-fallback'

/** 七夕主题本地缓存：后端不可达时沿用上次状态（默认开启） */
const QIXI_CACHE_KEY = 'pvz-qixi-cache'

function loadQixiCache(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const v = localStorage.getItem(QIXI_CACHE_KEY)
    return v === null ? true : v === '1'
  } catch {
    return true
  }
}

interface FullProgress {
  unlocked: number
  cleared: number[]
  m3Unlocked?: number
  m3Cleared?: number[]
}

function loadLocalProgress(): FullProgress {
  if (typeof window === 'undefined') return { unlocked: 1, cleared: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { unlocked: 1, cleared: [] }
    const data = JSON.parse(raw)
    return {
      unlocked: Math.max(1, Math.min(LEVELS.length, data.unlocked ?? 1)),
      cleared: Array.isArray(data.cleared) ? data.cleared : [],
      m3Unlocked: Math.max(1, Math.min(MATCH3_LEVELS.length, data.m3Unlocked ?? 1)),
      m3Cleared: Array.isArray(data.m3Cleared) ? data.m3Cleared : [],
    }
  } catch {
    return { unlocked: 1, cleared: [] }
  }
}

function saveLocalProgress(p: FullProgress) {
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
  const [m3Unlocked, setM3Unlocked] = useState(1)
  const [m3Cleared, setM3Cleared] = useState<number[]>([])
  const [match3Level, setMatch3Level] = useState<Match3Level | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  /** 累计游戏时长（秒），用于管理后台展示 */
  const [totalPlayTimeSec, setTotalPlayTimeSec] = useState(0)
  /** 主游戏每关最佳通关用时 */
  const [levelBestTimes, setLevelBestTimes] = useState<Record<number, number>>({})
  /** 消消乐每关最佳通关用时 */
  const [m3LevelBestTimes, setM3LevelBestTimes] = useState<Record<number, number>>({})
  /** 七夕限定主题（管理后台可开关） */
  const [qixiOn, setQixiOn] = useState<boolean>(loadQixiCache)

  const isAdmin = userId === ADMIN_USER_ID

  /** 同步七夕主题：写状态 + 本地缓存 + html 属性 */
  const applyQixi = useCallback((on: boolean) => {
    setQixiOn(on)
    try {
      localStorage.setItem(QIXI_CACHE_KEY, on ? '1' : '0')
    } catch {
      /* 忽略 */
    }
  }, [])

  const fetchFestival = useCallback(async () => {
    try {
      const c = await getFestivalConfig()
      applyQixi(c.qixi)
    } catch {
      // 后端不可达：沿用本地缓存
    }
  }, [applyQixi])

  // 主题属性挂到 <html>，驱动 CSS 变量换装；同步 iOS 状态栏与地址栏配色，让星空天幕与状态栏融合
  useEffect(() => {
    document.documentElement.dataset.qixi = qixiOn ? 'on' : 'off'
    const themeColor = document.querySelector('meta[name="theme-color"]')
    const statusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    if (qixiOn) {
      // 七夕：深靛蓝实色 + 黑底白字，与星空天幕协调
      themeColor?.setAttribute('content', '#2a2350')
      statusBar?.setAttribute('content', 'black')
    } else {
      // 经典：草坪绿 + 白底黑字
      themeColor?.setAttribute('content', '#8ed17a')
      statusBar?.setAttribute('content', 'default')
    }
  }, [qixiOn])

  // 启动时：检查 token 是否仍有效，并从后端拉取进度
  useEffect(() => {
    const token = getToken()
    if (!token) return // 未登录
    fetchFestival()
    // 有 token：尝试从后端拉进度，失败则清登录态
    getProgress()
      .then((p) => {
        setUserName(getUserName() ?? '')
        setUserId(getUserId() ?? '')
        setUnlocked(Math.max(1, Math.min(LEVELS.length, p.unlocked ?? 1)))
        setCleared(Array.isArray(p.cleared) ? p.cleared : [])
        setM3Unlocked(Math.max(1, Math.min(MATCH3_LEVELS.length, p.m3Unlocked ?? 1)))
        setM3Cleared(Array.isArray(p.m3Cleared) ? p.m3Cleared : [])
        setTotalPlayTimeSec(p.totalPlayTimeSec ?? 0)
        setLevelBestTimes(p.levelBestTimes ?? {})
        setM3LevelBestTimes(p.m3LevelBestTimes ?? {})
        // 云端进度写入状态后才启用自动保存，避免初始第 1 关覆盖它。
        setAuthed(true)
      })
      .catch(() => {
        // token 失效或后端不可达：清除登录态，回登录页
        clearAuth()
      })
  }, [fetchFestival])

  // 登录：调用后端 /api/login
  const handlePassword = async () => {
    setPwLoading(true)
    try {
      const result = await apiLogin(pwInput)
      setUserName(result.name)
      setUserId(result.userId)
      // 登录后拉取云端进度与节日主题配置
      fetchFestival()
      try {
        const p = await getProgress()
        setUnlocked(Math.max(1, Math.min(LEVELS.length, p.unlocked ?? 1)))
        setCleared(Array.isArray(p.cleared) ? p.cleared : [])
        setM3Unlocked(Math.max(1, Math.min(MATCH3_LEVELS.length, p.m3Unlocked ?? 1)))
        setM3Cleared(Array.isArray(p.m3Cleared) ? p.m3Cleared : [])
        setTotalPlayTimeSec(p.totalPlayTimeSec ?? 0)
        setLevelBestTimes(p.levelBestTimes ?? {})
        setM3LevelBestTimes(p.m3LevelBestTimes ?? {})
      } catch {
        // 云端无进度时用本地兜底
        const local = loadLocalProgress()
        setUnlocked(local.unlocked)
        setCleared(local.cleared)
        setM3Unlocked(local.m3Unlocked ?? 1)
        setM3Cleared(local.m3Cleared ?? [])
      }
      // 等云端进度（或本地兜底）写入状态后再保存，避免初始第 1 关发生竞态覆盖。
      setAuthed(true)
    } catch {
      setPwError(true)
      setTimeout(() => setPwError(false), 600)
    } finally {
      setPwLoading(false)
    }
  }

  // 进度变化时：写本地兜底 + 异步写后端（主游戏 + 消消乐 + 用时合并保存）
  useEffect(() => {
    if (!authed) return
    const p: Progress = {
      unlocked,
      cleared,
      m3Unlocked,
      m3Cleared,
      totalPlayTimeSec,
      levelBestTimes,
      m3LevelBestTimes,
      lastPlayedAt: Date.now(),
    }
    saveLocalProgress(p)
    saveProgress(p).catch(() => { /* 后端不可达时静默，本地已存 */ })
  }, [authed, unlocked, cleared, m3Unlocked, m3Cleared, totalPlayTimeSec, levelBestTimes, m3LevelBestTimes])

  const handleWin = useCallback((levelId: number, timeSec: number) => {
    setCleared((c) => (c.includes(levelId) ? c : [...c, levelId]))
    setUnlocked((u) => Math.max(u, Math.min(LEVELS.length, levelId + 1)))
    setTotalPlayTimeSec((t) => t + timeSec)
    setLevelBestTimes((m) => {
      const prev = m[levelId]
      if (prev === undefined || timeSec < prev) return { ...m, [levelId]: timeSec }
      return m
    })
  }, [])

  const handleMatch3Win = useCallback((levelId: number, timeSec: number) => {
    setM3Cleared((c) => (c.includes(levelId) ? c : [...c, levelId]))
    setM3Unlocked((u) => Math.max(u, Math.min(MATCH3_LEVELS.length, levelId + 1)))
    setTotalPlayTimeSec((t) => t + timeSec)
    setM3LevelBestTimes((m) => {
      const prev = m[levelId]
      if (prev === undefined || timeSec < prev) return { ...m, [levelId]: timeSec }
      return m
    })
  }, [])

  const nextLevel = level ? LEVELS.find((l) => l.id === level.id + 1) : undefined
  const nextMatch3Level = match3Level ? MATCH3_LEVELS.find((l) => l.id === match3Level.id + 1) : undefined

  const handleLogout = useCallback(() => {
    clearAuth()
    setAuthed(false)
    setUserName('')
    setUserId('')
    setPwInput('')
    setView('menu')
    // 重置进度到初始，下次登录会重新从后端拉取
    setUnlocked(1)
    setCleared([])
    setM3Unlocked(1)
    setM3Cleared([])
    setTotalPlayTimeSec(0)
    setLevelBestTimes({})
    setM3LevelBestTimes({})
    setLevel(null)
    setMatch3Level(null)
  }, [])

  // 七夕装饰：仅非游戏界面（battle/match3 保持棋盘清爽）
  const showQixiDecor = qixiOn && view !== 'battle' && view !== 'match3'

  // 密码门
  if (!authed) {
    return (
      <>
      {showQixiDecor && <QixiDecor />}
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
      </>
    )
  }

  if (view === 'games') {
    return (
      <>
        {showQixiDecor && <QixiDecor />}
        <GamesHub
          onBack={() => setView('menu')}
          onSelectPvZ={() => setView('levels')}
          onSelectMatch3={() => setView('match3-select')}
          pvzUnlocked={unlocked}
          pvzCleared={cleared}
          pvzTotal={LEVELS.length}
          m3Unlocked={m3Unlocked}
          m3Cleared={m3Cleared}
          m3Total={MATCH3_LEVELS.length}
        />
      </>
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

  if (view === 'match3' && match3Level) {
    return (
      <Match3
        level={match3Level}
        onExit={() => setView('match3-select')}
        onWin={handleMatch3Win}
        onNext={nextMatch3Level ? () => { setMatch3Level(nextMatch3Level); setView('match3') } : undefined}
      />
    )
  }

  if (view === 'match3-select') {
    return (
      <>
        {showQixiDecor && <QixiDecor />}
        <Match3Select
          unlocked={m3Unlocked}
          cleared={m3Cleared}
          onStart={(l) => {
            setMatch3Level(l)
            setView('match3')
          }}
          onBack={() => setView('menu')}
        />
      </>
    )
  }

  if (view === 'admin' && isAdmin) {
    return (
      <>
        {showQixiDecor && <QixiDecor />}
        <AdminPanel onBack={() => setView('menu')} onFestivalChanged={fetchFestival} />
      </>
    )
  }

  if (view === 'levels') {
    return (
      <>
        {showQixiDecor && <QixiDecor />}
        <LevelSelect
          unlocked={unlocked}
          cleared={cleared}
          onStart={(l) => {
            setLevel(l)
            setView('battle')
          }}
          onBack={() => setView('menu')}
        />
      </>
    )
  }

  if (view === 'story') {
    return (
      <>
        {showQixiDecor && <QixiDecor />}
        <StoryView onBack={() => setView('menu')} onPlay={() => setView('levels')} />
      </>
    )
  }

  if (view === 'about') {
    return (
      <>
        {showQixiDecor && <QixiDecor />}
        <AboutView onBack={() => setView('menu')} />
      </>
    )
  }

  return (
    <>
      {showQixiDecor && <QixiDecor />}
      {qixiOn && <QixiGreeting userName={userName} />}
      <MainMenu
        onPlay={() => setView('games')}
        onStory={() => setView('story')}
        onAbout={() => setView('about')}
        onAdmin={isAdmin ? () => setView('admin') : undefined}
        userName={userName}
        onLogout={handleLogout}
        qixi={qixiOn}
      />
    </>
  )
}

const STORY_CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五']

/** 故事章节配色：与 data.ts 的 storyTheme 对应，15 种可爱卡通配色 */
const STORY_THEME_CLS: Record<string, { box: string; title: string; highlight: string }> = {
  sunny: { box: 'bg-amber-50 border-2 border-amber-200', title: 'text-amber-600', highlight: 'text-amber-600' },
  rose: { box: 'bg-rose-50 border-2 border-rose-200', title: 'text-rose-500', highlight: 'text-rose-500' },
  ice: { box: 'bg-sky-50 border-2 border-sky-200', title: 'text-sky-600', highlight: 'text-sky-600' },
  mint: { box: 'bg-emerald-50 border-2 border-emerald-200', title: 'text-emerald-600', highlight: 'text-emerald-600' },
  cherry: { box: 'bg-red-50 border-2 border-red-200', title: 'text-red-500', highlight: 'text-red-500' },
  dawn: { box: 'bg-orange-50 border-2 border-orange-200', title: 'text-orange-600', highlight: 'text-orange-600' },
  rain: { box: 'bg-violet-50 border-2 border-violet-200', title: 'text-violet-600', highlight: 'text-violet-600' },
  milk: { box: 'bg-yellow-50 border-2 border-yellow-200', title: 'text-yellow-700', highlight: 'text-yellow-700' },
  star: { box: 'bg-indigo-50 border-2 border-indigo-200', title: 'text-indigo-500', highlight: 'text-indigo-500' },
  gold: { box: 'bg-pink-50 border-2 border-pink-200', title: 'text-pink-600', highlight: 'text-pink-600' },
  ocean: { box: 'bg-cyan-50 border-2 border-cyan-200', title: 'text-cyan-600', highlight: 'text-cyan-600' },
  wheel: { box: 'bg-purple-50 border-2 border-purple-200', title: 'text-purple-500', highlight: 'text-purple-500' },
  green: { box: 'bg-lime-50 border-2 border-lime-200', title: 'text-lime-600', highlight: 'text-lime-600' },
  candy: { box: 'bg-fuchsia-50 border-2 border-fuchsia-200', title: 'text-fuchsia-500', highlight: 'text-fuchsia-500' },
  fire: { box: 'bg-red-50 border-2 border-orange-200', title: 'text-orange-500', highlight: 'text-orange-500' },
}

function StoryView({ onBack, onPlay }: { onBack: () => void; onPlay: () => void }) {
  useEffect(() => {
    audio.startMusic('menu')
    return () => { audio.stopMusic() }
  }, [])

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground transition-transform hover:-translate-y-0.5"
        >
          ← 返回菜单
        </button>
        <MusicToggle />
      </div>

      <section className="rounded-3xl border-4 border-primary/25 bg-card p-6 shadow-lg sm:p-10">
        <h1 className="font-display text-3xl font-extrabold text-primary sm:text-4xl">守护草坪的故事</h1>
        <p className="mt-1 text-sm text-muted-foreground">十个关卡，未完待续</p>

        <div className="mt-6 space-y-5">
          {LEVELS.map((lv) => {
            const theme = STORY_THEME_CLS[lv.storyTheme] ?? STORY_THEME_CLS.sunny
            return (
              <div key={lv.id} className={`rounded-2xl ${theme.box} p-4 transition-transform hover:-translate-y-0.5`}>
                <h3 className={`font-display text-lg font-bold ${theme.title}`}>
                  第{STORY_CN_NUM[lv.id - 1] ?? lv.id}章 · {lv.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {lv.story}
                  {lv.storyHighlight && (
                    <span className={`mt-2 block font-bold ${theme.highlight}`}>{lv.storyHighlight}</span>
                  )}
                </p>
              </div>
            )
          })}
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
  useEffect(() => {
    audio.startMusic('menu')
    return () => { audio.stopMusic() }
  }, [])

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground transition-transform hover:-translate-y-0.5"
        >
          ← 返回菜单
        </button>
        <MusicToggle />
      </div>

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
