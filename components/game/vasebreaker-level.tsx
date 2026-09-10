'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Eye, Hammer, RotateCcw, Trophy } from 'lucide-react'
import { PlantSprite, ZombieSprite, PeaSprite, MowerSprite, SunSprite } from './sprites'
import { audio } from '@/lib/game/audio'
import { MusicToggle } from './music-toggle'
import type { PlantId, ZombieId } from '@/lib/game/data'

interface VasebreakerLevelProps {
  onExit: () => void
  onWin: (levelId: number, timeSec: number) => void
}

const ROWS = 4
const COLS = 7

type VaseType = 'green' | 'purple' | 'gold'

interface VaseContent {
  kind: 'plant' | 'zombie'
  plantId?: PlantId
  zombieId?: ZombieId
}

interface VaseTile {
  id: number
  row: number
  col: number
  type: VaseType
  content: VaseContent
  cracked: boolean
  peeked: boolean
}

interface PlantOnBoard {
  id: number
  plantId: PlantId
  row: number
  col: number
  hp: number
  maxHp: number
  shootTimer: number
  fuseTimer?: number
}

interface ZombieOnBoard {
  id: number
  zombieId: ZombieId
  row: number
  x: number
  hp: number
  maxHp: number
  speed: number
  slowTimer: number
  eating: boolean
}

interface PeaOnBoard {
  id: number
  row: number
  x: number
  damage: number
  freeze: boolean
}

interface Mower {
  row: number
  x: number
  running: boolean
  used: boolean
}

/* 罐子 SVG 精灵 */
function VaseSprite({ type, peeked, content }: { type: VaseType; peeked?: boolean; content?: VaseContent }) {
  const isGreen = type === 'green'
  const isGold = type === 'gold'
  const potColor = isGold ? '#eab308' : isGreen ? '#22c55e' : '#a855f7'
  const potDark = isGold ? '#a16207' : isGreen ? '#15803d' : '#7e22ce'
  const potLight = isGold ? '#fef08a' : isGreen ? '#bbf7d0' : '#f3e8ff'

  return (
    <div className="relative size-full select-none">
      <svg viewBox="0 0 100 100" className="size-full drop-shadow-md" aria-hidden="true">
        <ellipse cx="50" cy="88" rx="28" ry="7" fill="#0c1626" opacity="0.45" />
        <g stroke="#2d3a22" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round">
          <path d="M26 40 C22 55 24 74 33 84 C38 88 62 88 67 84 C76 74 78 55 74 40 Z" fill={potColor} />
          <path d="M32 46 C28 58 30 70 36 78" stroke={potLight} strokeWidth="4" fill="none" opacity="0.6" />
          <path d="M34 26 L26 40 L74 40 L66 26 Z" fill={potDark} />
          <ellipse cx="50" cy="25" rx="18" ry="6" fill={potColor} />
          <ellipse cx="50" cy="25" rx="13" ry="3.8" fill="#1b2438" />
          <circle cx="50" cy="62" r="13" fill="#1b2438" opacity="0.25" stroke="none" />
          <path d="M50 51 L53 58 L61 59 L55 64 L57 72 L50 67 L43 72 L45 64 L39 59 L47 58 Z" fill={potLight} stroke="#2d3a22" strokeWidth="1.8" />
        </g>
      </svg>
      {peeked && content && (
        <div className="absolute inset-0 flex items-center justify-center p-2 animate-bounce">
          <div className="size-8 rounded-full bg-slate-950/80 p-1 ring-2 ring-amber-300">
            {content.kind === 'plant' && content.plantId && <PlantSprite id={content.plantId} className="size-full" />}
            {content.kind === 'zombie' && content.zombieId && <ZombieSprite id={content.zombieId} className="size-full" />}
          </div>
        </div>
      )}
    </div>
  )
}

export function VasebreakerLevel({ onExit, onWin }: VasebreakerLevelProps) {
  const [gameState, setGameState] = useState<'playing' | 'cleared' | 'gameover'>('playing')
  const [starlight, setStarlight] = useState(80)
  const [score, setScore] = useState(0)
  const [handCards, setHandCards] = useState<PlantId[]>([])
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null)
  const [shovelActive, setShovelActive] = useState(false)
  const [toolMode, setToolMode] = useState<'none' | 'peek' | 'mallet'>('none')

  const [vases, setVases] = useState<VaseTile[]>([])
  const [plants, setPlants] = useState<PlantOnBoard[]>([])
  const [zombies, setZombies] = useState<ZombieOnBoard[]>([])
  const [peas, setPeas] = useState<PeaOnBoard[]>([])
  const [mowers, setMowers] = useState<Mower[]>([
    { row: 0, x: -0.4, running: false, used: false },
    { row: 1, x: -0.4, running: false, used: false },
    { row: 2, x: -0.4, running: false, used: false },
    { row: 3, x: -0.4, running: false, used: false },
  ])
  const startTimeRef = useRef(Date.now())
  const uidRef = useRef(100)
  const nextUid = () => ++uidRef.current

  /* 初始化星愿宝瓶关卡 */
  const initLevel = useCallback(() => {
    startTimeRef.current = Date.now()
    const newVases: VaseTile[] = []
    let idCounter = 1

    const plantList: PlantId[] = ['peashooter', 'peashooter', 'snowpea', 'repeater', 'wallnut', 'wallnut', 'cherry']
    const zombieList: ZombieId[] = ['normal', 'normal', 'cone', 'cone', 'bucket', 'bucket', 'brute']

    // 4 行 × 4 列 (列 3..6 放置星罐)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 3; c < COLS; c++) {
        const isGold = (r === 1 && c === 4) || (r === 2 && c === 5)
        const isGreen = !isGold && (idCounter % 2 === 0)
        let type: VaseType = isGold ? 'gold' : isGreen ? 'green' : 'purple'
        let content: VaseContent

        if (isGold) {
          content = Math.random() < 0.5 ? { kind: 'plant', plantId: 'cherry' } : { kind: 'zombie', zombieId: 'brute' }
        } else if (isGreen) {
          const p = plantList[Math.floor(Math.random() * plantList.length)]
          content = { kind: 'plant', plantId: p }
        } else {
          const z = zombieList[Math.floor(Math.random() * zombieList.length)]
          content = { kind: 'zombie', zombieId: z }
        }

        newVases.push({
          id: idCounter++,
          row: r,
          col: c,
          type,
          content,
          cracked: false,
          peeked: false,
        })
      }
    }

    setVases(newVases)
    setPlants([])
    setZombies([])
    setPeas([])
    setHandCards([])
    setSelectedCardIdx(null)
    setShovelActive(false)
    setToolMode('none')
    setStarlight(80)
    setScore(0)
    setMowers([
      { row: 0, x: -0.4, running: false, used: false },
      { row: 1, x: -0.4, running: false, used: false },
      { row: 2, x: -0.4, running: false, used: false },
      { row: 3, x: -0.4, running: false, used: false },
    ])
    setGameState('playing')
  }, [])

  useEffect(() => {
    audio.startMusic('night')
    initLevel()
    return () => { audio.stopMusic() }
  }, [initLevel])

  /* 砸罐 */
  const handleVaseClick = (vase: VaseTile) => {
    if (vase.cracked || gameState !== 'playing') return

    if (toolMode === 'peek') {
      if (starlight < 25) return
      audio.playSun()
      setStarlight((s) => s - 25)
      setVases((prev) => prev.map((v) => (v.id === vase.id ? { ...v, peeked: true } : v)))
      setToolMode('none')
      return
    }

    let damageBonus = 0
    if (toolMode === 'mallet') {
      if (starlight < 40) return
      audio.playExplosion()
      setStarlight((s) => s - 40)
      damageBonus = 180
      setToolMode('none')
    } else {
      audio.playDig()
    }

    setVases((prev) => prev.map((v) => (v.id === vase.id ? { ...v, cracked: true } : v)))
    setScore((s) => s + 50)

    if (vase.content.kind === 'plant' && vase.content.plantId) {
      audio.playPlant()
      const pId = vase.content.plantId
      setHandCards((cards) => [...cards, pId])
      setStarlight((s) => s + 20)
    } else if (vase.content.kind === 'zombie' && vase.content.zombieId) {
      audio.playClick()
      const zId = vase.content.zombieId
      let maxHp = 180
      let speed = 0.28
      if (zId === 'cone') { maxHp = 380; speed = 0.26 }
      else if (zId === 'bucket') { maxHp = 620; speed = 0.24 }
      else if (zId === 'brute') { maxHp = 1100; speed = 0.18 }

      setZombies((prev) => [
        ...prev,
        {
          id: nextUid(),
          zombieId: zId,
          row: vase.row,
          x: vase.col + 0.4,
          hp: Math.max(1, maxHp - damageBonus),
          maxHp,
          speed,
          slowTimer: 0,
          eating: false,
        },
      ])
    }
  }

  /* 种植 */
  const handleLawnClick = (r: number, c: number) => {
    if (gameState !== 'playing') return

    if (shovelActive) {
      const existing = plants.find((p) => p.row === r && p.col === c)
      if (existing) {
        audio.playDig()
        setPlants((prev) => prev.filter((p) => p.id !== existing.id))
      }
      setShovelActive(false)
      return
    }

    if (selectedCardIdx === null) return
    const plantId = handCards[selectedCardIdx]
    if (!plantId) return

    const hasPlant = plants.some((p) => p.row === r && p.col === c)
    const hasVase = vases.some((v) => v.row === r && v.col === c && !v.cracked)
    if (hasPlant || hasVase) return

    audio.playPlant()
    setPlants((prev) => [
      ...prev,
      {
        id: nextUid(),
        plantId,
        row: r,
        col: c,
        hp: plantId === 'wallnut' ? 600 : 300,
        maxHp: plantId === 'wallnut' ? 600 : 300,
        shootTimer: 0,
        fuseTimer: plantId === 'cherry' ? 1.2 : undefined,
      },
    ])
    setHandCards((cards) => cards.filter((_, idx) => idx !== selectedCardIdx))
    setSelectedCardIdx(null)
  }

  /* 物理模拟主循环 */
  useEffect(() => {
    if (gameState !== 'playing') return

    let lastTime = performance.now()
    let animId: number

    const tick = (now: number) => {
      const dt = Math.min(0.08, (now - lastTime) / 1000)
      lastTime = now

      // 1. 植物行为
      setPlants((curPlants) => {
        const remaining: PlantOnBoard[] = []
        curPlants.forEach((p) => {
          if (p.fuseTimer !== undefined) {
            const nextFuse = p.fuseTimer - dt
            if (nextFuse <= 0) {
              audio.playExplosion()
              setZombies((curZ) =>
                curZ
                  .map((z) => {
                    if (Math.abs(z.row - p.row) <= 1 && Math.abs(z.x - p.col) <= 1.6) {
                      return { ...z, hp: z.hp - 600 }
                    }
                    return z
                  })
                  .filter((z) => z.hp > 0),
              )
              return
            }
            p.fuseTimer = nextFuse
          }

          if (p.plantId === 'peashooter' || p.plantId === 'snowpea' || p.plantId === 'repeater') {
            p.shootTimer += dt
            const interval = p.plantId === 'repeater' ? 1.3 : 1.6
            const hasEnemyInRow = zombies.some((z) => z.row === p.row && z.x >= p.col)

            if (hasEnemyInRow && p.shootTimer >= interval) {
              p.shootTimer = 0
              if (p.plantId === 'snowpea') {
                audio.playFreezeShoot()
                setPeas((ps) => [...ps, { id: nextUid(), row: p.row, x: p.col + 0.6, damage: 28, freeze: true }])
              } else if (p.plantId === 'repeater') {
                audio.playShoot()
                setPeas((ps) => [
                  ...ps,
                  { id: nextUid(), row: p.row, x: p.col + 0.5, damage: 24, freeze: false },
                  { id: nextUid(), row: p.row, x: p.col + 0.9, damage: 24, freeze: false },
                ])
              } else {
                audio.playShoot()
                setPeas((ps) => [...ps, { id: nextUid(), row: p.row, x: p.col + 0.6, damage: 24, freeze: false }])
              }
            }
          }
          if (p.hp > 0) remaining.push(p)
        })
        return remaining
      })

      // 2. 豌豆行进
      setPeas((curPeas) => {
        const remaining: PeaOnBoard[] = []
        curPeas.forEach((pea) => {
          const nextX = pea.x + 6.8 * dt
          const hitZombie = zombies.find((z) => z.row === pea.row && Math.abs(z.x - nextX) <= 0.35)
          if (hitZombie) {
            setZombies((curZ) =>
              curZ.map((z) => {
                if (z.id === hitZombie.id) {
                  return {
                    ...z,
                    hp: z.hp - pea.damage,
                    slowTimer: pea.freeze ? Math.max(z.slowTimer, 3.0) : z.slowTimer,
                  }
                }
                return z
              }),
            )
          } else if (nextX <= COLS + 0.2) {
            remaining.push({ ...pea, x: nextX })
          }
        })
        return remaining
      })

      // 3. 僵尸移动
      setZombies((curZombies) => {
        const remaining: ZombieOnBoard[] = []
        curZombies.forEach((z) => {
          if (z.hp <= 0) {
            audio.playZombieDie()
            setScore((s) => s + 100)
            setStarlight((s) => s + 15)
            return
          }

          const targetPlant = plants.find((p) => p.row === z.row && Math.abs(p.col - z.x) <= 0.38)
          if (targetPlant) {
            targetPlant.hp -= 25 * dt
            remaining.push({ ...z, eating: true })
            return
          }

          const isSlowed = z.slowTimer > 0
          const curSpeed = (isSlowed ? z.speed * 0.5 : z.speed) * dt
          const nextX = z.x - curSpeed

          if (nextX <= 0.1) {
            const mower = mowers[z.row]
            if (mower && !mower.used) {
              mower.running = true
              mower.used = true
            }
          }

          if (nextX <= -0.7) {
            audio.playLose()
            setGameState('gameover')
            return
          }

          remaining.push({
            ...z,
            x: nextX,
            slowTimer: Math.max(0, z.slowTimer - dt),
            eating: false,
          })
        })
        return remaining
      })

      // 4. 小推车运行
      setMowers((curM) =>
        curM.map((m) => {
          if (!m.running) return m
          const nextX = m.x + 9.5 * dt
          setZombies((curZ) =>
            curZ.filter((z) => {
              if (z.row === m.row && z.x <= nextX + 0.4) {
                audio.playZombieDie()
                return false
              }
              return true
            }),
          )
          if (nextX >= COLS + 1) return { ...m, running: false, x: COLS + 2 }
          return { ...m, x: nextX }
        }),
      )

      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animId)
  }, [gameState, plants, zombies, mowers])

  /* 胜利检测 */
  useEffect(() => {
    if (gameState !== 'playing' || vases.length === 0) return
    const allCracked = vases.every((v) => v.cracked)
    const allDead = zombies.length === 0

    if (allCracked && allDead) {
      audio.playWin()
      const timeSec = Math.round((Date.now() - startTimeRef.current) / 1000)
      setGameState('cleared')
      onWin(16, timeSec)
    }
  }, [vases, zombies.length, gameState, onWin])

  return (
    <main className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-6 sm:py-8 select-none">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground shadow transition hover:-translate-y-0.5"
        >
          <ArrowLeft className="size-4" />
          返回选关
        </button>
        <MusicToggle />
      </div>

      <section className="relative overflow-hidden rounded-[2.5rem] border-[6px] border-[#2d3a22] bg-[#1a2d21] p-4 shadow-2xl sm:p-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-black/35 p-3 text-white backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-amber-300/40 bg-amber-500/20 px-3 py-1 font-display text-sm font-extrabold text-amber-300">
              第 16 关 · 星愿宝瓶 (砸罐寻宝)
            </span>
            <div className="flex items-center gap-1.5">
              <SunSprite className="size-6" />
              <span className="font-display text-lg font-black text-amber-300">{starlight}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                audio.playClick()
                setSelectedCardIdx(null)
                setShovelActive(false)
                setToolMode(toolMode === 'peek' ? 'none' : 'peek')
              }}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                toolMode === 'peek' ? 'border-cyan-400 bg-cyan-500/40 text-cyan-200' : 'border-white/20 bg-slate-800 text-cyan-300'
              }`}
            >
              <Eye className="size-3.5 inline mr-1" />
              透视 (25)
            </button>
            <button
              onClick={() => {
                audio.playClick()
                setSelectedCardIdx(null)
                setShovelActive(false)
                setToolMode(toolMode === 'mallet' ? 'none' : 'mallet')
              }}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                toolMode === 'mallet' ? 'border-amber-400 bg-amber-500/40 text-amber-200' : 'border-white/20 bg-slate-800 text-amber-300'
              }`}
            >
              <Hammer className="size-3.5 inline mr-1" />
              重锤 (40)
            </button>
            <button
              onClick={() => {
                audio.playClick()
                setSelectedCardIdx(null)
                setToolMode('none')
                setShovelActive(!shovelActive)
              }}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                shovelActive ? 'border-rose-400 bg-rose-500/40 text-rose-200' : 'border-white/20 bg-slate-800 text-rose-300'
              }`}
            >
              铲子
            </button>
          </div>
        </header>

        {/* 手持植物卡牌 */}
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-white/15 bg-black/30 p-2.5 backdrop-blur-md overflow-x-auto">
          <span className="text-xs font-bold text-slate-300 shrink-0">手持卡牌:</span>
          {handCards.length === 0 ? (
            <span className="text-xs text-slate-400 italic">点击右侧的星罐砸碎它，收集里面的植物布防！</span>
          ) : (
            handCards.map((pId, idx) => (
              <button
                key={idx}
                onClick={() => {
                  audio.playClick()
                  setShovelActive(false)
                  setSelectedCardIdx(selectedCardIdx === idx ? null : idx)
                }}
                className={`relative flex size-12 shrink-0 items-center justify-center rounded-xl border transition ${
                  selectedCardIdx === idx ? 'border-amber-300 bg-amber-400/30 ring-2 ring-amber-300 scale-105' : 'border-white/20 bg-slate-800'
                }`}
              >
                <PlantSprite id={pId} className="size-10 anim-bob" />
              </button>
            ))
          )}
        </div>

        {/* 4x7 草坪 */}
        <div className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border-4 border-[#2d3a22] bg-[#1a2d21] shadow-2xl">
          {/* 小推车道路 */}
          <div className="absolute inset-y-0 left-0 w-12 bg-soil border-r-2 border-[#2d3a22] z-20">
            {mowers.map((m) => (
              <div
                key={`mower-${m.row}`}
                className="pointer-events-none absolute"
                style={{
                  top: `${(m.row / ROWS) * 100 + 3}%`,
                  left: `${(m.x / COLS) * 100 * 5.5 + 4}px`,
                  width: '42px',
                  opacity: m.used && !m.running ? 0 : 1,
                }}
              >
                <MowerSprite className="size-full drop-shadow" />
              </div>
            ))}
          </div>

          <div className="ml-12 grid grid-rows-4">
            {Array.from({ length: ROWS }, (_, r) => (
              <div key={r} className="grid grid-cols-7 h-20 sm:h-24">
                {Array.from({ length: COLS }, (_, c) => {
                  const isEven = (r + c) % 2 === 0
                  const plant = plants.find((p) => p.row === r && p.col === c)
                  const vase = vases.find((v) => v.row === r && v.col === c && !v.cracked)

                  return (
                    <div
                      key={c}
                      onClick={() => {
                        if (vase) handleVaseClick(vase)
                        else handleLawnClick(r, c)
                      }}
                      className={`relative flex items-center justify-center cursor-pointer border-[0.5px] border-black/10 ${
                        isEven ? 'bg-lawn' : 'bg-lawn-alt'
                      } ${selectedCardIdx !== null && !plant && !vase ? 'hover:bg-amber-300/30' : ''}`}
                    >
                      {vase && (
                        <div className="size-16 sm:size-20 transition-transform hover:scale-105 active:scale-95">
                          <VaseSprite type={vase.type} peeked={vase.peeked} content={vase.content} />
                        </div>
                      )}
                      {plant && (
                        <div className="relative size-14 sm:size-18">
                          <PlantSprite id={plant.plantId} className="size-full anim-bob" />
                          {plant.hp < plant.maxHp && (
                            <div className="absolute -bottom-1 inset-x-2 h-1.5 overflow-hidden rounded-full bg-slate-900/80">
                              <div className="h-full bg-emerald-400" style={{ width: `${(plant.hp / plant.maxHp) * 100}%` }} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="pointer-events-none absolute inset-0 bg-[#16213e]/25" />

          {/* 僵尸渲染 */}
          <div className="pointer-events-none absolute inset-y-0 left-12 right-0 z-30">
            {zombies.map((z) => (
              <div
                key={z.id}
                className="absolute flex flex-col items-center"
                style={{
                  left: `${(z.x / COLS) * 100}%`,
                  top: `${(z.row / ROWS) * 100 + 2}%`,
                  transform: 'translate(-50%, 0)',
                }}
              >
                <div className={`size-16 sm:size-20 ${z.slowTimer > 0 ? 'brightness-125 hue-rotate-180' : ''}`}>
                  <ZombieSprite id={z.zombieId} className="size-full anim-shamble" />
                </div>
                <div className="h-1.5 w-10 overflow-hidden rounded-full bg-slate-950/80">
                  <div className="h-full bg-rose-500" style={{ width: `${(z.hp / z.maxHp) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* 子弹 */}
          <div className="pointer-events-none absolute inset-y-0 left-12 right-0 z-30">
            {peas.map((pea) => (
              <div
                key={pea.id}
                className="absolute size-5 -translate-y-1/2 drop-shadow"
                style={{
                  left: `${(pea.x / COLS) * 100}%`,
                  top: `${(pea.row / ROWS) * 100 + 12}%`,
                }}
              >
                <PeaSprite freeze={pea.freeze} className="size-full" />
              </div>
            ))}
          </div>

          {/* 结算弹窗 */}
          {gameState === 'cleared' && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-sm rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-[#1b2f20] to-[#0f1d13] p-6 text-center text-white shadow-2xl">
                <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.6)]">
                  <Trophy className="size-8" />
                </div>
                <h3 className="font-display text-2xl font-black text-amber-300">星愿宝瓶 · 完美破解！</h3>
                <p className="mt-2 text-xs text-emerald-100">全部罐子破解完毕，恭喜解锁第 16 关回忆勋章！</p>
                <button
                  onClick={onExit}
                  className="mt-5 w-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 py-3 font-display text-base font-extrabold text-slate-950 shadow transition hover:-translate-y-0.5"
                >
                  领取勋章，返回关卡列表
                </button>
              </div>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-sm rounded-3xl border-2 border-rose-400 bg-gradient-to-b from-[#2e1515] to-[#150a0a] p-6 text-center text-white shadow-2xl">
                <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-400/40">
                  <RotateCcw className="size-8" />
                </div>
                <h3 className="font-display text-2xl font-black text-rose-300">防线失守</h3>
                <p className="mt-2 text-xs text-rose-100">僵尸突破了最后的小推车防线！</p>
                <button
                  onClick={initLevel}
                  className="mt-5 w-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 py-3 font-display text-base font-extrabold text-slate-950 shadow transition hover:-translate-y-0.5"
                >
                  再试一次
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
