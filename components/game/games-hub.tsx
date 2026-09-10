'use client'

import { ArrowLeft, Gamepad2, Puzzle, Sparkles, Trophy } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { PlantSprite, SunSprite, ZombieSprite } from './sprites'
import { audio } from '@/lib/game/audio'
import { MusicToggle } from './music-toggle'
import type { SiteTheme } from '@/lib/api'

interface GamesHubProps {
  onBack: () => void
  onSelectPvZ: () => void
  onSelectMatch3: () => void
  onSelectStarlightGarden: () => void
  /** 植物大战僵尸进度 */
  pvzUnlocked: number
  pvzCleared: number[]
  pvzTotal: number
  /** 消消乐进度 */
  m3Unlocked: number
  m3Cleared: number[]
  m3Total: number
  /** 萌藤贪吃蛇本地最高分 */
  starlightBestScore: number
  /** 当前全站主题 */
  theme?: SiteTheme
}

export function GamesHub({
  onBack,
  onSelectPvZ,
  onSelectMatch3,
  onSelectStarlightGarden,
  pvzUnlocked,
  pvzCleared,
  pvzTotal,
  m3Unlocked,
  m3Cleared,
  m3Total,
  starlightBestScore,
  theme = 'classic',
}: GamesHubProps) {
  useEffect(() => {
    audio.startMusic('menu')
    return () => { audio.stopMusic() }
  }, [])

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground transition-transform hover:-translate-y-0.5"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          返回菜单
        </button>
        <MusicToggle />
      </div>

      {/* 动态主题顶部横幅 */}
      {theme === 'autumn' ? (
        <section className="relative overflow-hidden rounded-3xl border-4 border-amber-400/50 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-6 shadow-xl shadow-amber-950/15 sm:p-10 text-white">
          <div className="relative z-10 max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-950/70 border border-amber-300/40 px-3.5 py-1 text-xs font-bold text-amber-200 shadow-sm backdrop-blur">
              🍁 <span>金秋限定 · 丰收之旅</span>
            </span>
            <h1 className="mt-3 font-display text-4xl leading-tight font-extrabold text-amber-50 drop-shadow-md sm:text-5xl">
              游戏列表
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-amber-100/95 sm:text-base">
              秋风送爽，硕果丰收。选一个游戏，和灿灿一起收获今日份快乐！
            </p>
          </div>
          <div className="pointer-events-none absolute -bottom-6 -right-4 select-none opacity-20 sm:opacity-30 text-8xl">
            🌾
          </div>
        </section>
      ) : theme === 'qixi' ? (
        <section className="relative overflow-hidden rounded-3xl border-4 border-rose-300/60 bg-gradient-to-r from-rose-500 via-pink-600 to-purple-600 p-6 shadow-xl shadow-rose-950/15 sm:p-10 text-white">
          <div className="relative z-10 max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-950/70 border border-rose-300/40 px-3.5 py-1 text-xs font-bold text-pink-200 shadow-sm backdrop-blur">
              🌌 <span>七夕限定 · 银河心愿</span>
            </span>
            <h1 className="mt-3 font-display text-4xl leading-tight font-extrabold text-rose-50 drop-shadow-md sm:text-5xl">
              游戏列表
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-rose-100/95 sm:text-base">
              星河璀璨，心意相通。选一个游戏，和灿灿共度浪漫时光。
            </p>
          </div>
          <div className="pointer-events-none absolute -bottom-6 -right-4 select-none opacity-20 sm:opacity-30 text-8xl">
            ✨
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-3xl border-4 border-primary/25 bg-lawn p-6 shadow-lg sm:p-10">
          <div className="relative z-10 max-w-xl">
            <span className="inline-flex items-center gap-1 rounded-full bg-card/85 px-3 py-1 text-xs font-bold text-primary">
              <SunSprite className="size-4" /> 献给灿灿的小游戏
            </span>
            <h1 className="mt-3 font-display text-4xl leading-tight font-extrabold text-balance text-card drop-shadow-md sm:text-5xl">
              游戏列表
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-card/95 sm:text-base">
              选一个游戏，开始和灿灿的阳光旅程。
            </p>
          </div>
        </section>
      )}

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
            tag={
              theme === 'autumn' ? (
                <span className="rounded-full bg-amber-100/90 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-300/60 shadow-xs">
                  🌾 金秋麦浪
                </span>
              ) : theme === 'qixi' ? (
                <span className="rounded-full bg-rose-100/90 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 border border-rose-300/60 shadow-xs">
                  🌌 鹊桥守护
                </span>
              ) : (
                <span className="rounded-full bg-emerald-100/90 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-300/60 shadow-xs">
                  🌱 阳光草坪
                </span>
              )
            }
            cardClassName={
              theme === 'autumn'
                ? 'border-amber-200/90 bg-gradient-to-br from-card via-card to-amber-50/80 hover:border-amber-400 hover:shadow-amber-500/15'
                : theme === 'qixi'
                ? 'border-rose-200/90 bg-gradient-to-br from-card via-card to-rose-50/75 hover:border-rose-400 hover:shadow-rose-500/15'
                : 'border-emerald-200/90 bg-gradient-to-br from-card via-card to-emerald-50/70 hover:border-emerald-400 hover:shadow-emerald-500/15'
            }
            iconClassName={
              theme === 'autumn'
                ? 'bg-gradient-to-tr from-amber-600 to-orange-500 text-white shadow-amber-500/25'
                : theme === 'qixi'
                ? 'bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-rose-500/25'
                : 'bg-emerald-600 text-white shadow-emerald-600/25'
            }
            progressBarClassName={
              theme === 'autumn'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                : theme === 'qixi'
                ? 'bg-gradient-to-r from-rose-500 to-pink-500'
                : 'bg-emerald-500'
            }
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
            tag={
              theme === 'autumn' ? (
                <span className="rounded-full bg-orange-100/90 px-2.5 py-0.5 text-[11px] font-bold text-orange-900 border border-orange-300/60 shadow-xs">
                  🍎 硕果累累
                </span>
              ) : theme === 'qixi' ? (
                <span className="rounded-full bg-pink-100/90 px-2.5 py-0.5 text-[11px] font-bold text-pink-800 border border-pink-300/60 shadow-xs">
                  💖 甜蜜心愿
                </span>
              ) : (
                <span className="rounded-full bg-purple-100/90 px-2.5 py-0.5 text-[11px] font-bold text-purple-800 border border-purple-300/60 shadow-xs">
                  🍬 缤纷果园
                </span>
              )
            }
            cardClassName={
              theme === 'autumn'
                ? 'border-orange-200/90 bg-gradient-to-br from-card via-card to-orange-50/80 hover:border-orange-400 hover:shadow-orange-500/15'
                : theme === 'qixi'
                ? 'border-pink-200/90 bg-gradient-to-br from-card via-card to-pink-50/75 hover:border-pink-400 hover:shadow-pink-500/15'
                : 'border-purple-200/90 bg-gradient-to-br from-card via-card to-purple-50/70 hover:border-purple-400 hover:shadow-purple-500/15'
            }
            iconClassName={
              theme === 'autumn'
                ? 'bg-gradient-to-tr from-orange-600 to-red-500 text-white shadow-orange-500/25'
                : theme === 'qixi'
                ? 'bg-gradient-to-tr from-pink-500 to-purple-500 text-white shadow-pink-500/25'
                : 'bg-purple-600 text-white shadow-purple-600/25'
            }
            progressBarClassName={
              theme === 'autumn'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                : theme === 'qixi'
                ? 'bg-gradient-to-r from-pink-500 to-purple-500'
                : 'bg-purple-500'
            }
            decoration={
              <>
                <PlantSprite id="cherry" className="w-14 anim-bob sm:w-20" />
                <PlantSprite id="wallnut" className="w-14 anim-bob sm:w-20" />
                <ZombieSprite id="normal" className="w-14 anim-shamble sm:w-20" />
              </>
            }
          />
        </li>
        <li className="sm:col-span-2">
          <GameCard
            title="萌藤贪吃蛇"
            subtitle={
              theme === 'autumn'
                ? '麦浪金蛇，巡游丰饶秋野'
                : theme === 'qixi'
                ? '鹊桥星蛇，穿梭璀璨星河'
                : '灵动藤蔓，吞食阳光与暗影'
            }
            icon={<Sparkles className="size-5" />}
            cleared={starlightBestScore > 0 ? 1 : 0}
            total={1}
            unlocked={1}
            onClick={onSelectStarlightGarden}
            tag={
              theme === 'autumn' ? (
                <span className="rounded-full bg-amber-100/90 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-300/60 shadow-xs">
                  🍂 麦浪金蛇
                </span>
              ) : theme === 'qixi' ? (
                <span className="rounded-full bg-purple-100/90 px-2.5 py-0.5 text-[11px] font-bold text-purple-800 border border-purple-300/60 shadow-xs">
                  ✨ 鹊桥灵蛇
                </span>
              ) : (
                <span className="rounded-full bg-emerald-100/90 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-300/60 shadow-xs">
                  🌿 翡翠灵藤
                </span>
              )
            }
            progressLabel={
              starlightBestScore > 0
                ? `${theme === 'autumn' ? '秋日' : theme === 'qixi' ? '七夕' : ''}最高纪录 ${starlightBestScore} 分`
                : theme === 'autumn'
                ? '麦浪金蛇巡游田野，吞吃丰收果实！'
                : theme === 'qixi'
                ? '鹊桥星蛇穿梭星海，收集璀璨星芒！'
                : '控制萌藤灵蛇，吞吃阳光与僵尸！'
            }
            cardClassName={
              theme === 'autumn'
                ? 'border-amber-300/90 bg-gradient-to-br from-amber-50/95 via-orange-50/75 to-yellow-50/80 hover:border-amber-500 hover:shadow-amber-500/20'
                : theme === 'qixi'
                ? 'border-purple-300/90 bg-gradient-to-br from-purple-50/95 via-pink-50/75 to-indigo-50/80 hover:border-purple-500 hover:shadow-purple-500/20'
                : 'border-emerald-300/90 bg-gradient-to-br from-emerald-50/95 via-teal-50/70 to-yellow-50/75 hover:border-emerald-500 hover:shadow-emerald-500/20'
            }
            iconClassName={
              theme === 'autumn'
                ? 'bg-gradient-to-tr from-amber-600 to-orange-500 text-white shadow-amber-500/25'
                : theme === 'qixi'
                ? 'bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-purple-500/25'
                : 'bg-emerald-600 text-white shadow-emerald-600/25'
            }
            progressBarClassName={
              theme === 'autumn'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                : theme === 'qixi'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                : 'bg-emerald-500'
            }
            decoration={
              <div className="flex items-end gap-2" aria-hidden="true">
                {theme === 'autumn' ? (
                  <span className="text-2xl anim-bounce sm:text-3xl">🎃</span>
                ) : theme === 'qixi' ? (
                  <span className="text-2xl anim-pulse sm:text-3xl">✨</span>
                ) : (
                  <SunSprite className="w-12 anim-sun sm:w-16" />
                )}
                <PlantSprite id="sunflower" className="w-12 anim-bob sm:w-16" />
                <PlantSprite id="cherry" className="w-12 anim-bob sm:w-16" />
                <ZombieSprite id="imp" className="w-10 anim-shamble sm:w-14 opacity-90" />
              </div>
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
  progressLabel?: string
  tag?: ReactNode
  iconClassName?: string
  progressBarClassName?: string
  cardClassName?: string
}

function GameCard({
  title,
  subtitle,
  icon,
  cleared,
  total,
  unlocked,
  onClick,
  decoration,
  progressLabel,
  tag,
  iconClassName,
  progressBarClassName,
  cardClassName,
}: GameCardProps) {
  const unlockedCount = Math.min(Math.max(unlocked, 0), total)
  const clearedCount = Math.min(Math.max(cleared, 0), total)
  const pct = total > 0 ? Math.round((unlockedCount / total) * 100) : 0
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative h-full w-full overflow-hidden rounded-3xl border-2 p-5 text-left shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        cardClassName ?? 'border-border bg-card hover:border-primary'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span
            className={`flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-transform group-hover:scale-105 ${
              iconClassName ?? 'bg-primary text-primary-foreground'
            }`}
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl font-extrabold tracking-tight">{title}</p>
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {tag && <div className="shrink-0">{tag}</div>}
      </div>

      <div className="mt-4 flex items-end justify-end gap-1 opacity-90 sm:gap-2">
        {decoration}
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-muted-foreground">
          <span>{progressLabel ?? '游戏进度'}</span>
          {!progressLabel && <span className="tabular-nums">{unlockedCount}/{total}</span>}
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary/80">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              progressBarClassName ?? 'bg-primary'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {!progressLabel && (
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Trophy className="size-3" />
            已通关 {clearedCount}/{total} 关
          </p>
        )}
      </div>
    </button>
  )
}

