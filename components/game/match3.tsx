'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, RotateCcw, Sparkles } from 'lucide-react'
import {
  calcScore,
  createGrid,
  findMatches,
  hasPossibleMove,
  isAdjacent,
  resolveChain,
  swap,
  type Cell,
  type Match3Level,
  type TileType,
  TILE_TYPES,
} from '@/lib/game/match3'
import { PlantSprite, ZombieSprite } from './sprites'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Match3Props {
  level: Match3Level
  onExit: () => void
  onWin: (levelId: number, timeSec: number) => void
  onNext?: () => void
}

type Status = 'playing' | 'won' | 'lost'

/* ── 特效数据结构 ── */
interface CellFx {
  id: number
  r: number
  c: number
  color: string
  delay: number
}
interface BurstFx {
  id: number
  delay: number
}
interface EggFx {
  id: number
  text: string
  delay: number
  color: string
}
interface ScorePopFx {
  id: number
  text: string
  r: number
  c: number
  delay: number
}

/* ── 彩蛋文案池 ── */
const CHAIN_EGGS = [
  { text: '灿灿看到啦', color: '#ec4899' },
  { text: '好厉害～', color: '#f59e0b' },
  { text: '灿灿笑了', color: '#10b981' },
  { text: '再来一次嘛', color: '#6366f1' },
  { text: '灿灿也想要', color: '#ec4899' },
]
const RUN_EGGS: Record<number, { text: string; color: string }> = {
  4: { text: '四个！', color: '#f59e0b' },
  5: { text: '五个！好棒', color: '#6366f1' },
  6: { text: '六个！', color: '#ec4899' },
}

let FX_ID = 0

/** 生成一组随机方向的粒子偏移（基于 seed 的确定性 LCG） */
function makeParticles(seed: number): { dx: number; dy: number }[] {
  let s = (seed * 2654435761) >>> 0
  const rng = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
  const arr: { dx: number; dy: number }[] = []
  for (let i = 0; i < 6; i++) {
    const angle = rng() * Math.PI * 2
    const dist = 18 + rng() * 22
    arr.push({ dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist })
  }
  return arr
}

export function Match3({ level, onExit, onWin, onNext }: Match3Props) {
  const [grid, setGrid] = useState<Cell[][]>(() => createGrid(level.rows, level.cols, level.tileCount))
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [score, setScore] = useState(0)
  const [moves, setMoves] = useState(level.moves)
  const [status, setStatus] = useState<Status>('playing')
  const [busy, setBusy] = useState(false)
  const [cellFx, setCellFx] = useState<CellFx[]>([])
  const [bursts, setBursts] = useState<BurstFx[]>([])
  const [eggs, setEggs] = useState<EggFx[]>([])
  const [scorePops, setScorePops] = useState<ScorePopFx[]>([])
  const [combo, setCombo] = useState(0) // 连续触发的连消次数（≥2 链才算）
  const [shakeKey, setShakeKey] = useState(0)
  /** 本局开始时间戳（毫秒），用于计算通关用时 */
  const startedAtRef = useRef<number>(0)
  const wonRef = useRef(false)

  /* ── 特效入队工具（先定义，便于 effect 使用） ── */
  const pushEgg = useCallback((text: string, color: string, delay: number) => {
    const id = ++FX_ID
    setEggs((e) => [...e, { id, text, color, delay }])
    setTimeout(() => setEggs((e) => e.filter((x) => x.id !== id)), 1400 + delay)
  }, [])

  const pushBurst = useCallback((delay: number) => {
    const id = ++FX_ID
    setBursts((b) => [...b, { id, delay }])
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 700 + delay)
  }, [])

  const pushShake = useCallback(() => {
    setShakeKey((k) => k + 1)
  }, [])

  // 重置关卡
  const reset = useCallback(() => {
    setGrid(createGrid(level.rows, level.cols, level.tileCount))
    setSelected(null)
    setScore(0)
    setMoves(level.moves)
    setStatus('playing')
    setBusy(false)
    setCellFx([])
    setBursts([])
    setEggs([])
    setScorePops([])
    setCombo(0)
    setShakeKey(0)
    startedAtRef.current = Date.now()
    wonRef.current = false
  }, [level])

  useEffect(() => {
    reset()
  }, [reset])

  // 胜利检测
  useEffect(() => {
    if (status === 'playing' && score >= level.target) {
      setStatus('won')
      if (!wonRef.current) {
        wonRef.current = true
        const timeSec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
        onWin(level.id, timeSec)
      }
    } else if (status === 'playing' && moves <= 0 && score < level.target) {
      setStatus('lost')
    }
  }, [score, moves, status, level, onWin])

  // 死局检测：无可行交换时自动洗牌
  useEffect(() => {
    if (status !== 'playing' || busy) return
    if (!hasPossibleMove(grid, level.tileCount)) {
      setGrid(createGrid(level.rows, level.cols, level.tileCount))
      pushEgg('无解，已重新洗牌', '#64748b', 0)
    }
  }, [grid, status, busy, level, pushEgg])

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (busy || status !== 'playing') return
      if (!selected) {
        setSelected([r, c])
        return
      }
      const [sr, sc] = selected
      if (sr === r && sc === c) {
        setSelected(null)
        return
      }
      if (!isAdjacent([sr, sc], [r, c])) {
        setSelected([r, c])
        return
      }
      // 尝试交换
      const swapped = swap(grid, [sr, sc], [r, c])
      if (findMatches(swapped).size === 0) {
        // 无效交换，不扣步数，只取消选中
        setSelected(null)
        return
      }
      setBusy(true)
      setSelected(null)
      setMoves((m) => m - 1)

      // 链式消除
      const { grid: finalGrid, totalCleared, chains, steps, bestRunLength } = resolveChain(swapped, level.tileCount)
      const gained = calcScore(totalCleared, chains, bestRunLength)

      // 计算中心格（用于分数飘字定位）
      const firstStep = steps[0]
      const avgR = firstStep?.clearedCells.reduce((s, cc) => s + cc.r, 0) ?? 0
      const avgC = firstStep?.clearedCells.reduce((s, cc) => s + cc.c, 0) ?? 0
      const n = firstStep?.clearedCells.length ?? 1
      const centerR = avgR / n
      const centerC = avgC / n

      // ── 触发特效 ──
      // 1. 每个被消除的格子：粒子 + 光圈（按 step 错峰）
      const allFx: CellFx[] = []
      let stepDelay = 0
      for (const step of steps) {
        for (const cc of step.clearedCells) {
          allFx.push({
            id: ++FX_ID,
            r: cc.r,
            c: cc.c,
            color: TILE_TYPES[cc.type].color,
            delay: stepDelay,
          })
        }
        stepDelay += 90
      }
      const allFxIds = new Set(allFx.map((f) => f.id))
      setCellFx((prev) => [...prev, ...allFx])
      const maxDelay = stepDelay
      setTimeout(() => {
        setCellFx((prev) => prev.filter((x) => !allFxIds.has(x.id)))
      }, 700 + maxDelay)

      // 2. 分数飘字
      const popId = ++FX_ID
      const popText = `+${gained}`
      setScorePops((p) => [...p, { id: popId, text: popText, r: centerR, c: centerC, delay: maxDelay }])
      setTimeout(() => setScorePops((p) => p.filter((x) => x.id !== popId)), 900 + maxDelay)

      // 3. 连消爆发光晕（≥2 链）
      if (chains >= 2) {
        pushBurst(maxDelay)
      }

      // 4. 大连消震动（≥3 链 或 5+ 连）
      if (chains >= 3 || bestRunLength >= 5) {
        setTimeout(pushShake, maxDelay)
      }

      // 5. 彩蛋文案
      if (bestRunLength >= 4 && RUN_EGGS[bestRunLength]) {
        const egg = RUN_EGGS[bestRunLength]
        pushEgg(egg.text, egg.color, maxDelay)
      } else if (chains >= 5) {
        const egg = CHAIN_EGGS[Math.min(chains - 5, CHAIN_EGGS.length - 1)]
        pushEgg(`${chains} 连消！${egg.text}`, egg.color, maxDelay)
      } else if (chains >= 3) {
        pushEgg(`${chains} 连消！`, '#f59e0b', maxDelay)
      }

      // 6. 连击计数（≥2 链才算 combo）
      if (chains >= 2) {
        setCombo((c) => c + 1)
      } else {
        setCombo(0)
      }

      // 更新分数与网格
      setGrid(finalGrid)
      setScore((s) => s + gained)

      // 总耗时
      setTimeout(() => setBusy(false), 240 + maxDelay)
    },
    [busy, status, selected, grid, level, pushBurst, pushEgg, pushShake],
  )

  const progress = Math.min(100, (score / level.target) * 100)
  const tileTypes = useMemo(() => {
    const arr: TileType[] = ['sunflower', 'peashooter', 'wallnut', 'cherry', 'normal', 'cone']
    return arr.slice(0, level.tileCount)
  }, [level.tileCount])

  // 棋盘百分比坐标
  const pctX = (c: number) => ((c + 0.5) / level.cols) * 100
  const pctY = (r: number) => ((r + 0.5) / level.rows) * 100

  // 第10关专属通关寄语
  const isFinalLevel = level.id === 10
  const finalMessage = isFinalLevel
    ? '灿灿，十关走完，是我们的一段回忆。往后余生，请多指教，我会一直在你身边。'
    : level.message

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3 sm:p-5">
      {/* 顶部状态条 */}
      <header className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onExit} className="rounded-full">
          <ArrowLeft className="size-4" aria-hidden="true" />
          返回
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-bold sm:text-xl">
            消消乐 · 第 {level.id} 关 · {level.name}
          </h1>
          <p className="truncate text-xs text-muted-foreground">{level.subtitle}</p>
        </div>
        {combo >= 2 && (
          <span className="flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-600">
            <Sparkles className="size-3" />
            {combo} 连击
          </span>
        )}
        <Button variant="secondary" size="icon" className="rounded-full" onClick={reset} title="重新开始">
          <RotateCcw className="size-4" />
        </Button>
      </header>

      {/* 数据面板 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-card p-3 text-center shadow-sm">
          <p className="text-xs font-bold text-muted-foreground">分数</p>
          <p className={cn('font-display text-xl font-extrabold tabular-nums', score >= level.target ? 'text-primary' : 'text-foreground')}>
            {score}
          </p>
        </div>
        <div className="rounded-2xl bg-card p-3 text-center shadow-sm">
          <p className="text-xs font-bold text-muted-foreground">目标</p>
          <p className="font-display text-xl font-extrabold tabular-nums text-muted-foreground">{level.target}</p>
        </div>
        <div className="rounded-2xl bg-card p-3 text-center shadow-sm">
          <p className="text-xs font-bold text-muted-foreground">剩余步数</p>
          <p className={cn('font-display text-xl font-extrabold tabular-nums', moves <= 3 ? 'text-destructive' : 'text-foreground')}>
            {moves}
          </p>
        </div>
      </div>

      {/* 进度条 */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 棋盘 + 特效层 */}
      <div className="relative">
        <div
          key={shakeKey}
          className={cn(
            'grid w-full gap-1 rounded-3xl border-4 border-primary/25 bg-lawn/40 p-2 shadow-lg sm:gap-1.5 sm:p-3',
            shakeKey > 0 && 'm3-shake',
          )}
          style={{ gridTemplateColumns: `repeat(${level.cols}, minmax(0, 1fr))` }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const isSel = selected && selected[0] === r && selected[1] === c
              const tile = cell ? TILE_TYPES[cell.type] : null
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleCellClick(r, c)}
                  className={cn(
                    'relative aspect-square rounded-xl bg-card/90 shadow-sm transition-all',
                    isSel ? 'ring-4 ring-primary scale-105 z-10 m3-sel-pulse' : 'hover:bg-card hover:scale-105',
                  )}
                  style={tile ? { backgroundColor: `${tile.color}22` } : undefined}
                >
                  {tile && (
                    <span className="absolute inset-0 flex items-center justify-center p-0.5">
                      {tile.kind === 'plant' ? (
                        <PlantSprite id={tile.spriteId as any} className="size-full" />
                      ) : (
                        <ZombieSprite id={tile.spriteId as any} className="size-full" />
                      )}
                    </span>
                  )}
                </button>
              )
            }),
          )}
        </div>

        {/* 粒子层（覆盖棋盘上） */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          {cellFx.map((fx) => {
            const particles = makeParticles(fx.id) // 纯函数，确定性，可安全在渲染中调用
            return (
              <div
                key={fx.id}
                className="absolute"
                style={{
                  left: `${pctX(fx.c)}%`,
                  top: `${pctY(fx.r)}%`,
                  width: 0,
                  height: 0,
                }}
              >
                {/* 光圈 */}
                <span
                  className="m3-pop-ring"
                  style={{ color: fx.color, animationDelay: `${fx.delay}ms` }}
                />
                {/* 粒子 */}
                {particles.map((p, i) => (
                  <span
                    key={i}
                    className="m3-particle"
                    style={{
                      backgroundColor: fx.color,
                      ['--dx' as any]: `${p.dx}px`,
                      ['--dy' as any]: `${p.dy}px`,
                      animationDelay: `${fx.delay}ms`,
                    }}
                  />
                ))}
              </div>
            )
          })}

          {/* 连消爆发光晕 */}
          {bursts.map((b) => (
            <span
              key={b.id}
              className="m3-burst"
              style={{ animationDelay: `${b.delay}ms` }}
            />
          ))}

          {/* 鼓励语彩蛋 */}
          {eggs.map((e) => (
            <span
              key={e.id}
              className="m3-egg text-2xl sm:text-3xl"
              style={{ color: e.color, animationDelay: `${e.delay}ms` }}
            >
              {e.text}
            </span>
          ))}

          {/* 分数飘字 */}
          {scorePops.map((p) => (
            <span
              key={p.id}
              className="m3-score-pop text-xl sm:text-2xl text-primary drop-shadow-md"
              style={{
                left: `${pctX(p.c)}%`,
                top: `${pctY(p.r)}%`,
                animationDelay: `${p.delay}ms`,
              }}
            >
              {p.text}
            </span>
          ))}
        </div>

        {/* 胜利/失败遮罩 */}
        {status !== 'playing' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-foreground/55 p-4">
            <div className="w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-xl">
              <h2 className="font-display text-2xl font-bold">
                {status === 'won' ? (isFinalLevel ? '通关啦，灿灿！' : '通关啦！') : '步数用完了…'}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {status === 'won'
                  ? `分数 ${score}，达成目标 ${level.target}！`
                  : `差 ${level.target - score} 分就成功了，再试一次吧。`}
              </p>
              {status === 'won' && (
                <div
                  className={cn(
                    'mt-3 rounded-2xl px-4 py-2 text-sm font-bold',
                    isFinalLevel
                      ? 'bg-gradient-to-r from-rose-100 to-amber-100 text-rose-600'
                      : 'bg-rose-50 text-rose-500',
                  )}
                >
                  {finalMessage}
                </div>
              )}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button className="rounded-full" onClick={reset}>
                  再玩一次
                </Button>
                {status === 'won' && onNext && (
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

      {/* 元素图例 */}
      <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-card p-3 text-xs">
        <span className="font-bold text-muted-foreground">本关元素：</span>
        {tileTypes.map((t) => {
          const def = TILE_TYPES[t]
          return (
            <span key={t} className="flex items-center gap-1" title={def.name}>
              {def.kind === 'plant' ? (
                <PlantSprite id={def.spriteId as any} className="size-5" />
              ) : (
                <ZombieSprite id={def.spriteId as any} className="size-5" />
              )}
              <span className="text-muted-foreground">{def.name}</span>
            </span>
          )
        })}
      </div>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        玩法：点击相邻两个元素交换位置，连成 3 个或以上即可消除得分。4 连 1.5× 加成、5+ 连 2× 加成；连消有额外倍率。
      </p>
    </div>
  )
}
