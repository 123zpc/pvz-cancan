'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Maximize, Minimize, Pause, Play, RotateCcw, Skull } from 'lucide-react'
import { PLANTS, type Level, type PlantId } from '@/lib/game/data'
import { collectSun, createGame, digPlant, placePlant, step, type GameState } from '@/lib/game/engine'
import { Button } from '@/components/ui/button'
import { Board } from './board'
import { SeedBank } from './seed-bank'

interface BattleProps {
  level: Level
  onExit: () => void
  onWin: (levelId: number) => void
  onNext?: () => void
}

export function Battle({ level, onExit, onWin, onNext }: BattleProps) {
  const gameRef = useRef<GameState>(createGame(level))
  const [, force] = useState(0)
  const [round, setRound] = useState(0)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const [selected, setSelected] = useState<PlantId | null>(null)
  const [shovel, setShovel] = useState(false)
  const [mobileUI, setMobileUI] = useState(false)
  const [landscape, setLandscape] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showIOSHint, setShowIOSHint] = useState(false)

  /** iOS Safari 不支持 Fullscreen API，只能通过"添加到主屏幕"实现全屏 */
  const isIOS = useCallback(() => {
    if (typeof navigator === 'undefined') return false
    return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  }, [])

  /** 是否已以 standalone 模式运行（从主屏幕启动） */
  const isStandalone = useCallback(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(display-mode: standalone)').matches ||
      (typeof navigator.standalone === 'boolean' && navigator.standalone)
  }, [])

  pausedRef.current = paused

  useEffect(() => {
    gameRef.current = createGame(level)
    setSelected(null)
    setShovel(false)
    setPaused(false)
  }, [level, round])

  useEffect(() => {
    const mqMobile = window.matchMedia('(pointer: coarse) and (max-width: 1023px)')
    const mqLand = window.matchMedia('(orientation: landscape)')
    const update = () => {
      setMobileUI(mqMobile.matches)
      setLandscape(mqLand.matches)
    }
    update()
    mqMobile.addEventListener('change', update)
    mqLand.addEventListener('change', update)
    return () => {
      mqMobile.removeEventListener('change', update)
      mqLand.removeEventListener('change', update)
    }
  }, [])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const g = gameRef.current
      if (!pausedRef.current) step(g, dt)
      force((f) => f + 1)
      if (g.status === 'playing') raf = requestAnimationFrame(loop)
      else if (g.status === 'won') onWin(g.level.id)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [level, round, onWin])

  const game = gameRef.current

  const handleCell = useCallback(
    (row: number, col: number) => {
      const g = gameRef.current
      if (g.status !== 'playing') return
      if (shovel) {
        const p = g.plants.find((x) => x.row === row && x.col === col)
        if (p) digPlant(g, p.uid)
        setShovel(false)
        return
      }
      if (!selected) return
      if (placePlant(g, selected, row, col)) setSelected(null)
    },
    [selected, shovel],
  )

  const handleSun = useCallback((uid: number) => collectSun(gameRef.current, uid), [])

  const tryLandscape = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen()
      if (screen.orientation && typeof screen.orientation.lock === 'function') {
        await screen.orientation.lock('landscape')
      }
    } catch {
      /* iOS Safari 不支持 */
    }
  }, [])

  const toggleFullscreen = useCallback(async () => {
    // iOS Safari 不支持 Fullscreen API
    if (isIOS()) {
      if (isStandalone()) return // 已在主屏幕模式
      setShowIOSHint(true)
      return
    }
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {
      /* 忽略 */
    }
  }, [isIOS, isStandalone])

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const progress = Math.min(100, (game.spawnIndex / game.level.spawns.length) * 100)
  const finished = game.status !== 'playing'

  const desktopBoardCls = 'aspect-[4/3] w-full sm:aspect-[16/10]'

  /* ── 桌面端布局 ── */
  if (!mobileUI) {
    return (
      <>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 p-3 sm:p-5">
        <header className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onExit} className="rounded-full">
            <ArrowLeft className="size-4" aria-hidden="true" />
            关卡
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-bold sm:text-xl">
              第 {level.id} 关 · {level.name}
            </h1>
            <p className="truncate text-xs text-muted-foreground">{level.hint}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground tabular-nums">
              <Skull className="size-3.5" aria-hidden="true" />
              {game.killed}
            </span>
            <Button variant="secondary" size="icon" className="rounded-full" onClick={() => setPaused((p) => !p)}>
              {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
              <span className="sr-only">{paused ? '继续游戏' : '暂停游戏'}</span>
            </Button>
            <Button variant="secondary" size="icon" className="rounded-full" onClick={() => setRound((r) => r + 1)}>
              <RotateCcw className="size-4" />
              <span className="sr-only">重新开始</span>
            </Button>
            <Button variant="secondary" size="icon" className="rounded-full" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
              <span className="sr-only">{isFullscreen ? '退出全屏' : '全屏'}</span>
            </Button>
          </div>
        </header>

        <SeedBank
          game={game}
          selected={selected}
          shovel={shovel}
          onSelect={(id) => {
            setShovel(false)
            setSelected((cur) => (cur === id ? null : id))
          }}
          onShovel={() => {
            setSelected(null)
            setShovel((s) => !s)
          }}
        />

        <div className="relative">
          <Board game={game} selected={selected} shovel={shovel} onCell={handleCell} onSun={handleSun} className={desktopBoardCls} />

          {(paused || finished) && (
            <div className="absolute inset-0 z-90 flex items-center justify-center rounded-3xl bg-foreground/55 p-4">
              <div className="w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-xl">
                <h2 className="font-display text-2xl font-bold">
                  {game.status === 'won' ? '草坪守住啦！' : game.status === 'lost' ? '僵尸进屋了…' : '已暂停'}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {game.status === 'won'
                    ? `你击退了 ${game.killed} 只僵尸，下一关已解锁。`
                    : game.status === 'lost'
                      ? '别灰心，多种向日葵、前排放坚果再试一次。'
                      : '喝口水，随时继续。'}
                </p>
                {game.status === 'won' && (
                  <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-2 text-sm font-bold text-rose-500">
                    {level.message}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {game.status === 'playing' ? (
                    <Button className="rounded-full" onClick={() => setPaused(false)}>
                      继续
                    </Button>
                  ) : (
                    <Button className="rounded-full" onClick={() => setRound((r) => r + 1)}>
                      再玩一次
                    </Button>
                  )}
                  {game.status === 'won' && onNext && (
                    <Button className="rounded-full" onClick={onNext}>
                      下一关
                    </Button>
                  )}
                  <Button variant="secondary" className="rounded-full" onClick={onExit}>
                    返回关卡
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span>僵尸进度</span>
            <span className="tabular-nums">{Math.round(progress)}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-destructive transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          玩法：点击上方卡片选中植物 → 点击草地种下。点击天上的
          <span className="font-bold text-accent-foreground">阳光</span>
          收集资源；{level.sunInterval === 0 ? '本关是夜晚，天上不会掉阳光，' : ''}
          僵尸走到最左边会被小推车清扫一次，第二次就守不住了。当前可用：
          {level.plants.map((p) => PLANTS[p].name).join('、')}。
        </p>
      </div>

      {/* iOS 全屏提示弹窗 */}
      {showIOSHint && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/55 p-4">
          <div className="w-full max-w-xs rounded-3xl bg-card p-6 text-center shadow-xl">
            <h2 className="font-display text-lg font-bold">添加到主屏幕以全屏</h2>
            <p className="mt-3 space-y-2 text-left text-sm text-muted-foreground">
              <span className="block">1. 点击 Safari 底部的<span className="font-bold text-foreground">分享</span>按钮</span>
              <span className="block">2. 选择<span className="font-bold text-foreground">「添加到主屏幕」</span></span>
              <span className="block">3. 从主屏幕图标启动即可全屏</span>
            </p>
            <Button className="mt-5 rounded-full" onClick={() => setShowIOSHint(false)}>
              知道了
            </Button>
          </div>
        </div>
      )}
      </>
    )
  }

  /* ── 移动端竖屏：旋转提示 + 横屏按钮 ── */
  if (!landscape) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background p-8 text-center">
        <div className="anim-rotate-phone">
          <svg className="size-20 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="5" y="2" width="14" height="20" rx="3" />
            <path d="M12 18h.01" />
          </svg>
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">请旋转手机至横屏</h2>
          <p className="mt-2 text-sm text-muted-foreground">横屏体验更佳，草坪防线一览无余</p>
        </div>
        <Button onClick={tryLandscape} className="rounded-full">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 16v5h-5" />
            <path d="M21 8V3h-5" />
            <path d="M3 16v5h5" />
            <path d="M3 8V3h5" />
          </svg>
          自动横屏
        </Button>
        <Button variant="secondary" size="sm" onClick={onExit} className="rounded-full">
          <ArrowLeft className="size-4" aria-hidden="true" />
          返回关卡
        </Button>
        <p className="text-xs text-muted-foreground/70">iOS 设备请手动旋转；Android 可自动切换</p>
      </div>
    )
  }

  /* ── 移动端横屏：左侧卡片栏 + 右侧棋盘填满 ── */
  const overlayCls = 'absolute inset-0 z-[90] flex items-center justify-center bg-foreground/55 p-4'
  const overlayCard = 'w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-xl'

  return (
    <div className="fixed inset-0 z-40 flex overflow-hidden overscroll-none bg-background">
      {/* 左侧竖向卡片栏 */}
      <div className="flex w-[4.5rem] shrink-0 flex-col">
        <SeedBank
          game={game}
          selected={selected}
          shovel={shovel}
          vertical
          onSelect={(id) => {
            setShovel(false)
            setSelected((cur) => (cur === id ? null : id))
          }}
          onShovel={() => {
            setSelected(null)
            setShovel((s) => !s)
          }}
        />
      </div>

      {/* 右侧：棋盘 + 顶部控制条 + 底部进度条，全部叠加在棋盘上 */}
      <div className="relative min-w-0 flex-1">
        {/* 棋盘填满整个区域 */}
        <Board
          game={game}
          selected={selected}
          shovel={shovel}
          onCell={handleCell}
          onSun={handleSun}
          className="h-full w-full rounded-none border-0"
        />

        {/* 顶部控制条：叠加在棋盘左上角 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[100] flex items-center gap-1.5 px-1.5 py-1">
          <Button
            variant="secondary"
            size="icon-sm"
            onClick={onExit}
            className="pointer-events-auto rounded-full bg-card/85 shadow-md backdrop-blur"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            <span className="sr-only">返回关卡</span>
          </Button>

          {selected && (
            <span className="pointer-events-none rounded-full bg-primary/85 px-2 py-0.5 text-xs font-bold text-primary-foreground shadow-md backdrop-blur">
              {PLANTS[selected].name}
            </span>
          )}
          {shovel && (
            <span className="pointer-events-none rounded-full bg-destructive/85 px-2 py-0.5 text-xs font-bold text-card shadow-md backdrop-blur">
              铲子
            </span>
          )}

          <div className="pointer-events-auto ml-auto flex items-center gap-1">
            <span className="flex items-center gap-1 rounded-full bg-card/85 px-2 py-0.5 text-xs font-bold text-secondary-foreground shadow-md backdrop-blur tabular-nums">
              <Skull className="size-3" aria-hidden="true" />
              {game.killed}
            </span>
            <Button
              variant="secondary"
              size="icon-sm"
              className="rounded-full bg-card/85 shadow-md backdrop-blur"
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
              <span className="sr-only">{paused ? '继续游戏' : '暂停游戏'}</span>
            </Button>
            <Button
              variant="secondary"
              size="icon-sm"
              className="rounded-full bg-card/85 shadow-md backdrop-blur"
              onClick={() => setRound((r) => r + 1)}
            >
              <RotateCcw className="size-3.5" />
              <span className="sr-only">重新开始</span>
            </Button>
            <Button
              variant="secondary"
              size="icon-sm"
              className="rounded-full bg-card/85 shadow-md backdrop-blur"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
              <span className="sr-only">{isFullscreen ? '退出全屏' : '全屏'}</span>
            </Button>
          </div>
        </div>

        {/* 底部进度条：叠加在棋盘底部 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[100] px-1.5 pb-0.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/30">
            <div
              className="h-full rounded-full bg-destructive transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 暂停 / 结束遮罩 */}
        {(paused || finished) && (
          <div className={overlayCls}>
            <div className={overlayCard}>
              <h2 className="font-display text-2xl font-bold">
                {game.status === 'won' ? '草坪守住啦！' : game.status === 'lost' ? '僵尸进屋了…' : '已暂停'}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {game.status === 'won'
                  ? `你击退了 ${game.killed} 只僵尸，下一关已解锁。`
                  : game.status === 'lost'
                    ? '别灰心，多种向日葵、前排放坚果再试一次。'
                    : '喝口水，随时继续。'}
              </p>
              {game.status === 'won' && (
                <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-2 text-sm font-bold text-rose-500">
                  {level.message}
                </p>
              )}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {game.status === 'playing' ? (
                  <Button className="rounded-full" onClick={() => setPaused(false)}>
                    继续
                  </Button>
                ) : (
                  <Button className="rounded-full" onClick={() => setRound((r) => r + 1)}>
                    再玩一次
                  </Button>
                )}
                {game.status === 'won' && onNext && (
                  <Button className="rounded-full" onClick={onNext}>
                    下一关
                  </Button>
                )}
                <Button variant="secondary" className="rounded-full" onClick={onExit}>
                  返回关卡
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* iOS 全屏提示弹窗 */}
      {showIOSHint && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/55 p-4">
          <div className="w-full max-w-xs rounded-3xl bg-card p-6 text-center shadow-xl">
            <h2 className="font-display text-lg font-bold">添加到主屏幕以全屏</h2>
            <p className="mt-3 space-y-2 text-left text-sm text-muted-foreground">
              <span className="block">1. 点击 Safari 底部的<span className="font-bold text-foreground">分享</span>按钮</span>
              <span className="block">2. 选择<span className="font-bold text-foreground">「添加到主屏幕」</span></span>
              <span className="block">3. 从主屏幕图标启动即可全屏</span>
            </p>
            <Button className="mt-5 rounded-full" onClick={() => setShowIOSHint(false)}>
              知道了
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
