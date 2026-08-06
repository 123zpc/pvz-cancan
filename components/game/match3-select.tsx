'use client'

import { ArrowLeft, Lock, Trophy } from 'lucide-react'
import { MATCH3_LEVELS, TILE_TYPES, type Match3Level } from '@/lib/game/match3'
import { cn } from '@/lib/utils'
import { PlantSprite, ZombieSprite } from './sprites'
import { LevelSelectHeader } from './level-select-header'

interface Match3SelectProps {
  unlocked: number
  cleared: number[]
  onStart: (level: Match3Level) => void
  onBack: () => void
}

export function Match3Select({ unlocked, cleared, onStart, onBack }: Match3SelectProps) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground transition-transform hover:-translate-y-0.5"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        返回菜单
      </button>

      <LevelSelectHeader
        unlocked={unlocked}
        total={MATCH3_LEVELS.length}
        onStart={() => onStart(MATCH3_LEVELS[Math.min(unlocked, MATCH3_LEVELS.length) - 1] ?? MATCH3_LEVELS[0])}
        decoration={
          <>
            <PlantSprite id="sunflower" className="w-14 anim-bob sm:w-28" />
            <PlantSprite id="cherry" className="w-14 anim-bob sm:w-28" />
            <PlantSprite id="peashooter" className="w-14 anim-bob sm:w-28" />
          </>
        }
      />

      <h2 className="mt-10 font-display text-2xl font-bold">关卡</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MATCH3_LEVELS.map((level) => {
          const locked = level.id > unlocked
          const done = cleared.includes(level.id)
          const tiles = ['sunflower', 'peashooter', 'wallnut', 'cherry', 'normal', 'cone'].slice(0, level.tileCount)
          return (
            <li key={level.id}>
              <button
                type="button"
                disabled={locked}
                onClick={() => onStart(level)}
                className={cn(
                  'h-full w-full rounded-3xl border-2 bg-card p-4 text-left transition-transform',
                  locked ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-1 hover:border-primary',
                  level.endless && !locked && 'border-violet-300 bg-gradient-to-br from-violet-50 via-card to-rose-50',
                  done ? 'border-primary/60' : 'border-border',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-display text-base font-bold text-primary-foreground">
                    {level.id}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-bold">{level.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{level.subtitle}</p>
                  </div>
                  {locked && <Lock className="size-4 text-muted-foreground" aria-hidden="true" />}
                  {done && <Trophy className="size-4 text-accent-foreground" aria-hidden="true" />}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1">
                  {tiles.map((t) => {
                    const def = TILE_TYPES[t as keyof typeof TILE_TYPES]
                    return (
                      <span key={t} className="rounded-lg bg-secondary p-1" title={def.name}>
                        {def.kind === 'plant' ? (
                          <PlantSprite id={def.spriteId as any} className="size-6" />
                        ) : (
                          <ZombieSprite id={def.spriteId as any} className="size-6" />
                        )}
                      </span>
                    )
                  })}
                </div>

                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {level.endless
                    ? '无限挑战 · 实时排行榜 · 特殊道具'
                    : `目标 ${level.target} 分 · ${level.moves} 步 · ${level.rows}×${level.cols}`}
                </p>
              </button>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
