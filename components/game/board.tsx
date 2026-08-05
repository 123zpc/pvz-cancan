'use client'

import { useMemo } from 'react'
import { COLS, PLANTS, ROWS, type PlantId } from '@/lib/game/data'
import type { GameState } from '@/lib/game/engine'
import {
  DaisySprite,
  MowerSprite,
  PeaSprite,
  PlantSprite,
  SunSprite,
  TuftSprite,
  ZombieSprite,
} from './sprites'
import { cn } from '@/lib/utils'

const UNIT = 100 / (COLS + 0.7)
/** 格子坐标 → 左侧百分比 */
const px = (x: number) => (0.7 + x) * UNIT
/** 引擎中的 0-100 草坪坐标 → 左侧百分比 */
const pxPct = (p: number) => 0.7 * UNIT + (p / 100) * (COLS * UNIT)
const py = (row: number, offset = 0.5) => ((row + offset) / ROWS) * 100

/** 固定位置的草坪装饰，营造卡通草地质感 */
const DECOR: { row: number; col: number; ox: number; kind: 'tuft' | 'daisy' }[] = [
  { row: 0, col: 1, ox: 0.75, kind: 'tuft' },
  { row: 0, col: 6, ox: 0.2, kind: 'daisy' },
  { row: 1, col: 3, ox: 0.85, kind: 'tuft' },
  { row: 2, col: 0, ox: 0.15, kind: 'daisy' },
  { row: 2, col: 7, ox: 0.8, kind: 'tuft' },
  { row: 3, col: 4, ox: 0.2, kind: 'tuft' },
  { row: 4, col: 2, ox: 0.8, kind: 'daisy' },
  { row: 4, col: 8, ox: 0.25, kind: 'tuft' },
]

interface BoardProps {
  game: GameState
  selected: PlantId | null
  shovel: boolean
  onCell: (row: number, col: number) => void
  onSun: (uid: number) => void
  /** 由父级按设备/朝向控制棋盘宽高与宽高比 */
  className?: string
  /** 精确尺寸（移动端用 JS 测量后传入，避免 CSS aspect-ratio 冲突） */
  style?: React.CSSProperties
}

export function Board({ game, selected, shovel, onCell, onSun, className, style }: BoardProps) {
  const night = game.level.night

  // 格子按钮：只在 plants/selected/shovel 变化时重建，不随每帧动画重算
  const cells = useMemo(() => {
    const result = []
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const occupied = game.plants.some((p) => p.row === row && p.col === col)
        const placeable = !!selected && !occupied
        result.push(
          <button
            key={`${row}-${col}`}
            type="button"
            onClick={() => onCell(row, col)}
            aria-label={`第 ${row + 1} 行第 ${col + 1} 列草地`}
            className={cn(
              'absolute transition-colors',
              (row + col) % 2 === 0 ? 'bg-lawn' : 'bg-lawn-alt',
              placeable && 'hover:bg-accent/45',
              shovel && occupied && 'hover:bg-destructive/35',
              !selected && !shovel && 'cursor-default',
            )}
            style={{ left: `${px(col)}%`, top: `${py(row, 0)}%`, width: `${UNIT}%`, height: `${100 / ROWS}%` }}
          />,
        )
      }
    }
    return result
  }, [game.plants, game.plants.length, selected, shovel]) // eslint-disable-line react-hooks/exhaustive-deps

  // 装饰：完全静态，只渲染一次
  const decor = useMemo(
    () =>
      DECOR.map((d) => (
        <div
          key={`${d.row}-${d.col}-${d.kind}`}
          className="absolute"
          style={{
            left: `${px(d.col + d.ox)}%`,
            top: `${py(d.row, d.kind === 'daisy' ? 0.78 : 0.86)}%`,
            width: `${UNIT * (d.kind === 'daisy' ? 0.24 : 0.5)}%`,
            transform: 'translate(-50%,-50%)',
          }}
        >
          {d.kind === 'tuft' ? <TuftSprite className="w-full" /> : <DaisySprite className="w-full" />}
        </div>
      )),
    [],
  )

  return (
    <div className="h-full w-full">
      <div
        className={cn(
          'relative isolate mx-auto h-full w-full touch-manipulation overflow-hidden rounded-3xl border-[6px] border-[#2d3a22] shadow-xl select-none',
          className,
        )}
        style={{ ...style, containerType: 'size' }}
      >
        <div className="absolute inset-0">{cells}</div>

        {/* 草坪装饰 */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {decor}
        </div>

      {/* 左侧房子外的砖地 */}
      <div
        className="absolute top-0 bottom-0 left-0 bg-soil"
        style={{ width: `${0.7 * UNIT}%` }}
        aria-hidden="true"
      >
        <div className="h-full w-full bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.14)_0_2px,transparent_2px_14px)]" />
      </div>

      {night && <div className="pointer-events-none absolute inset-0 bg-[#1b2b52]/45" aria-hidden="true" />}

      {/* 小推车 — transform 定位，GPU 合成 */}
      {game.mowers.map((m) => (
        <div
          key={`mower-${m.row}`}
          className="pointer-events-none absolute"
          style={{
            left: 0,
            top: 0,
            width: `${UNIT * 0.9}%`,
            transform: `translate(${px(m.x)}cqw, ${py(m.row, 0.62)}cqh) translate(-50%,-50%)`,
            willChange: 'transform',
            zIndex: 40 + m.row,
            opacity: m.used && !m.running ? 0 : 1,
          }}
        >
          <MowerSprite className="w-full" />
        </div>
      ))}

      {/* 植物 */}
      {game.plants.map((p) => {
        const def = PLANTS[p.def]
        const hurt = p.hp < p.maxHp
        return (
          <div
            key={p.uid}
            className="pointer-events-none absolute anim-pop"
            style={{
              left: `${px(p.col + 0.5)}%`,
              top: `${py(p.row, 0.52)}%`,
              width: `${UNIT * 0.98}%`,
              transform: 'translate(-50%,-52%)',
              zIndex: 20 + p.row,
            }}
          >
            <div className={cn(def.kind === 'wall' ? '' : 'anim-bob')}>
              <PlantSprite id={p.def} className="w-full drop-shadow-md" />
            </div>
            {hurt && (
              <div className="mx-auto h-1 w-3/5 overflow-hidden rounded-full bg-foreground/25">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(p.hp / p.maxHp) * 100}%` }} />
              </div>
            )}
          </div>
        )
      })}

      {/* 豌豆 — transform 定位 */}
      {game.peas.map((pea) => (
        <div
          key={pea.uid}
          className="pointer-events-none absolute"
          style={{
            left: 0,
            top: 0,
            width: `${UNIT * 0.3}%`,
            transform: `translate(${px(pea.x)}cqw, ${py(pea.row, 0.42)}cqh) translate(-50%,-50%)`,
            willChange: 'transform',
            zIndex: 30 + pea.row,
          }}
        >
          <PeaSprite className="w-full" freeze={pea.freeze} />
        </div>
      ))}

      {/* 僵尸 — transform 定位 */}
      {game.zombies.map((z) => (
        <div
          key={z.uid}
          className="pointer-events-none absolute"
          style={{
            left: 0,
            top: 0,
            width: `${UNIT * 1.05}%`,
            transform: `translate(${px(z.x)}cqw, ${py(z.row, 0.5)}cqh) translate(-50%,-48%)`,
            willChange: 'transform',
            zIndex: 25 + z.row,
            filter: z.hurt > 0 ? 'brightness(1.7) saturate(0.6)' : z.slow > 0 ? 'hue-rotate(160deg)' : undefined,
          }}
        >
          <div className={cn(!z.eating && 'anim-shamble')} style={{ transformOrigin: '50% 100%' }}>
            <ZombieSprite id={z.def} className="w-full drop-shadow-md" />
          </div>
          {z.hp < z.maxHp && (
            <div className="mx-auto h-1 w-1/2 overflow-hidden rounded-full bg-foreground/25">
              <div className="h-full rounded-full bg-destructive" style={{ width: `${(z.hp / z.maxHp) * 100}%` }} />
            </div>
          )}
        </div>
      ))}

      {/* 阳光 — transform 定位，GPU 合成层 */}
      {game.suns.map((s) => (
        <button
          key={s.uid}
          type="button"
          onClick={() => onSun(s.uid)}
          aria-label="收集阳光"
          className="group absolute"
          style={{
            left: 0,
            top: 0,
            width: `${UNIT * 0.6}%`,
            transform: `translate(${pxPct(s.x)}cqw, ${s.y}cqh) translate(-50%,-50%)`,
            willChange: 'transform',
            zIndex: 60,
            opacity: s.life < 3 ? 0.55 : 1,
          }}
        >
          <span className="block transition-transform group-hover:scale-110 group-active:scale-95">
            <SunSprite className="w-full drop-shadow-md" />
          </span>
        </button>
      ))}

      {/* 特效 — transform 定位 */}
      {game.effects.map((e) => (
        <div
          key={e.uid}
          className="pointer-events-none absolute"
          style={{
            left: 0,
            top: 0,
            transform: `translate(${pxPct(e.x)}cqw, ${e.y}cqh) translate(-50%,-50%)`,
            willChange: 'transform',
            zIndex: 70,
          }}
        >
          {e.kind === 'boom' && (
            <div className="anim-boom size-20 rounded-full bg-destructive/80 sm:size-32" />
          )}
          {e.kind === 'freeze' && <div className="anim-boom size-6 rounded-full bg-sky-300/80" />}
          {e.kind === 'crunch' && <div className="anim-boom size-4 rounded-full bg-card/90" />}
          {e.kind === 'text' && (
            <span className="anim-float font-display text-sm font-bold text-accent-foreground drop-shadow">
              {e.text}
            </span>
          )}
        </div>
      ))}

      {/* 横幅 */}
      {game.banner && (
        <div className="pointer-events-none absolute inset-x-0 top-[38%] flex justify-center" style={{ zIndex: 80 }}>
          <span className="anim-pop rounded-full bg-destructive px-5 py-2 font-display text-base font-bold text-card shadow-lg sm:text-xl">
            {game.banner.text}
          </span>
        </div>
      )}
      </div>
    </div>
  )
}
