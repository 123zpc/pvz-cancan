'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  Flame,
  Heart,
  Magnet,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Sun,
  Trophy,
  X,
  Zap,
} from 'lucide-react'
import { PlantSprite, ZombieSprite, SunSprite } from './sprites'
import { audio } from '@/lib/game/audio'
import { MusicToggle } from './music-toggle'
import { cn } from '@/lib/utils'
import { type SiteTheme } from '@/lib/api'

/* ═══════════════════════════════════════════════════════════════
   网格、主题与类型定义（黄金 28 × 16 宽屏比例 7:4）
   ═══════════════════════════════════════════════════════════════ */

interface StarlightGardenProps {
  onBack: () => void
  bestScore: number
  onBestScore: (score: number) => void
  theme?: SiteTheme
}

/** 宽屏横屏网格：横向 28 格，纵向 16 格（7:4 / 1.75:1 比例，完美贴合移动端横屏） */
const GRID_COLS = 28
const GRID_ROWS = 16

/* ── 贪吃蛇地图主题配置接口（支持未来无限扩展） ── */
export interface SnakeMapThemeConfig {
  id: SiteTheme
  name: string
  icon: string
  /** 棋盘外框边框与立体光晕 */
  boardBorder: string
  boardGlow: string
  boardBg: string
  /** 草坪棋盘地砖颜色（偶数/奇数交替） */
  tileEven: string
  tileOdd: string
  gridLineColor?: string
  /** 虚拟摇杆底座与指示环 */
  joystickBaseBorder: string
  joystickBaseBg: string
  joystickGlow: string
  joystickKnobBorder: string
  joystickKnobBg: string
  joystickArrowActive: string
  /** 冲刺加速按钮 */
  dashBorder: string
  dashBgNormal: string
  dashBgActive: string
  dashGlow: string
  dashText: string
  /** 头部与状态强调色 */
  headerTitleColor: string
  scorePillBorder: string
  scorePillText: string
  pageBgGradient: string
}

export const SNAKE_MAP_THEMES: Record<SiteTheme, SnakeMapThemeConfig> = {
  classic: {
    id: 'classic',
    name: '经典草坪',
    icon: '🌿',
    boardBorder: 'border-[#3a6b25]',
    boardGlow: 'shadow-[0_0_40px_rgba(74,222,128,0.25)]',
    boardBg: 'bg-[#102014]',
    tileEven: 'bg-[#5ea832]',
    tileOdd: 'bg-[#519429]',
    gridLineColor: 'border-[#447822]/30',
    joystickBaseBorder: 'border-emerald-400/50',
    joystickBaseBg: 'bg-slate-950/70',
    joystickGlow: 'shadow-[0_0_20px_rgba(16,185,129,0.35)]',
    joystickKnobBorder: 'border-emerald-300',
    joystickKnobBg: 'bg-gradient-to-b from-emerald-400 to-emerald-600',
    joystickArrowActive: 'text-emerald-300 drop-shadow-[0_0_8px_#34d399]',
    dashBorder: 'border-amber-400/60',
    dashBgNormal: 'bg-gradient-to-b from-amber-500/30 to-amber-600/40 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.25)]',
    dashBgActive: 'border-rose-400 bg-gradient-to-b from-rose-500 to-red-600 text-white shadow-[0_0_25px_rgba(244,63,94,0.6)]',
    dashGlow: 'rgba(251,191,36,0.3)',
    dashText: 'text-amber-300',
    headerTitleColor: 'text-emerald-300',
    scorePillBorder: 'border-emerald-400/40',
    scorePillText: 'text-emerald-300',
    pageBgGradient: 'from-[#0b160e] via-[#09120c] to-[#040805]',
  },
  qixi: {
    id: 'qixi',
    name: '七夕星河',
    icon: '🌌',
    boardBorder: 'border-[#9333ea]/70',
    boardGlow: 'shadow-[0_0_40px_rgba(236,72,153,0.35)]',
    boardBg: 'bg-[#140a24]',
    tileEven: 'bg-[#2b1b4d]',
    tileOdd: 'bg-[#221340]',
    gridLineColor: 'border-[#4c1d95]/30',
    joystickBaseBorder: 'border-pink-400/50',
    joystickBaseBg: 'bg-slate-950/75',
    joystickGlow: 'shadow-[0_0_20px_rgba(244,63,94,0.35)]',
    joystickKnobBorder: 'border-pink-300',
    joystickKnobBg: 'bg-gradient-to-b from-pink-400 to-rose-600',
    joystickArrowActive: 'text-pink-300 drop-shadow-[0_0_8px_#f43f5e]',
    dashBorder: 'border-pink-400/60',
    dashBgNormal: 'bg-gradient-to-b from-pink-500/30 to-purple-600/40 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.3)]',
    dashBgActive: 'border-rose-300 bg-gradient-to-b from-pink-500 to-purple-600 text-white shadow-[0_0_25px_rgba(236,72,153,0.6)]',
    dashGlow: 'rgba(236,72,153,0.4)',
    dashText: 'text-pink-300',
    headerTitleColor: 'text-pink-300',
    scorePillBorder: 'border-pink-400/40',
    scorePillText: 'text-pink-300',
    pageBgGradient: 'from-[#12071f] via-[#0d0517] to-[#06020a]',
  },
  autumn: {
    id: 'autumn',
    name: '金秋丰收',
    icon: '🍁',
    boardBorder: 'border-[#b45309]/70',
    boardGlow: 'shadow-[0_0_40px_rgba(245,158,11,0.35)]',
    boardBg: 'bg-[#241304]',
    tileEven: 'bg-[#8f631d]',
    tileOdd: 'bg-[#7a5314]',
    gridLineColor: 'border-[#633e0d]/30',
    joystickBaseBorder: 'border-amber-400/50',
    joystickBaseBg: 'bg-stone-950/75',
    joystickGlow: 'shadow-[0_0_20px_rgba(245,158,11,0.35)]',
    joystickKnobBorder: 'border-amber-300',
    joystickKnobBg: 'bg-gradient-to-b from-amber-400 to-amber-600',
    joystickArrowActive: 'text-amber-300 drop-shadow-[0_0_8px_#f59e0b]',
    dashBorder: 'border-amber-400/60',
    dashBgNormal: 'bg-gradient-to-b from-amber-500/30 to-orange-600/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]',
    dashBgActive: 'border-orange-300 bg-gradient-to-b from-amber-500 to-red-600 text-white shadow-[0_0_25px_rgba(245,158,11,0.6)]',
    dashGlow: 'rgba(245,158,11,0.4)',
    dashText: 'text-amber-300',
    headerTitleColor: 'text-amber-300',
    scorePillBorder: 'border-amber-400/40',
    scorePillText: 'text-amber-300',
    pageBgGradient: 'from-[#1a0f04] via-[#120a02] to-[#080401]',
  },
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

interface Point {
  x: number
  y: number
}

type FoodType = 'sun' | 'cherry' | 'freeze' | 'jalapeno' | 'magnet' | 'zombie'

interface FoodItem {
  id: number
  x: number
  y: number
  type: FoodType
  life: number // 剩余秒数
}

type SnakeSkin = 'sprout' | 'frost' | 'cherry' | 'star'

interface SkinDef {
  id: SnakeSkin
  name: string
  color: string
  bodyColor: string
  eyeColor: string
  accentColor: string
  desc: string
}

const SKINS: SkinDef[] = [
  {
    id: 'sprout',
    name: '向阳萌藤',
    color: '#8fe05c',
    bodyColor: '#5ab03d',
    eyeColor: '#2b2b2b',
    accentColor: '#ffd23f',
    desc: '最经典的植物萌藤，头顶向日葵花蕊，吸收阳光茁壮成长！',
  },
  {
    id: 'frost',
    name: '冰魄霜龙',
    color: '#9fe2f5',
    bodyColor: '#38bdf8',
    eyeColor: '#1e3a8a',
    accentColor: '#cff3fc',
    desc: '寒冰射手庇护的霜龙，移动时飘散冰晶，冰冻果实持续时间更长。',
  },
  {
    id: 'cherry',
    name: '烈焰双子',
    color: '#f4555c',
    bodyColor: '#dc2626',
    eyeColor: '#450a0a',
    accentColor: '#fecdd3',
    desc: '吃满樱桃爆发狂暴赤焰，冲刺时自带火焰尾迹！',
  },
  {
    id: 'star',
    name: '幻夜星灵',
    color: '#c084fc',
    bodyColor: '#9333ea',
    eyeColor: '#3b0764',
    accentColor: '#fef08a',
    desc: '星空凝练的流光神兽，吞吃小僵尸可获得双倍星光分数！',
  },
]

/* 关卡挑战目标 */
interface Mission {
  id: number
  title: string
  desc: string
  targetScore: number
  targetLength: number
  rewardBonus: number
}

const MISSIONS: Mission[] = [
  { id: 1, title: '初萌生息', desc: '藤蔓长度达 8 节，收集 50 点阳光', targetScore: 100, targetLength: 8, rewardBonus: 150 },
  { id: 2, title: '双倍快乐', desc: '吞食双子樱桃，长度达 14 节', targetScore: 260, targetLength: 14, rewardBonus: 250 },
  { id: 3, title: '狂暴突进', desc: '吃下辣椒冲刺，得分突破 500 分', targetScore: 500, targetLength: 18, rewardBonus: 400 },
  { id: 4, title: '暗夜伏魔', desc: '长度突破 22 节，消灭 2 只游荡小僵尸', targetScore: 850, targetLength: 22, rewardBonus: 600 },
  { id: 5, title: '银河奇迹', desc: '终极挑战！得分突破 1500，长度达到 28 节', targetScore: 1500, targetLength: 28, rewardBonus: 1000 },
]

/* ═══════════════════════════════════════════════════════════════
   屏幕虚拟摇杆组件 (Virtual Touch Joystick)
   ═══════════════════════════════════════════════════════════════ */

interface VirtualJoystickProps {
  onDirection: (dir: Direction) => void
  currentDir: Direction
  intendedDir?: Direction
  mapTheme: SnakeMapThemeConfig
}

type ControlMode = 'joystick' | 'dpad'

function VirtualJoystick({ onDirection, currentDir, intendedDir, mapTheme }: VirtualJoystickProps) {
  const [mode, setMode] = useState<ControlMode>('joystick')
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [activeDir, setActiveDir] = useState<Direction | null>(null)
  const baseRef = useRef<HTMLDivElement>(null)
  const pointerIdRef = useRef<number | null>(null)
  const activeDirRef = useRef<Direction | null>(null)

  const updateKnob = useCallback((clientX: number, clientY: number) => {
    if (!baseRef.current) return
    const rect = baseRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const dx = clientX - centerX
    const dy = clientY - centerY
    const dist = Math.hypot(dx, dy)
    const maxRadius = 36 // 摇杆最大行程扩大至 36px，手感更饱满细腻

    let clampedX = dx
    let clampedY = dy
    if (dist > maxRadius) {
      clampedX = (dx / dist) * maxRadius
      clampedY = (dy / dist) * maxRadius
    }

    setKnobOffset({ x: clampedX, y: clampedY })

    // 死区判定与 14° 角滞后区间，彻底杜绝斜角推移时在两轴之间震颤跳变
    if (dist > 10) {
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI
      let dir: Direction = activeDirRef.current || 'RIGHT'
      if (angle >= -38 && angle <= 38) {
        dir = 'RIGHT'
      } else if (angle >= 52 && angle <= 128) {
        dir = 'DOWN'
      } else if (angle >= 142 || angle <= -142) {
        dir = 'LEFT'
      } else if (angle >= -128 && angle <= -52) {
        dir = 'UP'
      }

      if (activeDirRef.current !== dir) {
        activeDirRef.current = dir
        setActiveDir(dir)
        onDirection(dir)
      }
    }
  }, [onDirection])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    if (pointerIdRef.current !== null) return
    pointerIdRef.current = e.pointerId
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* 兼容环境 */
    }
    updateKnob(e.clientX, e.clientY)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    if (pointerIdRef.current !== e.pointerId) return
    updateKnob(e.clientX, e.clientY)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    if (pointerIdRef.current !== e.pointerId) return
    pointerIdRef.current = null
    activeDirRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* 兼容 */
    }
    setKnobOffset({ x: 0, y: 0 })
    setActiveDir(null)
  }

  // 综合判定高亮方向（即时意图优先，其次当前执行方向）
  const highlightDir = activeDir || intendedDir || currentDir

  return (
    <div className="flex flex-col items-center select-none touch-none">
      {/* 顶部微型控制模式切换器 */}
      <div className="flex items-center rounded-full bg-black/60 p-0.5 border border-white/15 backdrop-blur-md mb-1.5 shadow-md">
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation()
            setMode('joystick')
          }}
          className={cn(
            'px-2 py-0.5 rounded-full text-[10px] font-extrabold transition-all',
            mode === 'joystick'
              ? 'bg-white/25 text-white shadow-xs'
              : 'text-white/50 hover:text-white/80',
          )}
          title="虚拟模拟摇杆模式"
        >
          🕹️ 摇杆
        </button>
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation()
            setMode('dpad')
          }}
          className={cn(
            'px-2 py-0.5 rounded-full text-[10px] font-extrabold transition-all',
            mode === 'dpad'
              ? 'bg-white/25 text-white shadow-xs'
              : 'text-white/50 hover:text-white/80',
          )}
          title="街机十字按键模式"
        >
          🎮 十字键
        </button>
      </div>

      {mode === 'joystick' ? (
        /* 模式一：360° 发光模拟摇杆（加大底座与舒适滑块） */
        <div
          ref={baseRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={cn(
            'relative size-28 sm:size-32 rounded-full border-2 backdrop-blur-md cursor-grab active:cursor-grabbing touch-none flex items-center justify-center transition-shadow shadow-xl',
            mapTheme.joystickBaseBorder,
            mapTheme.joystickBaseBg,
            mapTheme.joystickGlow,
          )}
        >
          {/* 四向触控箭头指示器 */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation()
              setActiveDir('UP')
              onDirection('UP')
            }}
            className={cn(
              'absolute top-1 inset-x-0 mx-auto flex h-8 w-10 items-center justify-center transition-transform active:scale-125 touch-none z-10',
              highlightDir === 'UP'
                ? cn(mapTheme.joystickArrowActive, 'scale-125')
                : 'text-white/35 hover:text-white/75',
            )}
            aria-label="向上"
          >
            <ArrowUp className="size-5" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation()
              setActiveDir('DOWN')
              onDirection('DOWN')
            }}
            className={cn(
              'absolute bottom-1 inset-x-0 mx-auto flex h-8 w-10 items-center justify-center transition-transform active:scale-125 touch-none z-10',
              highlightDir === 'DOWN'
                ? cn(mapTheme.joystickArrowActive, 'scale-125')
                : 'text-white/35 hover:text-white/75',
            )}
            aria-label="向下"
          >
            <ArrowDown className="size-5" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation()
              setActiveDir('LEFT')
              onDirection('LEFT')
            }}
            className={cn(
              'absolute left-1 inset-y-0 my-auto flex h-10 w-8 items-center justify-center transition-transform active:scale-125 touch-none z-10',
              highlightDir === 'LEFT'
                ? cn(mapTheme.joystickArrowActive, 'scale-125')
                : 'text-white/35 hover:text-white/75',
            )}
            aria-label="向左"
          >
            <ArrowLeft className="size-5" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation()
              setActiveDir('RIGHT')
              onDirection('RIGHT')
            }}
            className={cn(
              'absolute right-1 inset-y-0 my-auto flex h-10 w-8 items-center justify-center transition-transform active:scale-125 touch-none z-10',
              highlightDir === 'RIGHT'
                ? cn(mapTheme.joystickArrowActive, 'scale-125')
                : 'text-white/35 hover:text-white/75',
            )}
            aria-label="向右"
          >
            <ArrowRight className="size-5" />
          </button>

          {/* 内部同心装饰环 */}
          <div className="size-14 rounded-full border border-white/10 pointer-events-none" />

          {/* 摇杆中心滑块（Knob） */}
          <div
            className={cn(
              'absolute size-11 rounded-full border-2 shadow-[0_4px_14px_rgba(0,0,0,0.7)] pointer-events-none flex items-center justify-center',
              mapTheme.joystickKnobBorder,
              mapTheme.joystickKnobBg,
            )}
            style={{
              transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
              transition: pointerIdRef.current === null ? 'transform 0.16s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
            }}
          >
            {/* 滑块凹陷与手感凸点 */}
            <div className="size-4 rounded-full bg-white/40 border border-white/60 shadow-inner" />
          </div>
        </div>
      ) : (
        /* 模式二：经典掌机十字方向键 (Arcade D-Pad - 零误触点按神器) */
        <div
          className={cn(
            'relative size-28 sm:size-32 rounded-3xl border-2 backdrop-blur-md p-1 flex items-center justify-center shadow-xl transition-shadow',
            mapTheme.joystickBaseBorder,
            mapTheme.joystickBaseBg,
            mapTheme.joystickGlow,
          )}
        >
          {/* 上键 */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation()
              onDirection('UP')
            }}
            className={cn(
              'absolute top-1 inset-x-0 mx-auto flex h-9 w-10 items-center justify-center rounded-t-xl border border-white/10 transition-all active:scale-90',
              highlightDir === 'UP'
                ? cn(mapTheme.joystickArrowActive, 'bg-white/25 scale-105 shadow-md')
                : 'bg-black/40 text-white/70 hover:text-white',
            )}
            aria-label="向上"
          >
            <ArrowUp className="size-4.5" />
          </button>

          {/* 下键 */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation()
              onDirection('DOWN')
            }}
            className={cn(
              'absolute bottom-1 inset-x-0 mx-auto flex h-9 w-10 items-center justify-center rounded-b-xl border border-white/10 transition-all active:scale-90',
              highlightDir === 'DOWN'
                ? cn(mapTheme.joystickArrowActive, 'bg-white/25 scale-105 shadow-md')
                : 'bg-black/40 text-white/70 hover:text-white',
            )}
            aria-label="向下"
          >
            <ArrowDown className="size-4.5" />
          </button>

          {/* 左键 */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation()
              onDirection('LEFT')
            }}
            className={cn(
              'absolute left-1 inset-y-0 my-auto flex h-10 w-9 items-center justify-center rounded-l-xl border border-white/10 transition-all active:scale-90',
              highlightDir === 'LEFT'
                ? cn(mapTheme.joystickArrowActive, 'bg-white/25 scale-105 shadow-md')
                : 'bg-black/40 text-white/70 hover:text-white',
            )}
            aria-label="向左"
          >
            <ArrowLeft className="size-4.5" />
          </button>

          {/* 右键 */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation()
              onDirection('RIGHT')
            }}
            className={cn(
              'absolute right-1 inset-y-0 my-auto flex h-10 w-9 items-center justify-center rounded-r-xl border border-white/10 transition-all active:scale-90',
              highlightDir === 'RIGHT'
                ? cn(mapTheme.joystickArrowActive, 'bg-white/25 scale-105 shadow-md')
                : 'bg-black/40 text-white/70 hover:text-white',
            )}
            aria-label="向右"
          >
            <ArrowRight className="size-4.5" />
          </button>

          {/* 中心金属轴心 */}
          <div className="size-8 rounded-lg bg-black/70 border border-white/20 shadow-inner flex items-center justify-center pointer-events-none">
            <div className="size-2 rounded-full bg-white/40" />
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   主组件：萌藤贪吃蛇（黄金宽屏横屏模式）
   ═══════════════════════════════════════════════════════════════ */

export function StarlightGarden({
  onBack,
  bestScore,
  onBestScore,
  theme: defaultThemeProp,
}: StarlightGardenProps) {
  const [selectedSkin, setSelectedSkin] = useState<SnakeSkin>('sprout')
  const [showSkinModal, setShowSkinModal] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  /* 地图主题配置：默认同步全站主题，亦可在局内自由体验不同主题 */
  const [activeThemeId, setActiveThemeId] = useState<SiteTheme>(() => defaultThemeProp ?? 'classic')

  useEffect(() => {
    if (defaultThemeProp) setActiveThemeId(defaultThemeProp)
  }, [defaultThemeProp])

  const mapTheme = SNAKE_MAP_THEMES[activeThemeId] ?? SNAKE_MAP_THEMES.classic

  /* 横屏与移动端判定 */
  const [mobileUI, setMobileUI] = useState(false)
  const [landscape, setLandscape] = useState(true)

  useEffect(() => {
    const mqMobile = window.matchMedia('(pointer: coarse) and (max-width: 1023px)')
    const mqLand = window.matchMedia('(orientation: landscape)')
    const update = () => {
      setMobileUI(mqMobile.matches)
      setLandscape(mqLand.matches || window.innerWidth > window.innerHeight)
    }
    update()
    mqMobile.addEventListener('change', update)
    mqLand.addEventListener('change', update)
    window.addEventListener('resize', update)
    return () => {
      mqMobile.removeEventListener('change', update)
      mqLand.removeEventListener('change', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const tryLandscape = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen()
      const scr = screen as unknown as { orientation?: { lock?: (o: string) => Promise<void> } }
      if (scr.orientation && typeof scr.orientation.lock === 'function') {
        await scr.orientation.lock('landscape')
      }
    } catch {
      /* iOS Safari 等不支持 */
    }
  }, [])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        const scr = screen as unknown as { orientation?: { lock?: (o: string) => Promise<void> } }
        if (scr.orientation && typeof scr.orientation.lock === 'function') {
          await scr.orientation.lock('landscape')
        }
      } else {
        await document.exitFullscreen()
      }
    } catch {
      /* 忽略 */
    }
  }, [])

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  /* 游戏核心状态与可变 Ref 保证高频时钟同步与零竞态 */
  const snakeRef = useRef<Point[]>([
    { x: 14, y: 8 },
    { x: 13, y: 8 },
    { x: 12, y: 8 },
    { x: 11, y: 8 },
  ])
  const [snake, setSnake] = useState<Point[]>(snakeRef.current)

  const dirRef = useRef<Direction>('RIGHT')
  const dirQueueRef = useRef<Direction[]>([])
  const [dir, setDir] = useState<Direction>('RIGHT')
  const [intendedDir, setIntendedDir] = useState<Direction>('RIGHT')

  const foodsRef = useRef<FoodItem[]>([])
  const [foods, setFoods] = useState<FoodItem[]>([])

  const scoreRef = useRef(0)
  const [score, setScore] = useState(0)

  const livesRef = useRef(3)
  const [lives, setLives] = useState(3)

  const isPausedRef = useRef(false)
  const [isPaused, setIsPaused] = useState(false)

  const isGameOverRef = useRef(false)
  const [isGameOver, setIsGameOver] = useState(false)

  /* 特殊增益状态 */
  const freezeTimeRef = useRef(0)
  const [freezeTime, setFreezeTime] = useState(0)

  const boostTimeRef = useRef(0)
  const [boostTime, setBoostTime] = useState(0)

  const magnetTimeRef = useRef(0)
  const [magnetTime, setMagnetTime] = useState(0)

  /* 连击倍率 */
  const comboRef = useRef(0)
  const [combo, setCombo] = useState(0)

  const comboTimerRef = useRef(0)
  const [comboTimer, setComboTimer] = useState(0)

  /* 手动冲刺按钮状态 */
  const dashActiveRef = useRef(false)
  const [dashActive, setDashActive] = useState(false)

  /* 飘字特效 */
  const [popups, setPopups] = useState<{ id: number; x: number; y: number; text: string; color: string }[]>([])
  const curMissionIdxRef = useRef(0)
  const [curMissionIdx, setCurMissionIdx] = useState(0)
  const [missionCompletePopup, setMissionCompletePopup] = useState<string | null>(null)

  const bestScoreRef = useRef(bestScore)
  const onBestScoreRef = useRef(onBestScore)
  bestScoreRef.current = bestScore
  onBestScoreRef.current = onBestScore
  dashActiveRef.current = dashActive
  isGameOverRef.current = isGameOver
  isPausedRef.current = isPaused

  const uidRef = useRef(100)
  const nextUid = () => ++uidRef.current

  /* 背景音乐 */
  useEffect(() => {
    audio.startMusic('garden')
    return () => { audio.stopMusic() }
  }, [])

  /* 触发飘字 */
  const showPop = useCallback((x: number, y: number, text: string, color = '#ffd84d') => {
    const p = { id: nextUid(), x, y, text, color }
    setPopups((prev) => [...prev.slice(-10), p])
    setTimeout(() => {
      setPopups((prev) => prev.filter((item) => item.id !== p.id))
    }, 900)
  }, [])

  /* 连击倍率计算 */
  const comboMultiplier = useMemo(() => {
    if (combo >= 8) return 3.0
    if (combo >= 5) return 2.0
    if (combo >= 2) return 1.5
    return 1.0
  }, [combo])

  /* 生成随机空闲格子位置（避开摇杆与冲刺按钮 HUD 触控盲区） */
  const getFreeCell = useCallback((occupied: Point[]): Point => {
    const occSet = new Set(occupied.map((p) => `${p.x},${p.y}`))
    const freeCells: Point[] = []
    for (let x = 1; x < GRID_COLS - 1; x++) {
      for (let y = 1; y < GRID_ROWS - 1; y++) {
        // 避开左下角摇杆（x<=4, y>=11）和右下角冲刺区（x>=23, y>=11），防止生成在拇指触控盲区
        if ((x <= 4 && y >= 11) || (x >= 23 && y >= 11)) {
          continue
        }
        if (!occSet.has(`${x},${y}`)) {
          freeCells.push({ x, y })
        }
      }
    }
    if (freeCells.length === 0) return { x: 14, y: 8 }
    return freeCells[Math.floor(Math.random() * freeCells.length)]
  }, [])

  /* 智能转向队列（平滑缓冲最多 2 个指令，100% 杜绝反向撞颈暴毙，支持即时意图响应与微震动） */
  const queueDirection = useCallback((newDir: Direction) => {
    if (isGameOverRef.current || isPausedRef.current) return
    const lastDir =
      dirQueueRef.current.length > 0
        ? dirQueueRef.current[dirQueueRef.current.length - 1]
        : dirRef.current

    const isOpposite =
      (newDir === 'UP' && lastDir === 'DOWN') ||
      (newDir === 'DOWN' && lastDir === 'UP') ||
      (newDir === 'LEFT' && lastDir === 'RIGHT') ||
      (newDir === 'RIGHT' && lastDir === 'LEFT')

    if (!isOpposite && newDir !== lastDir) {
      if (dirQueueRef.current.length < 2) {
        dirQueueRef.current.push(newDir)
      } else {
        // 如果连续快速输入，将最新未消费指令更新为最新意图，杜绝漏键
        dirQueueRef.current[dirQueueRef.current.length - 1] = newDir
      }
      setIntendedDir(newDir)
      // 触感反馈
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(10) } catch {}
      }
    }
  }, [])

  /* 全屏任意位置滑动手势操控 (带主副轴防飘移识别与连续拐弯状态机) */
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null)
  const swipeLastDirRef = useRef<Direction | null>(null)

  const handleBoardPointerDown = (e: React.PointerEvent) => {
    swipeStartRef.current = { x: e.clientX, y: e.clientY }
    swipeLastDirRef.current = null
  }

  const handleBoardPointerMove = (e: React.PointerEvent) => {
    if (!swipeStartRef.current) return
    const dx = e.clientX - swipeStartRef.current.x
    const dy = e.clientY - swipeStartRef.current.y
    const absX = Math.abs(dx)
    const absY = Math.abs(dy)

    // 触发阈值 20px，且要求主轴位移至少是副轴的 1.25 倍（彻底消灭大拇指圆弧滑动时的垂直/水平侧向飘移误触）
    if (absX >= 20 || absY >= 20) {
      let turn: Direction | null = null
      if (absX > absY * 1.25) {
        turn = dx > 0 ? 'RIGHT' : 'LEFT'
      } else if (absY > absX * 1.25) {
        turn = dy > 0 ? 'DOWN' : 'UP'
      }

      if (turn && turn !== swipeLastDirRef.current) {
        queueDirection(turn)
        swipeLastDirRef.current = turn
        // 将原点推移至当前点，支持不抬手流畅画连续拐弯（如连续 L 弯）
        swipeStartRef.current = { x: e.clientX, y: e.clientY }
      }
    }
  }

  const handleBoardPointerUp = () => {
    swipeStartRef.current = null
    swipeLastDirRef.current = null
  }

  /* 重置开始游戏 */
  const startNewGame = useCallback(() => {
    const initialSnake: Point[] = [
      { x: 14, y: 8 },
      { x: 13, y: 8 },
      { x: 12, y: 8 },
      { x: 11, y: 8 },
    ]
    snakeRef.current = initialSnake
    setSnake(initialSnake)

    dirRef.current = 'RIGHT'
    dirQueueRef.current = []
    setDir('RIGHT')
    setIntendedDir('RIGHT')

    scoreRef.current = 0
    setScore(0)

    livesRef.current = 3
    setLives(3)

    comboRef.current = 0
    setCombo(0)

    comboTimerRef.current = 0
    setComboTimer(0)

    freezeTimeRef.current = 0
    setFreezeTime(0)

    boostTimeRef.current = 0
    setBoostTime(0)

    magnetTimeRef.current = 0
    setMagnetTime(0)

    isPausedRef.current = false
    setIsPaused(false)

    isGameOverRef.current = false
    setIsGameOver(false)

    setPopups([])
    setMissionCompletePopup(null)

    const sun1 = getFreeCell([])
    const sun2 = getFreeCell([sun1])
    const cherry = getFreeCell([sun1, sun2])
    const initialFoods: FoodItem[] = [
      { id: nextUid(), x: sun1.x, y: sun1.y, type: 'sun', life: 999 },
      { id: nextUid(), x: sun2.x, y: sun2.y, type: 'sun', life: 999 },
      { id: nextUid(), x: cherry.x, y: cherry.y, type: 'cherry', life: 12 },
    ]
    foodsRef.current = initialFoods
    setFoods(initialFoods)
  }, [getFreeCell])

  useEffect(() => {
    startNewGame()
  }, [startNewGame])

  /* ───────────────────────────────────────────────────────────
     键盘控制绑定（WASD、方向键、空格冲刺）
     ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        queueDirection('UP')
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        queueDirection('DOWN')
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        queueDirection('LEFT')
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        queueDirection('RIGHT')
      } else if (e.key === ' ') {
        setDashActive(true)
      } else if (e.key === 'p' || e.key === 'P') {
        setIsPaused((p) => {
          const nextP = !p
          isPausedRef.current = nextP
          return nextP
        })
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setDashActive(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [queueDirection])

  /* ───────────────────────────────────────────────────────────
     游戏主时钟步进函数（权威同步执行，彻底消除得分丢失与延迟）
     ─────────────────────────────────────────────────────────── */
  const stepGame = useCallback(
    (intervalMs: number) => {
      const dt = intervalMs / 1000

      // 更新增益状态
      if (freezeTimeRef.current > 0) {
        freezeTimeRef.current = Math.max(0, freezeTimeRef.current - dt)
        setFreezeTime(freezeTimeRef.current)
      }
      if (boostTimeRef.current > 0) {
        boostTimeRef.current = Math.max(0, boostTimeRef.current - dt)
        setBoostTime(boostTimeRef.current)
      }
      if (magnetTimeRef.current > 0) {
        magnetTimeRef.current = Math.max(0, magnetTimeRef.current - dt)
        setMagnetTime(magnetTimeRef.current)
      }

      // 连击计时
      if (comboTimerRef.current > 0) {
        comboTimerRef.current = Math.max(0, comboTimerRef.current - dt)
        if (comboTimerRef.current <= 0) {
          comboRef.current = 0
          setCombo(0)
        }
        setComboTimer(comboTimerRef.current)
      }

      // 食物自然腐化与随机刷新
      const curFoods = foodsRef.current
      const remainingFoods: FoodItem[] = []
      curFoods.forEach((f) => {
        if (f.life !== 999) {
          f.life -= dt
          if (f.life <= 0) return
        }
        remainingFoods.push(f)
      })

      if (Math.random() < 0.045 && remainingFoods.length < 5) {
        const kinds: FoodType[] = ['cherry', 'freeze', 'jalapeno', 'magnet', 'zombie']
        const picked = kinds[Math.floor(Math.random() * kinds.length)]
        const cell = getFreeCell(snakeRef.current)
        remainingFoods.push({
          id: nextUid(),
          x: cell.x,
          y: cell.y,
          type: picked,
          life: picked === 'zombie' ? 18 : 12,
        })
      }
      foodsRef.current = remainingFoods
      setFoods([...remainingFoods])

      // 方向处理（取出队列中的下一个方向）
      const nextDir = dirQueueRef.current.shift() ?? dirRef.current
      dirRef.current = nextDir
      setDir(nextDir)
      setIntendedDir(dirQueueRef.current[0] ?? nextDir)

      const curSnake = snakeRef.current
      const head = curSnake[0]
      const newHead: Point = { x: head.x, y: head.y }
      if (nextDir === 'UP') newHead.y -= 1
      if (nextDir === 'DOWN') newHead.y += 1
      if (nextDir === 'LEFT') newHead.x -= 1
      if (nextDir === 'RIGHT') newHead.x += 1

      // 磁力吸附周围食物
      if (magnetTimeRef.current > 0) {
        foodsRef.current = foodsRef.current.map((f) => {
          const dx = newHead.x - f.x
          const dy = newHead.y - f.y
          if (Math.hypot(dx, dy) <= 4.5 && f.type !== 'zombie') {
            return {
              ...f,
              x: f.x + (dx > 0 ? 1 : dx < 0 ? -1 : 0),
              y: f.y + (dy > 0 ? 1 : dy < 0 ? -1 : 0),
            }
          }
          return f
        })
        setFoods([...foodsRef.current])
      }

      // 碰撞检测：撞墙或撞自身
      const hitWall =
        newHead.x < 0 || newHead.x >= GRID_COLS || newHead.y < 0 || newHead.y >= GRID_ROWS
      const hitSelf = curSnake.slice(1).some((seg) => seg.x === newHead.x && seg.y === newHead.y)

      if (hitWall || hitSelf) {
        if (boostTimeRef.current > 0) {
          newHead.x = (newHead.x + GRID_COLS) % GRID_COLS
          newHead.y = (newHead.y + GRID_ROWS) % GRID_ROWS
        } else {
          audio.playLose()
          livesRef.current -= 1
          setLives(livesRef.current)
          if (livesRef.current <= 0) {
            isGameOverRef.current = true
            setIsGameOver(true)
            if (scoreRef.current > bestScoreRef.current) {
              onBestScoreRef.current(scoreRef.current)
            }
            return
          }
          showPop(head.x, head.y, '哎呀！生命 -1', '#f87171')
          snakeRef.current = curSnake.slice(0, Math.max(3, Math.floor(curSnake.length * 0.7)))
          setSnake([...snakeRef.current])
          return
        }
      }

      // 食物吃取判定（100% 同步执行，立刻加分，立刻飘字，绝不丢失）
      const eatenIdx = foodsRef.current.findIndex(
        (f) => f.x === newHead.x && f.y === newHead.y
      )

      let grew = false
      if (eatenIdx !== -1) {
        const food = foodsRef.current[eatenIdx]
        foodsRef.current.splice(eatenIdx, 1)

        let addedScore = 15
        let growCount = 1

        const currentCombo = comboRef.current
        const mult = currentCombo >= 8 ? 3.0 : currentCombo >= 5 ? 2.0 : currentCombo >= 2 ? 1.5 : 1.0

        if (food.type === 'sun') {
          audio.playSun()
          addedScore = 15
          growCount = 1
          showPop(newHead.x, newHead.y, `+${Math.round(addedScore * mult)}`, '#fde047')
        } else if (food.type === 'cherry') {
          audio.playExplosion()
          addedScore = 60
          growCount = 2
          showPop(newHead.x, newHead.y, `双子樱桃 +${Math.round(addedScore * mult)}!`, '#f43f5e')
        } else if (food.type === 'freeze') {
          audio.playFreezeShoot()
          freezeTimeRef.current = 6.0
          setFreezeTime(6.0)
          addedScore = 40
          showPop(newHead.x, newHead.y, '冰霜减速 6s!', '#38bdf8')
        } else if (food.type === 'jalapeno') {
          audio.playExplosion()
          boostTimeRef.current = 5.0
          setBoostTime(5.0)
          addedScore = 50
          showPop(newHead.x, newHead.y, '狂暴冲刺 5s!', '#ef4444')
        } else if (food.type === 'magnet') {
          audio.playSun()
          magnetTimeRef.current = 6.0
          setMagnetTime(6.0)
          addedScore = 40
          showPop(newHead.x, newHead.y, '磁力开启 6s!', '#a855f7')
        } else if (food.type === 'zombie') {
          audio.playZombieDie()
          addedScore = selectedSkin === 'star' ? 240 : 120
          growCount = 2
          showPop(newHead.x, newHead.y, `吞食僵尸 +${addedScore}!`, '#22c55e')
        }

        comboRef.current += 1
        comboTimerRef.current = 3.5
        setCombo(comboRef.current)
        setComboTimer(3.5)

        const finalEarn = Math.round(addedScore * mult)
        scoreRef.current += finalEarn
        setScore(scoreRef.current)
        if (scoreRef.current > bestScoreRef.current) {
          onBestScoreRef.current(scoreRef.current)
        }

        // 身体生长
        const newBody = [newHead, ...curSnake]
        if (growCount > 1) {
          newBody.push(curSnake[curSnake.length - 1])
        }
        snakeRef.current = newBody
        setSnake([...newBody])
        grew = true

        // 保证场上持续有阳光（至少 2 个，方便大地图畅快游玩）
        const sunCount = foodsRef.current.filter((f) => f.type === 'sun').length
        if (sunCount < 2) {
          for (let s = sunCount; s < 2; s++) {
            const newSun = getFreeCell(newBody)
            foodsRef.current.push({ id: nextUid(), x: newSun.x, y: newSun.y, type: 'sun', life: 999 })
          }
        }
        setFoods([...foodsRef.current])

        // 任务进度检测
        const curM = MISSIONS[curMissionIdxRef.current]
        if (curM && (scoreRef.current >= curM.targetScore || newBody.length >= curM.targetLength)) {
          setMissionCompletePopup(`🎉 目标达成：${curM.title} (+${curM.rewardBonus}分)`)
          scoreRef.current += curM.rewardBonus
          setScore(scoreRef.current)
          if (curMissionIdxRef.current < MISSIONS.length - 1) {
            curMissionIdxRef.current += 1
            setCurMissionIdx(curMissionIdxRef.current)
          }
          setTimeout(() => setMissionCompletePopup(null), 3000)
        }
      }

      if (!grew) {
        const newBody = [newHead, ...curSnake.slice(0, -1)]
        snakeRef.current = newBody
        setSnake(newBody)
      }
    },
    [getFreeCell, selectedSkin, showPop],
  )

  /* ───────────────────────────────────────────────────────────
     游戏主时钟循环（递归 setTimeout 动态自适应频率）
     ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (isGameOver || isPaused) return

    let timerId: ReturnType<typeof setTimeout>

    const loop = () => {
      const curScore = scoreRef.current
      const baseSpeed = Math.max(150, 220 - Math.floor(curScore / 35) * 8)
      let intervalMs = baseSpeed
      if (freezeTimeRef.current > 0) intervalMs = Math.round(baseSpeed * 1.55)
      if (dashActiveRef.current || boostTimeRef.current > 0) intervalMs = Math.round(baseSpeed * 0.48)

      stepGame(intervalMs)

      if (!isGameOverRef.current && !isPausedRef.current) {
        timerId = setTimeout(loop, intervalMs)
      }
    }

    timerId = setTimeout(loop, 220)

    return () => clearTimeout(timerId)
  }, [isGameOver, isPaused, stepGame])

  const skin = SKINS.find((s) => s.id === selectedSkin) ?? SKINS[0]

  /* ───────────────────────────────────────────────────────────
     移动端竖屏状态：引导旋转至横屏
     ─────────────────────────────────────────────────────────── */
  if (mobileUI && !landscape) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#08120a] p-8 text-center text-white select-none">
        <div className="anim-rotate-phone">
          <svg className="size-20 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="5" y="2" width="14" height="20" rx="3" />
            <path d="M12 18h.01" />
          </svg>
        </div>
        <div>
          <h2 className="font-display text-2xl font-black text-amber-300">
            请旋转手机至横屏
          </h2>
          <p className="mt-2 text-sm text-emerald-100/80 leading-relaxed max-w-xs">
            萌藤贪吃蛇需要横屏畅玩，视野更宽广，双拇指操控更畅快！
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row w-full max-w-xs">
          <button
            onClick={tryLandscape}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 py-3.5 font-display text-sm font-extrabold text-white shadow-lg transition active:scale-95"
          >
            <Maximize className="size-4" />
            自动全屏横屏
          </button>
          <button
            onClick={onBack}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white/10 py-3 text-xs font-bold text-slate-300 transition active:scale-95"
          >
            <ArrowLeft className="size-4" />
            返回主菜单
          </button>
        </div>
        <p className="text-xs text-muted-foreground/70">
          iOS 设备请关闭控制中心的竖排锁定并横放手机；Android 可直接点击自动横屏
        </p>
      </div>
    )
  }

  /* ───────────────────────────────────────────────────────────
     横屏游戏主界面（28 × 16 黄金宽屏战场 + 悬浮 HUD 掌机手游布局）
     ─────────────────────────────────────────────────────────── */
  return (
    <div
      className={cn(
        'fixed inset-0 z-40 flex flex-col text-white select-none touch-none overflow-hidden overscroll-none bg-gradient-to-b transition-colors duration-500',
        mapTheme.pageBgGradient,
      )}
    >
      {/* 顶部紧凑状态栏（节省高度） */}
      <header className="h-9 shrink-0 border-b border-white/10 bg-black/60 px-3 flex items-center justify-between backdrop-blur-md z-30">
        {/* 左侧：返回 + 换装 + 音效 */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-200 hover:bg-white/20 active:scale-95 transition"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">菜单</span>
          </button>

          <button
            onClick={() => setShowSkinModal(true)}
            className="flex items-center gap-1 rounded-full bg-purple-500/20 border border-purple-400/40 px-2.5 py-1 text-xs font-bold text-purple-200 hover:bg-purple-500/30 active:scale-95 transition"
          >
            <Sparkles className="size-3.5 text-purple-300" />
            <span>换装 · {skin.name}</span>
          </button>

          <MusicToggle />
        </div>

        {/* 中间：标题、得分与地图主题切换丸 */}
        <div className="flex items-center gap-2 sm:gap-3">
          <h1 className={cn('hidden md:inline font-display text-sm font-extrabold tracking-wide', mapTheme.headerTitleColor)}>
            萌藤贪吃蛇
          </h1>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span
              className={cn(
                'rounded-lg bg-black/60 px-2.5 py-0.5 text-xs font-black border tabular-nums',
                mapTheme.scorePillBorder,
                mapTheme.scorePillText,
              )}
            >
              得分 {score}
            </span>
            <span className="rounded-lg bg-black/40 px-2.5 py-0.5 text-xs font-bold text-slate-400 tabular-nums">
              最高 {bestScore || '—'}
            </span>
            {combo >= 2 && (
              <span className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 px-2 py-0.5 text-xs font-black text-slate-950 animate-pulse">
                <Flame className="size-3 fill-current" />
                {comboMultiplier}x
              </span>
            )}

            {/* 地图主题快捷切换丸 */}
            <div className="hidden sm:flex items-center rounded-full bg-black/50 p-0.5 border border-white/10 text-[10px]">
              {(['classic', 'qixi', 'autumn'] as SiteTheme[]).map((tid) => {
                const t = SNAKE_MAP_THEMES[tid]
                const isCur = activeThemeId === tid
                return (
                  <button
                    key={tid}
                    type="button"
                    onClick={() => setActiveThemeId(tid)}
                    className={cn(
                      'px-2 py-0.5 rounded-full transition font-bold flex items-center gap-0.5',
                      isCur ? 'bg-white/20 text-white shadow-xs' : 'text-slate-400 hover:text-white',
                    )}
                    title={`地图主题：${t.name}`}
                  >
                    <span>{t.icon}</span>
                    <span className="hidden lg:inline">{t.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* 右侧：生命爱心 + 暂停 + 全屏 */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-0.5 mr-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                className={`size-4 transition-transform ${
                  i < lives ? 'fill-rose-500 text-rose-400 scale-100' : 'fill-slate-800 text-slate-700 scale-90'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="rounded-full bg-white/10 p-1 text-slate-200 hover:bg-white/20 active:scale-95 transition"
            title={isPaused ? '继续' : '暂停'}
          >
            {isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="rounded-full bg-white/10 p-1 text-slate-200 hover:bg-white/20 active:scale-95 transition"
            title="全屏"
          >
            {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </button>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────
          横屏主舞台：28 × 16 黄金宽屏极限草坪战场（告别狭窄中间方块）
          ─────────────────────────────────────────────────────────── */}
      <div
        onPointerDown={handleBoardPointerDown}
        onPointerMove={handleBoardPointerMove}
        onPointerUp={handleBoardPointerUp}
        onPointerCancel={handleBoardPointerUp}
        className="flex-1 flex items-center justify-center p-1 sm:p-2 overflow-hidden w-full relative touch-none select-none"
      >
        {/* 宽屏草坪棋盘：7:4 比例，横屏极限铺开 */}
        <div
          className={cn(
            'relative aspect-[28/16] h-[calc(100dvh-2.8rem)] max-h-[min(98vw,88vh,720px)] w-full max-w-[min(98vw,calc((100dvh-2.8rem)*1.75))] rounded-2xl sm:rounded-3xl border-4 overflow-hidden select-none transition-colors duration-500 touch-none',
            mapTheme.boardBorder,
            mapTheme.boardBg,
            mapTheme.boardGlow,
          )}
        >
          {/* 网格草坪地砖 */}
          <div
            className="grid size-full"
            style={{
              gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${GRID_ROWS}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, idx) => {
              const x = idx % GRID_COLS
              const y = Math.floor(idx / GRID_COLS)
              const isAlt = (x + y) % 2 === 0
              return (
                <div
                  key={idx}
                  className={cn(
                    'size-full transition-colors duration-500',
                    isAlt ? mapTheme.tileEven : mapTheme.tileOdd,
                  )}
                />
              )
            })}
          </div>

          {/* 食物渲染 */}
          {foods.map((food) => {
            const leftPct = (food.x / GRID_COLS) * 100
            const topPct = (food.y / GRID_ROWS) * 100
            const unitWidthPct = 100 / GRID_COLS
            const unitHeightPct = 100 / GRID_ROWS

            return (
              <div
                key={food.id}
                className="absolute flex items-center justify-center animate-pulse"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${unitWidthPct}%`,
                  height: `${unitHeightPct}%`,
                }}
              >
                {food.type === 'sun' && (
                  <SunSprite className="size-full drop-shadow-[0_0_8px_rgba(255,230,0,0.8)]" />
                )}
                {food.type === 'cherry' && (
                  <PlantSprite id="cherry" className="size-full drop-shadow" />
                )}
                {food.type === 'freeze' && (
                  <div className="size-5 rounded-full bg-cyan-300 shadow-[0_0_10px_#38bdf8] border-2 border-white flex items-center justify-center text-[9px] font-black text-blue-900">
                    ❄
                  </div>
                )}
                {food.type === 'jalapeno' && (
                  <div className="size-5 rounded-full bg-rose-500 shadow-[0_0_10px_#f43f5e] border-2 border-amber-300 flex items-center justify-center text-[10px]">
                    🌶
                  </div>
                )}
                {food.type === 'magnet' && (
                  <div className="size-5 rounded-full bg-purple-600 shadow-[0_0_10px_#a855f7] border-2 border-white flex items-center justify-center text-[9px]">
                    <Magnet className="size-3 text-white" />
                  </div>
                )}
                {food.type === 'zombie' && (
                  <div className="size-6 scale-110">
                    <ZombieSprite id="imp" className="size-full anim-shamble" />
                  </div>
                )}
              </div>
            )
          })}

          {/* 贪吃蛇身体与头部 */}
          {snake.map((seg, idx) => {
            const isHead = idx === 0
            const isTail = idx === snake.length - 1
            const leftPct = (seg.x / GRID_COLS) * 100
            const topPct = (seg.y / GRID_ROWS) * 100
            const unitWidthPct = 100 / GRID_COLS
            const unitHeightPct = 100 / GRID_ROWS

            return (
              <div
                key={idx}
                className="absolute flex items-center justify-center transition-all duration-75"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${unitWidthPct}%`,
                  height: `${unitHeightPct}%`,
                  zIndex: isHead ? 30 : 20 - Math.min(10, idx),
                }}
              >
                {isHead ? (
                  <div
                    className="relative size-[94%] rounded-full border-[2.6px] border-[#2d3a22] shadow-md flex items-center justify-center"
                    style={{
                      backgroundColor: skin.color,
                      boxShadow: boostTime > 0 ? '0 0 14px #f43f5e' : 'none',
                    }}
                  >
                    {/* 头顶花蕊 */}
                    <span className="absolute -top-1.5 size-2 rounded-full bg-amber-300 border border-[#2d3a22]" />

                    {/* 大眼灵动高光（实时看向即时意图方向，提供 0ms 视觉反馈） */}
                    <div className="flex gap-1.5">
                      <span className="relative size-2 rounded-full bg-white border border-[#2d3a22]">
                        <span
                          className="absolute size-1 rounded-full bg-black transition-all duration-75"
                          style={{
                            top: (intendedDir || dir) === 'UP' ? 0 : (intendedDir || dir) === 'DOWN' ? 3 : 1,
                            left: (intendedDir || dir) === 'LEFT' ? 0 : (intendedDir || dir) === 'RIGHT' ? 3 : 1,
                          }}
                        />
                      </span>
                      <span className="relative size-2 rounded-full bg-white border border-[#2d3a22]">
                        <span
                          className="absolute size-1 rounded-full bg-black transition-all duration-75"
                          style={{
                            top: (intendedDir || dir) === 'UP' ? 0 : (intendedDir || dir) === 'DOWN' ? 3 : 1,
                            left: (intendedDir || dir) === 'LEFT' ? 0 : (intendedDir || dir) === 'RIGHT' ? 3 : 1,
                          }}
                        />
                      </span>
                    </div>

                    {/* 微笑嘴巴 */}
                    <span className="absolute bottom-1 h-0.5 w-2 rounded-full bg-[#2d3a22]" />
                  </div>
                ) : (
                  <div
                    className="size-[84%] rounded-full border-[2px] border-[#2d3a22] flex items-center justify-center shadow-xs"
                    style={{
                      backgroundColor: idx % 2 === 0 ? skin.bodyColor : skin.color,
                      transform: `scale(${isTail ? 0.75 : 1})`,
                    }}
                  >
                    {idx % 4 === 0 && (
                      <span className="size-1 rounded-full bg-amber-300 opacity-80" />
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* 飘字特效层 */}
          {popups.map((p) => (
            <span
              key={p.id}
              className="absolute font-display text-xs font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-bounce pointer-events-none z-30"
              style={{
                left: `${(p.x / GRID_COLS) * 100}%`,
                top: `${(p.y / GRID_ROWS) * 100}%`,
                color: p.color,
              }}
            >
              {p.text}
            </span>
          ))}

          {/* 达成挑战提示 */}
          {missionCompletePopup && (
            <div className="absolute inset-x-0 top-3 z-40 text-center animate-bounce pointer-events-none">
              <span className="inline-block rounded-full border border-amber-300 bg-amber-500 px-4 py-1 font-display text-xs font-black text-slate-950 shadow-lg">
                {missionCompletePopup}
              </span>
            </div>
          )}

          {/* 左下角：悬浮双模触控控制器 HUD (摇杆 / 十字键) */}
          <div className="absolute bottom-2.5 left-2.5 z-30 pointer-events-auto select-none touch-none">
            <VirtualJoystick
              onDirection={queueDirection}
              currentDir={dir}
              intendedDir={intendedDir}
              mapTheme={mapTheme}
            />
          </div>

          {/* 右下角：悬浮半透明极速冲刺按钮 HUD 与状态指示 */}
          <div className="absolute bottom-2.5 right-2.5 z-30 flex flex-col items-center gap-1 pointer-events-auto select-none touch-none">
            <button
              onPointerDown={(e) => {
                e.stopPropagation()
                setDashActive(true)
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                  try { navigator.vibrate(15) } catch {}
                }
              }}
              onPointerUp={(e) => {
                e.stopPropagation()
                setDashActive(false)
              }}
              onPointerCancel={(e) => {
                e.stopPropagation()
                setDashActive(false)
              }}
              className={cn(
                'size-18 sm:size-22 rounded-full border-2 flex flex-col items-center justify-center shadow-lg transition-all active:scale-95 select-none touch-none backdrop-blur-md',
                dashActive || boostTime > 0
                  ? mapTheme.dashBgActive
                  : mapTheme.dashBgNormal,
              )}
            >
              <Zap className={cn('size-5 sm:size-6', (dashActive || boostTime > 0) && 'animate-bounce')} />
              <span className="font-display text-[10px] sm:text-xs font-black mt-0.5">
                {boostTime > 0 ? '狂暴' : '冲刺'}
              </span>
            </button>

            {/* 增益状态指示 */}
            {(freezeTime > 0 || boostTime > 0 || magnetTime > 0) && (
              <div className="flex flex-col gap-0.5 w-full max-w-[85px]">
                {freezeTime > 0 && (
                  <div className="flex items-center justify-between rounded-md bg-cyan-950/85 border border-cyan-400/40 px-1.5 py-0.5 text-[9px] text-cyan-200">
                    <span>❄ 减速</span>
                    <span className="font-bold">{Math.ceil(freezeTime)}s</span>
                  </div>
                )}
                {boostTime > 0 && (
                  <div className="flex items-center justify-between rounded-md bg-rose-950/85 border border-rose-400/40 px-1.5 py-0.5 text-[9px] text-rose-200">
                    <span>🌶 狂暴</span>
                    <span className="font-bold">{Math.ceil(boostTime)}s</span>
                  </div>
                )}
                {magnetTime > 0 && (
                  <div className="flex items-center justify-between rounded-md bg-purple-950/85 border border-purple-400/40 px-1.5 py-0.5 text-[9px] text-purple-200">
                    <span>🧲 磁力</span>
                    <span className="font-bold">{Math.ceil(magnetTime)}s</span>
                  </div>
                )}
              </div>
            )}

            {/* 当前目标徽章 */}
            <div className="hidden sm:flex items-center gap-1 rounded-md border border-white/10 bg-black/60 px-2 py-0.5 text-[9px] text-slate-300 backdrop-blur-xs">
              <Award className="size-2.5 text-amber-300" />
              <span className="truncate max-w-[90px]">{MISSIONS[curMissionIdx]?.title}</span>
            </div>
          </div>

          {/* 游戏暂停遮罩 */}
          {isPaused && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-xs">
              <div className="rounded-3xl border border-white/20 bg-slate-900/90 px-6 py-4 text-center text-white">
                <Pause className="size-8 mx-auto text-amber-300 mb-2" />
                <h3 className="font-display text-xl font-bold">游戏已暂停</h3>
                <button
                  onClick={() => setIsPaused(false)}
                  className="mt-4 rounded-full bg-primary px-6 py-2 text-xs font-extrabold text-primary-foreground transition active:scale-95"
                >
                  继续冒险
                </button>
              </div>
            </div>
          )}

          {/* 游戏结束结算 */}
          {isGameOver && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="w-full max-w-sm rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-[#1c2e22] to-[#0f1d14] p-5 text-center text-white shadow-2xl">
                <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.6)]">
                  <Trophy className="size-7" />
                </div>
                <h3 className="font-display text-xl font-black text-amber-300">
                  萌藤冒险总结
                </h3>
                <p className="mt-0.5 text-xs text-emerald-100">灵动萌藤在草坪留下了漫天繁星！</p>

                <div className="my-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/40 p-2.5 text-center">
                  <div>
                    <span className="block text-[10px] text-slate-300">终局长度</span>
                    <span className="font-display text-lg font-black text-emerald-300">
                      {snake.length} 节
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-300">本次得分</span>
                    <span className="font-display text-lg font-black text-amber-300">{score}</span>
                  </div>
                </div>

                <button
                  onClick={startNewGame}
                  className="w-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 py-2.5 font-display text-sm font-extrabold text-slate-950 shadow transition hover:-translate-y-0.5 active:translate-y-0"
                >
                  再来一局！
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 换装工坊弹窗 */}
      {showSkinModal && (
        <SkinModal
          skins={SKINS}
          selectedSkin={selectedSkin}
          onSelect={(id) => {
            setSelectedSkin(id)
            setShowSkinModal(false)
          }}
          onClose={() => setShowSkinModal(false)}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   换装工坊弹窗组件 (SkinModal)
   ═══════════════════════════════════════════════════════════════ */

interface SkinModalProps {
  skins: SkinDef[]
  selectedSkin: SnakeSkin
  onSelect: (id: SnakeSkin) => void
  onClose: () => void
}

function SkinModal({ skins, selectedSkin, onSelect, onClose }: SkinModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl border-2 border-purple-400/40 bg-gradient-to-b from-[#181d2c] to-[#0c0f17] p-5 text-white shadow-2xl max-h-[85vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-purple-300" />
            <h3 className="font-display text-base font-black text-amber-200">
              萌藤工坊 · 选择皮肤
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 p-1 text-slate-300 hover:bg-white/20 active:scale-95"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 皮肤列表 */}
        <div className="grid gap-3 sm:grid-cols-2 overflow-y-auto py-3 pr-1">
          {skins.map((s) => {
            const isSelected = selectedSkin === s.id
            return (
              <div
                key={s.id}
                onClick={() => {
                  audio.playClick()
                  onSelect(s.id)
                }}
                className={`cursor-pointer rounded-2xl border p-3 transition ${
                  isSelected
                    ? 'border-amber-300 bg-amber-400/15 ring-2 ring-amber-300'
                    : 'border-white/15 bg-black/35 hover:border-white/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-display text-sm font-bold text-white">{s.name}</h4>
                  {isSelected && (
                    <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black text-slate-950">
                      使用中
                    </span>
                  )}
                </div>

                <div className="my-2 flex items-center gap-1.5">
                  <div
                    className="size-6 rounded-full border-2 border-[#2d3a22] shadow"
                    style={{ backgroundColor: s.color }}
                  />
                  <div
                    className="size-5 rounded-full border-2 border-[#2d3a22] shadow"
                    style={{ backgroundColor: s.bodyColor }}
                  />
                  <div
                    className="size-4 rounded-full border-2 border-[#2d3a22] shadow"
                    style={{ backgroundColor: s.color }}
                  />
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">{s.desc}</p>
              </div>
            )
          })}
        </div>

        <p className="pt-2 border-t border-white/10 text-center text-xs text-muted-foreground">
          点击皮肤即刻生效，换装后开启更加酷炫的吞食冒险！
        </p>
      </div>
    </div>
  )
}
