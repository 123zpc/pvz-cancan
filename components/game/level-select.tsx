'use client'

import { ArrowLeft, Lock, Moon, Sun as SunIcon, Trophy } from 'lucide-react'
import { LEVELS, PLANTS, ZOMBIES, type Level } from '@/lib/game/data'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PlantSprite, SunSprite, ZombieSprite } from './sprites'

interface LevelSelectProps {
  unlocked: number
  cleared: number[]
  onStart: (level: Level) => void
  onBack: () => void
}

export function LevelSelect({ unlocked, cleared, onStart, onBack }: LevelSelectProps) {
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
            选择关卡
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-card/95 sm:text-base">
            从初遇到永远，用阳光和植物记录每一个温暖的瞬间。
          </p>
          <Button
            size="lg"
            className="mt-6 rounded-full font-display text-base font-bold shadow-md"
            onClick={() => onStart(LEVELS[Math.min(unlocked, LEVELS.length) - 1] ?? LEVELS[0])}
          >
            开始第 {Math.min(unlocked, LEVELS.length)} 关
          </Button>
        </div>
        <div className="pointer-events-none absolute -right-2 bottom-0 flex items-end gap-1 opacity-95 sm:gap-3">
          <PlantSprite id="sunflower" className="w-14 anim-bob sm:w-28" />
          <PlantSprite id="peashooter" className="w-14 anim-bob sm:w-28" />
          <ZombieSprite id="cone" className="w-14 anim-shamble sm:w-28" />
          <ZombieSprite id="bucket" className="hidden w-24 anim-shamble sm:block" />
        </div>
      </section>

      <h2 className="mt-10 font-display text-2xl font-bold">回忆</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LEVELS.map((level) => {
          const locked = level.id > unlocked
          const done = cleared.includes(level.id)
          const zombieKinds = [...new Set(level.spawns.map((s) => s.type))]
          return (
            <li key={level.id}>
              <button
                type="button"
                disabled={locked}
                onClick={() => onStart(level)}
                className={cn(
                  'h-full w-full rounded-3xl border-2 bg-card p-4 text-left transition-transform',
                  locked ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-1 hover:border-primary',
                  done ? 'border-primary/60' : 'border-border',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-display text-base font-bold text-primary-foreground">
                    {level.id}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-bold">{level.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      {level.night ? <Moon className="size-3" /> : <SunIcon className="size-3" />}
                      {level.subtitle}
                    </p>
                  </div>
                  {locked && <Lock className="size-4 text-muted-foreground" aria-hidden="true" />}
                  {done && <Trophy className="size-4 text-accent-foreground" aria-hidden="true" />}
                </div>

                <div className="mt-3 flex items-center gap-1">
                  {level.plants.slice(0, 6).map((p) => (
                    <span key={p} className="rounded-lg bg-secondary p-1" title={PLANTS[p].name}>
                      <PlantSprite id={p} className="size-7" />
                    </span>
                  ))}
                </div>

                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  出场僵尸：{zombieKinds.map((z) => ZOMBIES[z].name).join('、')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  共 {level.spawns.length} 只 · {level.sunInterval === 0 ? '无自然阳光' : '有自然阳光'}
                </p>
              </button>
            </li>
          )
        })}
      </ul>

      <section className="mt-10 rounded-3xl border-2 border-border bg-card p-5">
        <h2 className="font-display text-xl font-bold">图鉴</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.values(PLANTS).map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-3">
              <PlantSprite id={p.id} className="size-12 shrink-0" />
              <div>
                <p className="font-display text-base font-bold">
                  {p.name}
                  <span className="ml-2 text-xs font-bold text-accent-foreground">{p.cost} 阳光</span>
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">{p.desc}</p>
              </div>
            </div>
          ))}
          {Object.values(ZOMBIES).map((z) => (
            <div key={z.id} className="flex items-center gap-3 rounded-2xl bg-muted p-3">
              <ZombieSprite id={z.id} className="size-12 shrink-0" />
              <div>
                <p className="font-display text-base font-bold">
                  {z.name}
                  <span className="ml-2 text-xs font-bold text-muted-foreground">{z.hp} 血量</span>
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">{z.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
