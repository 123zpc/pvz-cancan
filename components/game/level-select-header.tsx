'use client'

import type { ReactNode } from 'react'
import { SunSprite } from './sprites'
import { Button } from '@/components/ui/button'

interface LevelSelectHeaderProps {
  /** 已解锁到第几关 */
  unlocked: number
  /** 关卡总数 */
  total: number
  /** 点击「开始第 X 关」 */
  onStart: () => void
  /** 右下角装饰角色 */
  decoration?: ReactNode
}

/**
 * 关卡选择页共享头部：文案统一，数字动态。
 * 植物大战僵尸与消消乐共用同一份。
 */
export function LevelSelectHeader({ unlocked, total, onStart, decoration }: LevelSelectHeaderProps) {
  const current = Math.min(unlocked, total)
  return (
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
