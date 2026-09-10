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

/* ═══════════════════════════════════════════════════════════════
   网格与类型定义
   ═══════════════════════════════════════════════════════════════ */

interface StarlightGardenProps {
  onBack: () => void
  bestScore: number
  onBestScore: (score: number) => void
}

const GRID_SIZE = 20 // 20 × 20 棋盘

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
}

function VirtualJoystick({ onDirection, currentDir }: VirtualJoystickProps) {
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
    const maxRadius = 38 // 摇杆最大偏移半径

    let clampedX = dx
    let clampedY = dy
    if (dist > maxRadius) {
      clampedX = (dx / dist) * maxRadius
      clampedY = (dy / dist) * maxRadius
    }

    setKnobOffset({ x: clampedX, y: clampedY })

    // 死区判断（大于 10px 时计算方向）
    if (dist > 10) {
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI
      let dir: Direction = 'RIGHT'
      if (angle >= -45 && angle <= 45) {
        dir = 'RIGHT'
      } else if (angle > 45 && angle < 135) {
        dir = 'DOWN'
      } else if (angle >= 135 || angle <= -135) {
        dir = 'LEFT'
      } else {
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
    if (pointerIdRef.current !== e.pointerId) return
    updateKnob(e.clientX, e.clientY)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
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

  return (
    <div className="flex flex-col items-center select-none touch-none">
      {/* 摇杆底座 */}
      <div
        ref={baseRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative size-28 sm:size-32 rounded-full border-2 border-emerald-400/40 bg-slate-900/85 shadow-[0_0_20px_rgba(16,185,129,0.25)] backdrop-blur-md cursor-grab active:cursor-grabbing touch-none flex items-center justify-center transition-shadow active:shadow-[0_0_30px_rgba(16,185,129,0.45)]"
      >
        {/* 四向刻度与高亮箭头 */}
        <span
          className={`absolute top-1.5 flex items-center justify-center transition-transform ${
            activeDir === 'UP' || currentDir === 'UP'
              ? 'text-emerald-300 drop-shadow-[0_0_8px_#34d399] scale-125'
              : 'text-white/20'
          }`}
        >
          <ArrowUp className="size-4" />
        </span>
        <span
          className={`absolute bottom-1.5 flex items-center justify-center transition-transform ${
            activeDir === 'DOWN' || currentDir === 'DOWN'
              ? 'text-emerald-300 drop-shadow-[0_0_8px_#34d399] scale-125'
              : 'text-white/20'
          }`}
        >
          <ArrowDown className="size-4" />
        </span>
        <span
          className={`absolute left-1.5 flex items-center justify-center transition-transform ${
            activeDir === 'LEFT' || currentDir === 'LEFT'
              ? 'text-emerald-300 drop-shadow-[0_0_8px_#34d399] scale-125'
              : 'text-white/20'
          }`}
        >
          <ArrowLeft className="size-4" />
        </span>
        <span
          className={`absolute right-1.5 flex items-center justify-center transition-transform ${
            activeDir === 'RIGHT' || currentDir === 'RIGHT'
              ? 'text-emerald-300 drop-shadow-[0_0_8px_#34d399] scale-125'
              : 'text-white/20'
          }`}
        >
          <ArrowRight className="size-4" />
        </span>

        {/* 内部同心装饰环 */}
        <div className="size-16 rounded-full border border-white/10 pointer-events-none" />

        {/* 摇杆中心滑块（Knob） */}
        <div
          className="absolute size-12 rounded-full border-2 border-emerald-300/80 bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-[0_4px_12px_rgba(0,0,0,0.6)] pointer-events-none flex items-center justify-center"
          style={{
            transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
            transition: pointerIdRef.current === null ? 'transform 0.16s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
          }}
        >
          {/* 滑块凹陷与手感凸点 */}
          <div className="size-4 rounded-full bg-white/40 border border-white/60 shadow-inner" />
        </div>
      </div>
      <p className="mt-2 text-[11px] font-bold text-emerald-200/70 tracking-wider">
        触控摇杆转向
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   主组件：星愿花园 · 萌藤贪吃蛇（强制横屏模式）
   ═══════════════════════════════════════════════════════════════ */

export function StarlightGarden({ onBack, bestScore, onBestScore }: StarlightGardenProps) {
  const [selectedSkin, setSelectedSkin] = useState<SnakeSkin>('sprout')
  const [showSkinModal, setShowSkinModal] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

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

  /* 游戏核心状态 */
  const [snake, setSnake] = useState<Point[]>([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ])
  const [dir, setDir] = useState<Direction>('RIGHT')
  const nextDirRef = useRef<Direction>('RIGHT')

  const [foods, setFoods] = useState<FoodItem[]>([])
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3) // 3点生命值保障
  const [isPaused, setIsPaused] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)

  /* 特殊增益状态 */
  const [freezeTime, setFreezeTime] = useState(0) // 减速子弹时间
  const [boostTime, setBoostTime] = useState(0) // 辣椒狂暴冲刺
  const [magnetTime, setMagnetTime] = useState(0) // 磁力吸引

  /* 连击倍率 */
  const [combo, setCombo] = useState(0)
  const [comboTimer, setComboTimer] = useState(0)

  /* 手动冲刺按钮状态 */
  const [dashActive, setDashActive] = useState(false)

  /* 飘字特效 */
  const [popups, setPopups] = useState<{ id: number; x: number; y: number; text: string; color: string }[]>([])
  const [curMissionIdx, setCurMissionIdx] = useState(0)
  const [missionCompletePopup, setMissionCompletePopup] = useState<string | null>(null)

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

  /* 生成随机空闲格子位置 */
  const getFreeCell = useCallback((occupied: Point[]): Point => {
    const occSet = new Set(occupied.map((p) => `${p.x},${p.y}`))
    const freeCells: Point[] = []
    for (let x = 1; x < GRID_SIZE - 1; x++) {
      for (let y = 1; y < GRID_SIZE - 1; y++) {
        if (!occSet.has(`${x},${y}`)) {
          freeCells.push({ x, y })
        }
      }
    }
    if (freeCells.length === 0) return { x: 5, y: 5 }
    return freeCells[Math.floor(Math.random() * freeCells.length)]
  }, [])

  /* 初始化食物生成 */
  const spawnInitialFoods = useCallback(() => {
    const sun1 = getFreeCell([])
    const sun2 = getFreeCell([sun1])
    const cherry = getFreeCell([sun1, sun2])

    const initialList: FoodItem[] = [
      { id: nextUid(), x: sun1.x, y: sun1.y, type: 'sun', life: 999 },
      { id: nextUid(), x: sun2.x, y: sun2.y, type: 'sun', life: 999 },
      { id: nextUid(), x: cherry.x, y: cherry.y, type: 'cherry', life: 12 },
    ]
    setFoods(initialList)
  }, [getFreeCell])

  /* 重置开始游戏 */
  const startNewGame = useCallback(() => {
    setSnake([
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ])
    setDir('RIGHT')
    nextDirRef.current = 'RIGHT'
    setScore(0)
    setLives(3)
    setCombo(0)
    setComboTimer(0)
    setFreezeTime(0)
    setBoostTime(0)
    setMagnetTime(0)
    setIsPaused(false)
    setIsGameOver(false)
    setPopups([])
    setMissionCompletePopup(null)
    spawnInitialFoods()
  }, [spawnInitialFoods])

  useEffect(() => {
    startNewGame()
  }, [startNewGame])

  /* 摇杆转向回调 */
  const handleJoystickDirection = useCallback((newDir: Direction) => {
    const cur = nextDirRef.current
    if (newDir === 'UP' && cur !== 'DOWN') nextDirRef.current = 'UP'
    else if (newDir === 'DOWN' && cur !== 'UP') nextDirRef.current = 'DOWN'
    else if (newDir === 'LEFT' && cur !== 'RIGHT') nextDirRef.current = 'LEFT'
    else if (newDir === 'RIGHT' && cur !== 'LEFT') nextDirRef.current = 'RIGHT'
  }, [])

  /* ───────────────────────────────────────────────────────────
     键盘控制绑定（WASD、方向键、空格冲刺）
     ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const cur = nextDirRef.current
      if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && cur !== 'DOWN') {
        nextDirRef.current = 'UP'
      } else if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && cur !== 'UP') {
        nextDirRef.current = 'DOWN'
      } else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && cur !== 'RIGHT') {
        nextDirRef.current = 'LEFT'
      } else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && cur !== 'LEFT') {
        nextDirRef.current = 'RIGHT'
      } else if (e.key === ' ') {
        setDashActive(true)
      } else if (e.key === 'p' || e.key === 'P') {
        setIsPaused((p) => !p)
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
  }, [])

  /* ───────────────────────────────────────────────────────────
     游戏主时钟循环
     ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (isGameOver || isPaused) return

    let intervalMs = 130
    if (freezeTime > 0) intervalMs = 200
    if (dashActive || boostTime > 0) intervalMs = 68

    const timer = setInterval(() => {
      setFreezeTime((t) => Math.max(0, t - intervalMs / 1000))
      setBoostTime((t) => Math.max(0, t - intervalMs / 1000))
      setMagnetTime((t) => Math.max(0, t - intervalMs / 1000))
      setComboTimer((t) => {
        if (t <= intervalMs / 1000) {
          setCombo(0)
          return 0
        }
        return t - intervalMs / 1000
      })

      /* 食物生命期与磁力吸引 */
      setFoods((curFoods) => {
        const remainingFoods: FoodItem[] = []
        curFoods.forEach((f) => {
          if (f.life !== 999) {
            f.life -= intervalMs / 1000
            if (f.life <= 0) return
          }
          remainingFoods.push(f)
        })

        if (Math.random() < 0.045 && remainingFoods.length < 5) {
          const kinds: FoodType[] = ['cherry', 'freeze', 'jalapeno', 'magnet', 'zombie']
          const picked = kinds[Math.floor(Math.random() * kinds.length)]
          const cell = getFreeCell(snake)
          remainingFoods.push({
            id: nextUid(),
            x: cell.x,
            y: cell.y,
            type: picked,
            life: picked === 'zombie' ? 18 : 12,
          })
        }

        return remainingFoods
      })

      /* 贪吃蛇向前行进一格 */
      setSnake((curSnake) => {
        const curDir = nextDirRef.current
        setDir(curDir)

        const head = curSnake[0]
        const newHead: Point = { x: head.x, y: head.y }

        if (curDir === 'UP') newHead.y -= 1
        if (curDir === 'DOWN') newHead.y += 1
        if (curDir === 'LEFT') newHead.x -= 1
        if (curDir === 'RIGHT') newHead.x += 1

        // 磁力吸取周围食物判定
        if (magnetTime > 0) {
          setFoods((fs) =>
            fs.map((f) => {
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
            }),
          )
        }

        // 碰撞判定：撞墙或撞到身体
        const hitWall =
          newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE
        const hitSelf = curSnake.slice(1).some((seg) => seg.x === newHead.x && seg.y === newHead.y)

        if (hitWall || hitSelf) {
          if (boostTime > 0) {
            newHead.x = (newHead.x + GRID_SIZE) % GRID_SIZE
            newHead.y = (newHead.y + GRID_SIZE) % GRID_SIZE
          } else {
            audio.playLose()
            setLives((l) => {
              const nextL = l - 1
              if (nextL <= 0) {
                setIsGameOver(true)
                setScore((curS) => {
                  if (curS > bestScore) {
                    onBestScore(curS)
                  }
                  return curS
                })
              }
              return nextL
            })
            showPop(head.x, head.y, '哎呀！注意避让', '#f87171')
            return curSnake.slice(0, Math.max(3, Math.floor(curSnake.length * 0.7)))
          }
        }

        // 检测是否吃到了食物
        let ateFood: FoodItem | null = null
        setFoods((currentFoods) => {
          const eatenIdx = currentFoods.findIndex(
            (f) => f.x === newHead.x && f.y === newHead.y,
          )
          if (eatenIdx !== -1) {
            ateFood = currentFoods[eatenIdx]
            return currentFoods.filter((_, idx) => idx !== eatenIdx)
          }
          return currentFoods
        })

        if (ateFood) {
          const food: FoodItem = ateFood
          let addedScore = 15
          let growLength = 1

          if (food.type === 'sun') {
            audio.playSun()
            addedScore = 15
            growLength = 1
            showPop(newHead.x, newHead.y, `+${Math.round(addedScore * comboMultiplier)}`, '#fde047')
          } else if (food.type === 'cherry') {
            audio.playExplosion()
            addedScore = 60
            growLength = 2
            showPop(newHead.x, newHead.y, `双子樱桃 +${Math.round(addedScore * comboMultiplier)}!`, '#f43f5e')
          } else if (food.type === 'freeze') {
            audio.playFreezeShoot()
            setFreezeTime(6.0)
            addedScore = 40
            showPop(newHead.x, newHead.y, '冰霜减速 6s!', '#38bdf8')
          } else if (food.type === 'jalapeno') {
            audio.playExplosion()
            setBoostTime(5.0)
            addedScore = 50
            showPop(newHead.x, newHead.y, '狂暴冲刺 5s!', '#ef4444')
          } else if (food.type === 'magnet') {
            audio.playSun()
            setMagnetTime(6.0)
            addedScore = 40
            showPop(newHead.x, newHead.y, '磁力开启 6s!', '#a855f7')
          } else if (food.type === 'zombie') {
            audio.playZombieDie()
            addedScore = selectedSkin === 'star' ? 240 : 120
            growLength = 2
            showPop(newHead.x, newHead.y, `吞食僵尸 +${addedScore}!`, '#22c55e')
          }

          setCombo((c) => c + 1)
          setComboTimer(3.5)

          const finalEarn = Math.round(addedScore * comboMultiplier)
          setScore((s) => {
            const nextScore = s + finalEarn
            if (nextScore > bestScore) {
              onBestScore(nextScore)
            }
            return nextScore
          })

          // 达成任务判定
          const curM = MISSIONS[curMissionIdx]
          if (curM && (score + finalEarn >= curM.targetScore || curSnake.length + growLength >= curM.targetLength)) {
            setMissionCompletePopup(`🎉 目标达成：${curM.title} (+${curM.rewardBonus}分)`)
            setScore((s) => s + curM.rewardBonus)
            if (curMissionIdx < MISSIONS.length - 1) {
              setCurMissionIdx((i) => i + 1)
            }
            setTimeout(() => setMissionCompletePopup(null), 3000)
          }

          // 补充阳光
          setFoods((fs) => {
            const hasSun = fs.some((f) => f.type === 'sun')
            if (!hasSun) {
              const newSun = getFreeCell([...curSnake, newHead])
              return [...fs, { id: nextUid(), x: newSun.x, y: newSun.y, type: 'sun', life: 999 }]
            }
            return fs
          })

          // 身体生长
          const newBody = [newHead, ...curSnake]
          if (growLength > 1) {
            newBody.push(curSnake[curSnake.length - 1])
          }
          return newBody
        }

        // 未吃到食物正常前进
        return [newHead, ...curSnake.slice(0, -1)]
      })
    }, intervalMs)

    return () => clearInterval(timer)
  }, [
    isGameOver,
    isPaused,
    freezeTime,
    dashActive,
    boostTime,
    magnetTime,
    comboMultiplier,
    score,
    bestScore,
    onBestScore,
    selectedSkin,
    curMissionIdx,
    getFreeCell,
    snake,
    showPop,
  ])

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
     横屏游戏主界面（双拇指掌机手游布局）
     ─────────────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#071109] text-white select-none touch-none overflow-hidden overscroll-none">
      {/* 顶部紧凑状态栏（节省高度） */}
      <header className="h-9 shrink-0 border-b border-white/10 bg-black/50 px-3 flex items-center justify-between backdrop-blur-md z-30">
        {/* 左侧：返回 + 换皮肤 + 音效 */}
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

        {/* 中间：标题与得分 */}
        <div className="flex items-center gap-2 sm:gap-3">
          <h1 className="hidden md:inline font-display text-sm font-extrabold text-amber-300 tracking-wide">
            星愿花园 · 萌藤贪吃蛇
          </h1>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="rounded-lg bg-black/60 px-2.5 py-0.5 text-xs font-black text-amber-300 border border-amber-400/30 tabular-nums">
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
          横屏主舞台：左手摇杆 + 中间超大草坪 + 右手冲刺
          ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-between px-2 sm:px-4 py-0.5 overflow-hidden gap-1 sm:gap-4">
        {/* 左侧区域：屏幕虚拟摇杆 */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-[200px]">
          <VirtualJoystick onDirection={handleJoystickDirection} currentDir={dir} />
          <span className="mt-1 text-[10px] text-muted-foreground/60 hidden sm:inline">
            或键盘 WASD / 方向键
          </span>
        </div>

        {/* 中间核心：自适应超大 20 × 20 像素草坪棋盘（iPhone 17 横屏极限撑满） */}
        <div className="flex shrink-0 items-center justify-center h-full py-0.5">
          <div className="relative aspect-square h-[calc(100dvh-2.6rem)] max-h-[min(88vw,88vh,720px)] rounded-2xl sm:rounded-3xl border-4 border-[#2d3a22] bg-[#18291e] shadow-2xl overflow-hidden">
            {/* 网格草坪地砖 */}
            <div
              className="grid size-full"
              style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
                const x = idx % GRID_SIZE
                const y = Math.floor(idx / GRID_SIZE)
                const isAlt = (x + y) % 2 === 0
                return (
                  <div
                    key={idx}
                    className={`size-full transition-colors ${
                      isAlt ? 'bg-lawn opacity-90' : 'bg-lawn-alt opacity-90'
                    }`}
                  />
                )
              })}
            </div>

            {/* 食物渲染 */}
            {foods.map((food) => {
              const leftPct = (food.x / GRID_SIZE) * 100
              const topPct = (food.y / GRID_SIZE) * 100
              const unitPct = 100 / GRID_SIZE

              return (
                <div
                  key={food.id}
                  className="absolute flex items-center justify-center animate-pulse"
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    width: `${unitPct}%`,
                    height: `${unitPct}%`,
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
              const leftPct = (seg.x / GRID_SIZE) * 100
              const topPct = (seg.y / GRID_SIZE) * 100
              const unitPct = 100 / GRID_SIZE

              return (
                <div
                  key={idx}
                  className="absolute flex items-center justify-center transition-all duration-75"
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    width: `${unitPct}%`,
                    height: `${unitPct}%`,
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

                      {/* 大眼灵动高光 */}
                      <div className="flex gap-1.5">
                        <span className="relative size-2 rounded-full bg-white border border-[#2d3a22]">
                          <span
                            className="absolute size-1 rounded-full bg-black"
                            style={{
                              top: dir === 'UP' ? 0 : dir === 'DOWN' ? 3 : 1,
                              left: dir === 'LEFT' ? 0 : dir === 'RIGHT' ? 3 : 1,
                            }}
                          />
                        </span>
                        <span className="relative size-2 rounded-full bg-white border border-[#2d3a22]">
                          <span
                            className="absolute size-1 rounded-full bg-black"
                            style={{
                              top: dir === 'UP' ? 0 : dir === 'DOWN' ? 3 : 1,
                              left: dir === 'LEFT' ? 0 : dir === 'RIGHT' ? 3 : 1,
                            }}
                          />
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="size-[84%] rounded-full border-[2px] border-[#2d3a22] flex items-center justify-center shadow-sm"
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
                className="absolute font-display text-xs font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-bounce pointer-events-none"
                style={{
                  left: `${(p.x / GRID_SIZE) * 100}%`,
                  top: `${(p.y / GRID_SIZE) * 100}%`,
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
                    星愿冒险总结
                  </h3>
                  <p className="mt-0.5 text-xs text-emerald-100">小蛇在星夜草坪留下了漫天繁星！</p>

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

        {/* 右侧区域：极速冲刺大按钮 + 状态与目标 */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2 max-w-[200px]">
          {/* 极速冲刺大按钮 */}
          <div className="flex flex-col items-center">
            <button
              onPointerDown={() => setDashActive(true)}
              onPointerUp={() => setDashActive(false)}
              onPointerCancel={() => setDashActive(false)}
              className={`size-20 sm:size-24 rounded-full border-2 flex flex-col items-center justify-center shadow-lg transition-all active:scale-95 select-none touch-none ${
                dashActive || boostTime > 0
                  ? 'border-rose-300 bg-gradient-to-b from-rose-500 to-red-600 text-white shadow-[0_0_24px_rgba(244,63,94,0.6)] scale-105'
                  : 'border-amber-400/50 bg-gradient-to-b from-amber-500/20 to-amber-600/35 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.2)] hover:border-amber-400'
              }`}
            >
              <Zap className={`size-7 sm:size-8 ${dashActive || boostTime > 0 ? 'animate-bounce' : ''}`} />
              <span className="font-display text-[11px] sm:text-xs font-black mt-0.5">
                {boostTime > 0 ? '狂暴冲刺' : '按住冲刺'}
              </span>
            </button>
            <p className="mt-1 text-[10px] text-amber-200/60 font-bold">右拇指加速</p>
          </div>

          {/* 增益状态指示 */}
          {(freezeTime > 0 || boostTime > 0 || magnetTime > 0) && (
            <div className="flex flex-col gap-1 w-full max-w-[120px]">
              {freezeTime > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-cyan-950/70 border border-cyan-400/40 px-2 py-0.5 text-[10px] text-cyan-200">
                  <span>❄ 冰霜减速</span>
                  <span className="font-bold">{Math.ceil(freezeTime)}s</span>
                </div>
              )}
              {boostTime > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-rose-950/70 border border-rose-400/40 px-2 py-0.5 text-[10px] text-rose-200">
                  <span>🌶 狂暴无敌</span>
                  <span className="font-bold">{Math.ceil(boostTime)}s</span>
                </div>
              )}
              {magnetTime > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-purple-950/70 border border-purple-400/40 px-2 py-0.5 text-[10px] text-purple-200">
                  <span>🧲 磁力吸取</span>
                  <span className="font-bold">{Math.ceil(magnetTime)}s</span>
                </div>
              )}
            </div>
          )}

          {/* 当前挑战微卡 */}
          <div className="w-full max-w-[120px] rounded-xl border border-white/10 bg-black/40 p-2 text-[10px] text-slate-300">
            <div className="flex items-center gap-1 font-bold text-amber-300 truncate">
              <Award className="size-3 shrink-0" />
              <span>{MISSIONS[curMissionIdx]?.title}</span>
            </div>
            <p className="truncate text-slate-400 text-[9px] mt-0.5">
              目标: {MISSIONS[curMissionIdx]?.targetScore}分 / {MISSIONS[curMissionIdx]?.targetLength}节
            </p>
          </div>
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
              星愿萌藤工坊 · 选择皮肤
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
