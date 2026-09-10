'use client'

import type { ReactNode } from 'react'
import { SunSprite } from './sprites'
import { Button } from '@/components/ui/button'
import type { SiteTheme } from '@/lib/api'

interface LevelSelectHeaderProps {
  /** 已解锁到第几关 */
  unlocked: number
  /** 关卡总数 */
  total: number
  /** 点击「开始第 X 关」 */
  onStart: () => void
  /** 右下角装饰角色 */
  decoration?: ReactNode
  /** 全站主题 */
  theme?: SiteTheme
}

/**
 * 关卡选择页共享头部：文案统一，数字动态。
 * 植物大战僵尸与消消乐共用同一份，支持金秋/七夕/经典主题换装。
 */
export function LevelSelectHeader({ unlocked, total, onStart, decoration, theme = 'classic' }: LevelSelectHeaderProps) {
  const current = Math.min(unlocked, total)
  return (
    <section
      className={`relative overflow-hidden rounded-3xl border-4 p-6 shadow-lg sm:p-10 ${
        theme === 'autumn'
          ? 'border-amber-400/50 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-amber-950/15'
          : theme === 'qixi'
          ? 'border-rose-300/60 bg-gradient-to-r from-rose-500 via-pink-600 to-purple-600 text-white shadow-rose-950/15'
          : 'border-primary/25 bg-lawn text-card'
      }`}
    >
      <div className="relative z-10 max-w-xl">
        {theme === 'autumn' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-950/70 border border-amber-300/40 px-3.5 py-1 text-xs font-bold text-amber-200 shadow-sm backdrop-blur">
            🍁 <span>金秋限定 · 丰收之选</span>
          </span>
        ) : theme === 'qixi' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-950/70 border border-rose-300/40 px-3.5 py-1 text-xs font-bold text-pink-200 shadow-sm backdrop-blur">
            🌌 <span>七夕限定 · 银河漫步</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-card/85 px-3 py-1 text-xs font-bold text-primary">
            <SunSprite className="size-4" /> 献给灿灿的小游戏
          </span>
        )}
        <h1 className="mt-3 font-display text-4xl leading-tight font-extrabold text-balance drop-shadow-md sm:text-5xl">
          选择关卡
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed opacity-95 sm:text-base">
          {theme === 'autumn'
            ? '秋风送爽，硕果丰收。用智慧和植物守护每一处丰收的庄园。'
            : theme === 'qixi'
            ? '星河灿烂，微风沉醉。用爱意与植物编织属于你们的甜蜜回忆。'
            : '从初遇到永远，用阳光和植物记录每一个温暖的瞬间。'}
        </p>
        <Button
          size="lg"
          className={`mt-6 rounded-full font-display text-base font-bold shadow-md ${
            theme === 'autumn'
              ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 hover:brightness-110'
              : theme === 'qixi'
              ? 'bg-gradient-to-r from-pink-400 to-rose-400 text-white hover:brightness-110'
              : ''
          }`}
          onClick={onStart}
        >
          开始第 {current} 关
        </Button>
      </div>
      {decoration && (
        <div className="pointer-events-none absolute -right-2 bottom-0 flex items-end gap-1 opacity-95 sm:gap-3">
          {decoration}
        </div>
      )}
    </section>
  )
}

