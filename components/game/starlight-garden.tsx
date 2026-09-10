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
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Sun,
  Trophy,
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
  life: number // 剩余秒数（针对特殊食物）
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
  { id: 1, title: '初萌生息', desc: '藤蔓长度达到 8 节，收集 50 点阳光', targetScore: 100, targetLength: 8, rewardBonus: 150 },
  { id: 2, title: '双倍快乐', desc: '吞食双子樱桃，长度达到 14 节', targetScore: 260, targetLength: 14, rewardBonus: 250 },
  { id: 3, title: '狂暴突进', desc: '吃下辣椒冲刺，得分突破 500 分', targetScore: 500, targetLength: 18, rewardBonus: 400 },
  { id: 4, title: '暗夜伏魔', desc: '长度突破 22 节，消灭 2 只游荡小僵尸', targetScore: 850, targetLength: 22, rewardBonus: 600 },
  { id: 5, title: '银河奇迹', desc: '终极挑战！得分突破 1500，长度达到 28 节', targetScore: 1500, targetLength: 28, rewardBonus: 1000 },
]

/* ═══════════════════════════════════════════════════════════════
   主组件：星愿花园 · 萌藤贪吃蛇
   ═══════════════════════════════════════════════════════════════ */

export function StarlightGarden({ onBack, bestScore, onBestScore }: StarlightGardenProps) {
  const [activeTab, setActiveTab] = useState<'arcade' | 'skins'>('arcade')
  const [selectedSkin, setSelectedSkin] = useState<SnakeSkin>('sprout')

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
  const [lives, setLives] = useState(3) // 3点生命值，撞墙/撞身不会直接猝死！
  const [isPaused, setIsPaused] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)

  /* 特殊增益状态 */
  const [freezeTime, setFreezeTime] = useState(0) // 减速子弹时间
  const [boostTime, setBoostTime] = useState(0) // 辣椒狂暴冲刺
  const [magnetTime, setMagnetTime] = useState(0) // 磁力吸引

  /* 连击倍率 */
  const [combo, setCombo] = useState(0)
  const [comboTimer, setComboTimer] = useState(0)

  /* 手动冲刺按钮按住状态 */
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
     游戏主时钟循环（根据状态与冲刺动态控制帧率）
     ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (isGameOver || isPaused) return

    // 基础移动间隔（毫秒）：减速状态更慢，冲刺状态更快
    let intervalMs = 135
    if (freezeTime > 0) intervalMs = 210
    if (dashActive || boostTime > 0) intervalMs = 70

    const timer = setInterval(() => {
      /* 状态时间递减 */
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

        // 随机刷新特殊食物（辣椒、冰豆、磁铁、游荡僵尸）
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
          // 狂暴状态可穿墙反弹，不受伤害
          if (boostTime > 0) {
            newHead.x = (newHead.x + GRID_SIZE) % GRID_SIZE
            newHead.y = (newHead.y + GRID_SIZE) % GRID_SIZE
          } else {
            audio.playLose()
            setLives((l) => {
              const nextL = l - 1
              if (nextL <= 0) {
                setIsGameOver(true)
                // 结算高分
                setScore((curS) => {
                  if (curS > bestScore) {
                    onBestScore(curS)
                  }
                  return curS
                })
              }
              return nextL
            })
            // 扣除命数后，修剪蛇身减半并弹回中央，给予第二次机会！
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

        // 如果吃到了食物
        if (ateFood) {
          const food: FoodItem = ateFood
          let addedScore = 10
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
            // 吃僵尸！
            audio.playZombieDie()
            addedScore = selectedSkin === 'star' ? 240 : 120
            growLength = 2
            showPop(newHead.x, newHead.y, `吞食僵尸 +${addedScore}!`, '#22c55e')
          }

          // 连击累加
          setCombo((c) => c + 1)
          setComboTimer(3.5)

          const totalAdd = Math.round(addedScore * comboMultiplier)
          setScore((s) => {
            const nextScore = s + totalAdd

            // 关卡目标达标检测
            const mission = MISSIONS[curMissionIdx]
            if (
              mission &&
              nextScore >= mission.targetScore &&
              curSnake.length + growLength >= mission.targetLength
            ) {
              audio.playWin()
              setMissionCompletePopup(`🏆 恭喜达成目标【${mission.title}】！奖励 +${mission.rewardBonus}分`)
              setCurMissionIdx((idx) => Math.min(MISSIONS.length - 1, idx + 1))
              setTimeout(() => setMissionCompletePopup(null), 4500)
              return nextScore + mission.rewardBonus
            }

            return nextScore
          })

          // 补回必定存在的太阳食物
          setFoods((fs) => {
            if (!fs.some((f) => f.type === 'sun')) {
              const cell = getFreeCell([newHead, ...curSnake])
              return [...fs, { id: nextUid(), x: cell.x, y: cell.y, type: 'sun', life: 999 }]
            }
            return fs
          })

          // 生长：不削减尾巴，增加新身体
          return [newHead, ...curSnake]
        }

        // 普通移动：向前一格，尾部弹出一个
        return [newHead, ...curSnake.slice(0, -1)]
      })
    }, intervalMs)

    return () => clearInterval(timer)
  }, [
    isGameOver,
    isPaused,
    freezeTime,
    boostTime,
    magnetTime,
    dashActive,
    comboMultiplier,
    bestScore,
    onBestScore,
    selectedSkin,
    curMissionIdx,
    getFreeCell,
    snake,
    showPop,
  ])

  /* 换装皮肤定义 */
  const skin = SKINS.find((s) => s.id === selectedSkin) ?? SKINS[0]

  /* ───────────────────────────────────────────────────────────
     渲染页面
     ─────────────────────────────────────────────────────────── */
  return (
    <main className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-6 sm:py-8 select-none">
      {/* 顶部工具与模式切换 */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground shadow transition hover:-translate-y-0.5"
        >
          <ArrowLeft className="size-4" />
          返回游戏列表
        </button>

        {/* 标签栏 */}
        <div className="flex rounded-full border border-emerald-400/40 bg-slate-900/80 p-1 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('arcade')}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition sm:text-sm ${
              activeTab === 'arcade'
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Sparkles className="size-4" /> 星愿贪吃蛇
          </button>
          <button
            onClick={() => setActiveTab('skins')}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition sm:text-sm ${
              activeTab === 'skins'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Sun className="size-4" /> 萌宠皮肤工坊
          </button>
        </div>

        <MusicToggle />
      </div>

      {activeTab === 'arcade' ? (
        <section className="relative overflow-hidden rounded-[2.5rem] border-[6px] border-[#2d3a22] bg-[#1a2d21] p-4 shadow-2xl sm:p-6">
          {/* 顶部仪表盘：得分、生命、连击、目标 */}
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-black/35 p-3 text-white backdrop-blur-md">
            {/* 生命值与长度 */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`size-6 transition-transform ${
                      i < lives
                        ? 'fill-rose-500 text-rose-400 scale-100'
                        : 'fill-slate-800 text-slate-700 scale-90'
                    }`}
                  />
                ))}
              </div>
              <span className="rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300">
                长度: {snake.length} 节
              </span>
            </div>

            {/* 连击倍率徽章 */}
            {combo >= 2 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 font-display text-xs font-extrabold text-slate-950 animate-bounce">
                <Flame className="size-4 fill-current text-yellow-200" />
                <span>
                  {combo >= 8 ? 'MAX FEVER!' : `连击 x${combo}`} ({comboMultiplier}x)
                </span>
              </div>
            )}

            {/* 积分与历史最高 */}
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-black/40 px-3 py-1 text-center">
                <span className="block text-[10px] font-bold text-slate-300">当前积分</span>
                <span className="font-display text-lg font-black text-white">{score}</span>
              </div>
              <div className="rounded-xl bg-black/40 px-3 py-1 text-center">
                <span className="block text-[10px] font-bold text-amber-300">历史最高</span>
                <span className="font-display text-lg font-black text-amber-300">
                  {bestScore || '—'}
                </span>
              </div>
            </div>
          </header>

          {/* 关卡目标条 */}
          <div className="mb-3 flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-1.5 text-xs text-slate-200">
            <span className="flex items-center gap-1 font-bold text-amber-300">
              <Award className="size-4 text-amber-400" />
              当前目标：{MISSIONS[curMissionIdx]?.title}
            </span>
            <span className="text-slate-300">
              {MISSIONS[curMissionIdx]?.desc}（需达 {MISSIONS[curMissionIdx]?.targetScore} 分）
            </span>
          </div>

          {/* 通关横幅弹窗 */}
          {missionCompletePopup && (
            <div className="mb-2 text-center animate-bounce">
              <span className="inline-block rounded-full border border-amber-300 bg-amber-500 px-4 py-1 font-display text-xs font-black text-slate-950 shadow-lg sm:text-sm">
                {missionCompletePopup}
              </span>
            </div>
          )}

          {/* ═════════════════════════════════════════════════
              20 × 20 像素草坪棋盘
              ═════════════════════════════════════════════════ */}
          <div className="relative mx-auto aspect-square w-full max-w-[500px] overflow-hidden rounded-3xl border-4 border-[#2d3a22] bg-[#18291e] shadow-2xl">
            {/* 网格底纹 */}
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

            {/* 食物渲染层 */}
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
                    /* 萌系小蛇头部：大眼萌动、可爱腮红 */
                    <div
                      className="relative size-[94%] rounded-full border-[2.6px] border-[#2d3a22] shadow-md flex items-center justify-center"
                      style={{
                        backgroundColor: skin.color,
                        boxShadow: boostTime > 0 ? '0 0 12px #f43f5e' : 'none',
                      }}
                    >
                      {/* 头顶叶子 / 花蕊 */}
                      <span className="absolute -top-1.5 size-2 rounded-full bg-amber-300 border border-[#2d3a22]" />

                      {/* 大眼萌高光 */}
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
                    /* 蛇身节球：带有植物花纹或叶片装点 */
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

            {/* 飘字渲染层 */}
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

            {/* 游戏暂停浮层 */}
            {isPaused && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-xs">
                <div className="rounded-3xl border border-white/20 bg-slate-900/90 px-6 py-4 text-center text-white">
                  <Pause className="size-8 mx-auto text-amber-300 mb-2" />
                  <h3 className="font-display text-xl font-bold">游戏已暂停</h3>
                  <button
                    onClick={() => setIsPaused(false)}
                    className="mt-4 rounded-full bg-primary px-6 py-2 text-xs font-extrabold text-primary-foreground"
                  >
                    继续冒险
                  </button>
                </div>
              </div>
            )}

            {/* 游戏结束结算 */}
            {isGameOver && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
                <div className="w-full max-w-sm rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-[#1c2e22] to-[#0f1d14] p-6 text-center text-white shadow-2xl">
                  <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.6)]">
                    <Trophy className="size-8" />
                  </div>
                  <h3 className="font-display text-2xl font-black text-amber-300">
                    星愿冒险总结
                  </h3>
                  <p className="mt-1 text-xs text-emerald-100">小蛇在草坪上留下了漫天繁星！</p>

                  <div className="my-4 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/40 p-3 text-center">
                    <div>
                      <span className="block text-[10px] text-slate-300">终局长度</span>
                      <span className="font-display text-xl font-black text-emerald-300">
                        {snake.length} 节
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-300">本次得分</span>
                      <span className="font-display text-xl font-black text-amber-300">{score}</span>
                    </div>
                  </div>

                  <button
                    onClick={startNewGame}
                    className="w-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 py-3 font-display text-base font-extrabold text-slate-950 shadow transition hover:-translate-y-0.5 active:translate-y-0"
                  >
                    再来一局！
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ═════════════════════════════════════════════════
              移动端与触控虚拟手柄控制盘
              ═════════════════════════════════════════════════ */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            {/* 暂停与冲刺按钮 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="rounded-xl border border-white/20 bg-slate-800/80 px-3.5 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
              >
                {isPaused ? <Play className="size-4 inline mr-1" /> : <Pause className="size-4 inline mr-1" />}
                {isPaused ? '继续' : '暂停'}
              </button>

              <button
                onMouseDown={() => setDashActive(true)}
                onMouseUp={() => setDashActive(false)}
                onTouchStart={() => setDashActive(true)}
                onTouchEnd={() => setDashActive(false)}
                className={`flex items-center gap-1 rounded-xl border px-4 py-2 font-display text-xs font-black transition ${
                  dashActive || boostTime > 0
                    ? 'border-rose-400 bg-rose-500 text-white scale-105'
                    : 'border-amber-400/50 bg-amber-500/20 text-amber-300'
                }`}
              >
                <Zap className="size-4" /> 冲刺 (按住加速)
              </button>
            </div>

            {/* 十字方向键 */}
            <div className="mx-auto sm:mr-0 grid grid-cols-3 gap-1.5 w-36">
              <div />
              <button
                onClick={() => {
                  if (dir !== 'DOWN') nextDirRef.current = 'UP'
                }}
                className="flex size-11 items-center justify-center rounded-xl bg-slate-800/90 text-white shadow active:bg-amber-500 active:text-slate-950"
              >
                <ArrowUp className="size-5" />
              </button>
              <div />
              <button
                onClick={() => {
                  if (dir !== 'RIGHT') nextDirRef.current = 'LEFT'
                }}
                className="flex size-11 items-center justify-center rounded-xl bg-slate-800/90 text-white shadow active:bg-amber-500 active:text-slate-950"
              >
                <ArrowLeft className="size-5" />
              </button>
              <button
                onClick={() => {
                  if (dir !== 'UP') nextDirRef.current = 'DOWN'
                }}
                className="flex size-11 items-center justify-center rounded-xl bg-slate-800/90 text-white shadow active:bg-amber-500 active:text-slate-950"
              >
                <ArrowDown className="size-5" />
              </button>
              <button
                onClick={() => {
                  if (dir !== 'LEFT') nextDirRef.current = 'RIGHT'
                }}
                className="flex size-11 items-center justify-center rounded-xl bg-slate-800/90 text-white shadow active:bg-amber-500 active:text-slate-950"
              >
                <ArrowRight className="size-5" />
              </button>
            </div>
          </div>
        </section>
      ) : (
        /* ═════════════════════════════════════════════════
           TAB 2: 萌宠皮肤工坊
           ═════════════════════════════════════════════════ */
        <section className="relative overflow-hidden rounded-[2.5rem] border-[6px] border-[#2d3a22] bg-[#16231c] p-6 text-white shadow-2xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/40 bg-purple-500/20 px-3.5 py-1 text-xs font-bold text-purple-200">
              <Sparkles className="size-4" /> 个性化萌宠外观
            </span>
            <h2 className="mt-2 font-display text-3xl font-black text-amber-200">
              星愿萌藤工坊
            </h2>
            <p className="mt-1 text-xs text-emerald-200">
              换上喜欢的植物灵蛇皮肤，在星夜草坪中展开不同寻常的吞食大冒险！
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 text-left">
              {SKINS.map((s) => {
                const isSelected = selectedSkin === s.id
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      audio.playClick()
                      setSelectedSkin(s.id)
                    }}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      isSelected
                        ? 'border-amber-300 bg-amber-400/15 ring-2 ring-amber-300'
                        : 'border-white/15 bg-black/35 hover:border-white/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-display text-base font-bold text-white">{s.name}</h4>
                      {isSelected && (
                        <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black text-slate-950">
                          使用中
                        </span>
                      )}
                    </div>

                    <div className="my-3 flex items-center gap-2">
                      <div
                        className="size-8 rounded-full border-2 border-[#2d3a22] shadow"
                        style={{ backgroundColor: s.color }}
                      />
                      <div
                        className="size-6 rounded-full border-2 border-[#2d3a22] shadow"
                        style={{ backgroundColor: s.bodyColor }}
                      />
                      <div
                        className="size-5 rounded-full border-2 border-[#2d3a22] shadow"
                        style={{ backgroundColor: s.color }}
                      />
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{s.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* 底部小贴士 */}
      <p className="mx-auto mt-4 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
        操作指南：支持方向键或 WASD 移动，长按【空格键】或触控【冲刺】按钮加速奔跑。拥有 3 点生命值保障，撞墙后可折损少量长度继续冒险！
      </p>
    </main>
  )
}
