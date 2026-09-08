'use client'

import { ArrowLeft, Clock3, RotateCcw, Sparkles, Star, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { audio } from '@/lib/game/audio'
import { MusicToggle } from './music-toggle'

const TARGET_DEW = 15
const ROUND_SECONDS = 45

type Stage = 'intro' | 'playing' | 'won' | 'lost'

interface StarlightGardenProps {
  onBack: () => void
  bestScore: number
  onBestScore: (score: number) => void
}

interface Firefly {
  id: number
  left: number
  top: number
  tone: number
  delay: number
}

function createFirefly(id: number): Firefly {
  // 用确定性数字生成位置，避免首次渲染时出现跳动；同时让每一只星萤都有自己的飞行节奏。
  return {
    id,
    left: 8 + ((id * 37 + id * id * 11) % 82),
    top: 21 + ((id * 29 + id * id * 7) % 60),
    tone: id % 3,
    delay: -(id % 5) * 0.43,
  }
}

function makeFireflies(startId = 0) {
  return Array.from({ length: 4 }, (_, index) => createFirefly(startId + index))
}

export function StarlightGarden({ onBack, bestScore, onBestScore }: StarlightGardenProps) {
  const [stage, setStage] = useState<Stage>('intro')
  const [remaining, setRemaining] = useState(ROUND_SECONDS)
  const [collected, setCollected] = useState(0)
  const [score, setScore] = useState(0)
  const [isNewBest, setIsNewBest] = useState(false)
  const [nextFireflyId, setNextFireflyId] = useState(4)
  const [fireflies, setFireflies] = useState<Firefly[]>(() => makeFireflies())

  useEffect(() => {
    audio.startMusic('garden')
    return () => { audio.stopMusic() }
  }, [])

  useEffect(() => {
    if (stage !== 'playing') return
    const timer = window.setInterval(() => {
      setRemaining((seconds) => {
        if (seconds <= 1) {
          setStage('lost')
          return 0
        }
        return seconds - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [stage])

  const progress = Math.round((collected / TARGET_DEW) * 100)
  const fireflyLabel = useMemo(
    () => `星露 ${collected} / ${TARGET_DEW}`,
    [collected],
  )

  const startRound = () => {
    audio.playClick()
    setStage('playing')
    setRemaining(ROUND_SECONDS)
    setCollected(0)
    setScore(0)
    setIsNewBest(false)
    setNextFireflyId(4)
    setFireflies(makeFireflies())
  }

  const collectFirefly = (id: number) => {
    if (stage !== 'playing') return
    audio.playSun()
    const earned = 100 + Math.max(0, remaining - 20) * 2
    const nextCollected = collected + 1
    const nextScore = score + earned
    setScore(nextScore)
    setCollected(nextCollected)
    setFireflies((current) => [...current.filter((firefly) => firefly.id !== id), createFirefly(nextFireflyId)])
    setNextFireflyId((current) => current + 1)
    if (nextCollected >= TARGET_DEW) {
      setStage('won')
      const hasNewBest = nextScore > bestScore
      setIsNewBest(hasNewBest)
      if (hasNewBest) {
        onBestScore(nextScore)
      }
    }
  }

  const isComplete = stage === 'won'

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground transition-transform hover:-translate-y-0.5"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          返回游戏列表
        </button>
        <MusicToggle />
      </div>

      <section className="starlight-shell relative isolate overflow-hidden rounded-[2rem] border-4 border-violet-200/90 bg-[#211849] shadow-[0_22px_60px_rgba(45,28,94,0.32)]">
        <div className="starlight-sky" aria-hidden="true" />
        <div className="starlight-stars" aria-hidden="true">
          {Array.from({ length: 26 }, (_, index) => (
            <i
              key={index}
              className="starlight-star"
              style={{
                left: `${(index * 29 + 7) % 98}%`,
                top: `${4 + ((index * 43 + 13) % 43)}%`,
                animationDelay: `${-(index % 7) * 0.42}s`,
                animationDuration: `${2.4 + (index % 4) * 0.45}s`,
              }}
            />
          ))}
        </div>
        <div className="starlight-moon" aria-hidden="true">
          <span />
        </div>
        <div className="starlight-cloud starlight-cloud-one" aria-hidden="true" />
        <div className="starlight-cloud starlight-cloud-two" aria-hidden="true" />
        <div className="starlight-hill starlight-hill-back" aria-hidden="true" />
        <div className="starlight-hill starlight-hill-front" aria-hidden="true" />
        <div className="starlight-trees" aria-hidden="true">
          <i /><i /><i /><i /><i />
        </div>

        <div className="relative z-10 flex min-h-[650px] flex-col p-4 sm:min-h-[690px] sm:p-7">
          <header className="flex flex-wrap items-start justify-between gap-3 text-white">
            <div>
              <p className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-[#251854]/60 px-3 py-1 text-xs font-bold tracking-wide text-[#ffe8a4] backdrop-blur-sm">
                <Sparkles className="size-3.5" /> 原创童话小剧场
              </p>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#fff7dc] drop-shadow sm:text-4xl">星愿花园</h1>
              <p className="mt-1 text-sm text-[#eee7ff]">帮小芽灵收集星露，唤醒沉睡的月眠花。</p>
            </div>

            <div className="flex gap-2">
              <div className="rounded-2xl border border-white/20 bg-[#251854]/60 px-3 py-2 text-center backdrop-blur-sm">
                <span className="block text-[10px] font-bold tracking-widest text-[#cfc4ff]">最高星光</span>
                <span className="font-display text-lg font-extrabold text-[#ffe89a]">{bestScore || '—'}</span>
              </div>
              <div className="rounded-2xl border border-white/20 bg-[#251854]/60 px-3 py-2 text-center backdrop-blur-sm">
                <span className="block text-[10px] font-bold tracking-widest text-[#cfc4ff]">本局分数</span>
                <span className="font-display text-lg font-extrabold text-white">{score}</span>
              </div>
            </div>
          </header>

          {stage === 'playing' && (
            <div className="starlight-hud mt-5 grid grid-cols-2 gap-3 sm:max-w-md">
              <div className="rounded-2xl border border-white/20 bg-[#2e2462]/75 px-3 py-2.5 backdrop-blur-sm">
                <div className="flex items-center justify-between text-xs font-bold text-[#f6edff]">
                  <span className="inline-flex items-center gap-1"><Sparkles className="size-3.5 text-[#ffe887]" /> {fireflyLabel}</span>
                  <span>{progress}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#201743]">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#a693ff] via-[#f4c4ff] to-[#ffe47e] transition-[width] duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-[#2e2462]/75 px-3 py-2.5 text-center backdrop-blur-sm">
                <p className="inline-flex items-center gap-1 text-xs font-bold text-[#f6edff]"><Clock3 className="size-3.5 text-[#ffe887]" /> 月光倒数</p>
                <p className="font-display text-2xl font-extrabold text-[#fff4bc]">{remaining}<span className="ml-0.5 text-sm">秒</span></p>
              </div>
            </div>
          )}

          <div className="relative flex min-h-0 flex-1 items-end justify-center">
            <div className={`starlight-flower ${isComplete ? 'starlight-flower-awake' : ''}`} aria-hidden="true">
              <span className="starlight-flower-glow" />
              <span className="starlight-petal starlight-petal-a" />
              <span className="starlight-petal starlight-petal-b" />
              <span className="starlight-petal starlight-petal-c" />
              <span className="starlight-petal starlight-petal-d" />
              <span className="starlight-flower-face"><i /><i /><b /></span>
              <span className="starlight-stem" />
              <span className="starlight-leaf starlight-leaf-left" />
              <span className="starlight-leaf starlight-leaf-right" />
            </div>

            {stage === 'playing' && (
              <div className="absolute inset-x-0 bottom-12 top-3 sm:bottom-16" aria-label="星露收集区域">
                {fireflies.map((firefly) => (
                  <button
                    key={firefly.id}
                    type="button"
                    aria-label="收集一团星露"
                    onClick={() => collectFirefly(firefly.id)}
                    className={`starlight-firefly starlight-firefly-${firefly.tone}`}
                    style={{
                      left: `${firefly.left}%`,
                      top: `${firefly.top}%`,
                      animationDelay: `${firefly.delay}s`,
                    }}
                  >
                    <span className="starlight-firefly-wing starlight-firefly-wing-left" />
                    <span className="starlight-firefly-wing starlight-firefly-wing-right" />
                    <span className="starlight-firefly-core">✦</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {stage !== 'playing' && (
            <div className="starlight-dialogue relative mx-auto mt-auto w-full max-w-md rounded-[1.7rem] border border-white/35 bg-[#2a1f5b]/80 p-5 text-center text-white shadow-xl backdrop-blur-md sm:p-6">
              {stage === 'intro' && <IntroContent />}
              {stage === 'won' && <WinContent score={score} isNewBest={isNewBest} />}
              {stage === 'lost' && <LostContent collected={collected} />}
              <button
                type="button"
                onClick={startRound}
                className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#ffe99b] to-[#f6bd63] px-6 py-2.5 font-display text-base font-extrabold text-[#513266] shadow-[0_4px_0_#bf7742] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:shadow-none"
              >
                {stage === 'intro' ? <Sparkles className="size-4" /> : <RotateCcw className="size-4" />}
                {stage === 'intro' ? '开始编织星光' : '再试一次'}
              </button>
            </div>
          )}
        </div>
      </section>

      <p className="mx-auto mt-4 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
        小提示：闪着金光的星露会不断飞来，轻点收集即可。越早完成，得到的星光分数越高。
      </p>
    </main>
  )
}

function IntroContent() {
  return (
    <>
      <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-full bg-[#443578] text-[#ffe98c] shadow-inner"><Star className="size-6 fill-current" /></div>
      <h2 className="font-display text-2xl font-extrabold text-[#fff5cf]">月眠花正在等你</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#eee8ff]">45 秒内收集 <b className="text-[#ffe889]">15 团星露</b>。每一束光都会让花园离苏醒更近一点。</p>
    </>
  )
}

function WinContent({ score, isNewBest }: { score: number; isNewBest: boolean }) {
  return (
    <>
      <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-full bg-[#ffe391] text-[#6f3f72] shadow-inner"><Trophy className="size-6" /></div>
      <h2 className="font-display text-2xl font-extrabold text-[#fff5cf]">花园重新唱起歌啦！</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#eee8ff]">你带回了所有星露，获得 <b className="text-[#ffe889]">{score}</b> 点星光。{isNewBest ? '这是新的最高纪录！' : '月眠花向你眨了眨眼。'}</p>
    </>
  )
}

function LostContent({ collected }: { collected: number }) {
  return (
    <>
      <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-full bg-[#443578] text-[#f1e9ff] shadow-inner"><Sparkles className="size-6" /></div>
      <h2 className="font-display text-2xl font-extrabold text-[#fff5cf]">差一点点就够了</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#eee8ff]">这次收集到 <b className="text-[#ffe889]">{collected} / {TARGET_DEW}</b> 团星露。小芽灵相信你下一次一定能点亮整座花园。</p>
    </>
  )
}
