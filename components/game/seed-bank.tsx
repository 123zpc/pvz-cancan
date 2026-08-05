'use client'

import { PLANTS, type PlantId } from '@/lib/game/data'
import type { GameState } from '@/lib/game/engine'
import { cn } from '@/lib/utils'
import { PlantSprite, SunSprite } from './sprites'
import { Shovel } from 'lucide-react'

interface SeedBankProps {
  game: GameState
  selected: PlantId | null
  shovel: boolean
  onSelect: (id: PlantId) => void
  onShovel: () => void
  /** 竖向排列（移动端横屏左侧栏） */
  vertical?: boolean
}

export function SeedBank({ game, selected, shovel, onSelect, onShovel, vertical }: SeedBankProps) {
  return (
    <div
      className={cn(
        'no-scrollbar touch-manipulation rounded-2xl border-2 border-primary/20 bg-card shadow-sm',
        vertical
          ? 'flex h-full w-full flex-col gap-1 overflow-y-auto p-1.5'
          : 'flex w-full max-w-full items-stretch gap-2 overflow-x-auto p-2',
      )}
    >
      {/* 阳光数 */}
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-xl bg-accent/25',
          vertical ? 'flex-row gap-1.5 px-2 py-1.5' : 'flex-col px-2 py-1',
        )}
      >
        <SunSprite className={vertical ? 'size-5' : 'size-7'} />
        <span className="font-display font-bold leading-tight text-accent-foreground tabular-nums">
          {game.sun}
        </span>
      </div>

      {game.level.plants.map((id) => {
        const def = PLANTS[id]
        const cd = game.cooldowns[id] ?? 0
        const poor = game.sun < def.cost
        const disabled = cd > 0 || poor
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            title={def.desc}
            aria-pressed={selected === id}
            className={cn(
              'relative shrink-0 overflow-hidden rounded-xl border-2 bg-secondary transition-transform',
              vertical ? 'w-full px-1 pt-1 pb-0.5' : 'w-[4.5rem] px-1 pt-1 pb-0.5',
              selected === id ? 'border-primary ring-2 ring-primary/40' : 'border-border',
              disabled ? 'opacity-60' : 'hover:-translate-y-0.5',
            )}
          >
            <PlantSprite id={id} className={vertical ? 'mx-auto w-9' : 'mx-auto w-11'} />
            <div className="text-center text-[11px] leading-tight font-bold text-secondary-foreground">{def.name}</div>
            <div className="flex items-center justify-center gap-0.5 text-[11px] font-bold text-accent-foreground tabular-nums">
              <SunSprite className="size-3" />
              {def.cost}
            </div>
            {cd > 0 && (
              <div className="absolute inset-x-0 top-0 bg-foreground/45" style={{ height: `${(cd / def.recharge) * 100}%` }} />
            )}
            {poor && cd === 0 && <div className="absolute inset-0 bg-foreground/20" />}
          </button>
        )
      })}

      <button
        type="button"
        onClick={onShovel}
        aria-pressed={shovel}
        title="铲子：移除已种下的植物"
        className={cn(
          'flex shrink-0 items-center justify-center gap-1 rounded-xl border-2 bg-secondary transition-transform hover:-translate-y-0.5',
          vertical ? 'w-full flex-row py-1.5' : 'w-14 flex-col gap-1',
          shovel ? 'border-destructive ring-2 ring-destructive/35' : 'border-border',
        )}
      >
        <Shovel className="size-5 text-secondary-foreground" aria-hidden="true" />
        <span className="text-[11px] font-bold text-secondary-foreground">铲子</span>
      </button>
    </div>
  )
}
