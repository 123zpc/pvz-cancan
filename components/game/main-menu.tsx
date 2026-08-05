'use client'

import { BookHeart, Gamepad2, Gift, LogOut } from 'lucide-react'
import { PlantSprite, SunSprite, ZombieSprite } from './sprites'

interface MainMenuProps {
  onPlay: () => void
  onStory: () => void
  onAbout: () => void
  userName?: string
  onLogout?: () => void
}

export function MainMenu({ onPlay, onStory, onAbout, userName, onLogout }: MainMenuProps) {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col items-center justify-center overflow-hidden px-4 py-8">
      {/* 飘心背景装饰 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {FLOATING_HEARTS.map((h, i) => (
          <svg
            key={i}
            className="absolute float-heart text-rose-300/40"
            style={{
              left: `${h.left}%`,
              bottom: '-30px',
              width: `${h.size}px`,
              animationDelay: `${h.delay}s`,
              animationDuration: `${h.duration}s`,
            }}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 21s-6.7-4.3-9.5-8.5C.5 9.5 1.5 6 4.5 5c2-.7 3.8.2 5 1.7C10.7 5.2 12.5 4.3 14.5 5c3 1 4 4.5 2 7.5C18.7 16.7 12 21 12 21z" />
          </svg>
        ))}
      </div>

      {/* 主标题区 */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="mb-2 flex items-center gap-1.5 rounded-full bg-card/85 px-4 py-1.5 shadow-md backdrop-blur">
          <SunSprite className="size-5" />
          <span className="font-display text-sm font-bold text-accent-foreground">献给灿灿</span>
          <svg className="size-4 text-rose-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 21s-6.7-4.3-9.5-8.5C.5 9.5 1.5 6 4.5 5c2-.7 3.8.2 5 1.7C10.7 5.2 12.5 4.3 14.5 5c3 1 4 4.5 2 7.5C18.7 16.7 12 21 12 21z" />
          </svg>
        </div>

        <h1 className="font-display text-5xl font-extrabold tracking-tight text-balance text-primary drop-shadow-md sm:text-7xl">
          植物大战僵尸
        </h1>
        <p className="mt-2 font-display text-lg font-bold text-rose-400 sm:text-2xl">
          灿灿专属版
        </p>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          种下向日葵，收集阳光，守护属于我们的草坪。
        </p>

        {/* 装饰角色 */}
        <div className="mt-6 flex items-end gap-2 sm:gap-4">
          <PlantSprite id="sunflower" className="w-16 anim-bob sm:w-24" />
          <PlantSprite id="peashooter" className="w-16 anim-bob sm:w-24" />
          <ZombieSprite id="normal" className="w-16 anim-shamble sm:w-24" />
        </div>
      </div>

      {/* 菜单按钮 */}
      <nav className="relative z-10 mt-8 flex w-full max-w-xs flex-col gap-3">
        <MenuButton onClick={onPlay} variant="primary" icon={<Gamepad2 className="size-5" />}>
          开始游戏
        </MenuButton>
        <MenuButton onClick={onStory} variant="secondary" icon={<BookHeart className="size-5" />}>
          我们的故事
        </MenuButton>
        <MenuButton onClick={onAbout} variant="secondary" icon={<Gift className="size-5" />}>
          关于这份礼物
        </MenuButton>
      </nav>

      <p className="relative z-10 mt-8 text-xs text-muted-foreground/60">
        小朱制作 · 送给最灿烂的你
      </p>

      {/* 右上角：用户名 + 退出登录 */}
      {userName && (
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full bg-card/85 px-3 py-1.5 text-xs shadow-md backdrop-blur">
          <span className="font-bold text-foreground">你好，{userName}</span>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-bold text-secondary-foreground transition-transform active:scale-95"
              title="退出登录"
            >
              <LogOut className="size-3" />
              退出
            </button>
          )}
        </div>
      )}
    </main>
  )
}

function MenuButton({
  children,
  onClick,
  variant = 'secondary',
  icon,
}: {
  children: React.ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary'
  icon: React.ReactNode
}) {
  const base =
    'flex w-full items-center justify-center gap-2.5 rounded-full px-6 py-3.5 font-display text-base font-bold shadow-md transition-transform hover:-translate-y-0.5 active:translate-y-0'
  const styles =
    variant === 'primary'
      ? 'bg-primary text-primary-foreground'
      : 'bg-card text-card-foreground border-2 border-border'
  return (
    <button type="button" onClick={onClick} className={`${base} ${styles}`}>
      {icon}
      {children}
    </button>
  )
}

const FLOATING_HEARTS = [
  { left: 8, size: 22, delay: 0, duration: 8 },
  { left: 18, size: 16, delay: 2, duration: 10 },
  { left: 32, size: 28, delay: 1, duration: 7 },
  { left: 48, size: 18, delay: 3.5, duration: 9 },
  { left: 62, size: 24, delay: 0.5, duration: 8.5 },
  { left: 76, size: 16, delay: 2.5, duration: 11 },
  { left: 88, size: 20, delay: 1.5, duration: 9.5 },
  { left: 95, size: 14, delay: 4, duration: 10.5 },
]
