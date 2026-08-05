'use client'

import { ArrowLeft, Gamepad2, Puzzle, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'
import { PlantSprite, SunSprite, ZombieSprite } from './sprites'

interface GamesHubProps {
  onBack: () => void
  onSelectPvZ: () => void
  onSelectMatch3: () => void
  /** 植物大战僵尸进度 */
  pvzUnlocked: number
  pvzCleared: number[]
  pvzTotal: number
  /** 消消乐进度 */
  m3Unlocked: number
  m3Cleared: number[]
  m3Total: number
}

export function GamesHub({
  onBack,
  onSelectPvZ,
  onSelectMatch3,
  pvzUnlocked,
  pvzCleared,
  pvzTotal,
  m3Unlocked,
  m3Cleared,
  m3Total,
}: GamesHubProps) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground transition-transform hover:-translate-y-0.5"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        返回菜单
      </button>

      <section className="relative overflow-hidden rounded-3xl border-4 border-primary/25 bg-lawn p-6 shadow-lg sm:p-10">
        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-1 rounded-full bg-card/85 px-3 py-1 text-xs font-bold text-primary">
            <SunSprite className="size-4" /> 献给灿灿的小游戏
          </span>
          <h1 className="mt-3 font-display text-4xl leading-tight font-extrabold text-balance text-card drop-shadow-md sm:text-5xl">
            游戏列表
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-card/95 sm:text-base">
            选一个游戏，开始和灿灿的旅程。
          </p>
        </div>
      </section>

      <h2 className="mt-10 font-display text-2xl font-bold">选择游戏</h2>
      <ul className="mt-4 grid gap-5 sm:grid-cols-2">
        <li>
          <GameCard
            title="植物大战僵尸"
            subtitle="守护草坪，守护灿灿"
            icon={<Gamepad2 className="size-5" />}
            cleared={pvzCleared.length}
            total={pvzTotal}
            unlocked={pvzUnlocked}
            onClick={onSelectPvZ}
            decoration={
              <>
                <PlantSprite id="sunflower" className="w-14 anim-bob sm:w-20" />
                <PlantSprite id="peashooter" className="w-14 anim-bob sm:w-20" />
                <ZombieSprite id="cone" className="w-14 anim-shamble sm:w-20" />
              </>
            }
          />
        </li>
        <li>
          <GameCard
            title="消消乐"
            subtitle="消除烦恼，留下甜蜜"
            icon={<Puzzle className="size-5" />}
            cleared={m3Cleared.length}
            total={m3Total}
            unlocked={m3Unlocked}
            onClick={onSelectMatch3}
            decoration={
              <>
                <PlantSprite id="cherry" className="w-14 anim-bob sm:w-20" />
                <PlantSprite id="wallnut" className="w-14 anim-bob sm:w-20" />
                <ZombieSprite id="normal" className="w-14 anim-shamble sm:w-20" />
              </>
            }
          />
        </li>
      </ul>
    </main>
  )
}

interface GameCardProps {
  title: string
  subtitle: string
  icon: ReactNode
  cleared: number
  total: number
  unlocked: number
  onClick: () => void
  decoration: ReactNode
}

function GameCard({ title, subtitle, icon, cleared, total, unlocked, onClick, decoration }: GameCardProps) {
  const pct = total > 0 ? Math.round((cleared / total) * 100) : 0
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative h-full w-full overflow-hidden rounded-3xl border-2 border-border bg-card p-5 text-left shadow-md transition-transform hover:-translate-y-1 hover:border-primary hover:shadow-lg"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl font-bold">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-end gap-1 opacity-90 sm:gap-2">
        {decoration}
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs font-bold text-muted-foreground">
          <span>通关进度</span>
          <span className="tabular-nums">{cleared}/{total}</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Trophy className="size-3" />
          已解锁 {unlocked}/{total} 关
        </p>
      </div>
    </button>
  )
}
