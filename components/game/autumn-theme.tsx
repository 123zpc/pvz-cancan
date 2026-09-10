'use client'

import { useEffect, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { audio } from '@/lib/game/audio'

/* ── 枫叶 SVG ── */
function MapleLeaf({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
      <path d="M12 2l1.2 3.8 3.5-.8-1.5 3.3 3.8 1.2-3.1 2.2 1.8 3.3-3.6-.8-1.1 3.8h-2l-1.1-3.8-3.6.8 1.8-3.3-3.1-2.2 3.8-1.2-1.5-3.3 3.5.8L12 2z" />
    </svg>
  )
}

/* ── 银杏叶 SVG ── */
function GinkgoLeaf({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
      <path d="M12 4c-4.4 0-8 3.6-8 8 0 2.2 1.1 4.2 2.8 5.5l.2.2c1.4-1.8 3.2-3.2 5-3.7v6h2v-6c1.8.5 3.6 1.9 5 3.7l.2-.2c1.7-1.3 2.8-3.3 2.8-5.5 0-4.4-3.6-8-8-8z" />
    </svg>
  )
}

/* ── 固定落叶配置（避免 SSR 水合不一致） ── */
const AUTUMN_LEAVES = [
  { left: 5, size: 22, dur: 9.2, delay: 0.2, drift: 50, rot: 280, color: '#ea580c' }, // 暖橙
  { left: 14, size: 18, dur: 11.5, delay: 2.4, drift: -40, rot: -210, color: '#f59e0b' }, // 琥珀金
  { left: 24, size: 24, dur: 8.8, delay: 1.1, drift: 70, rot: 340, color: '#dc2626' }, // 枫红
  { left: 35, size: 20, dur: 12.0, delay: 3.5, drift: -60, rot: -180, color: '#d97706' }, // 暖金
  { left: 45, size: 16, dur: 10.4, delay: 0.8, drift: 45, rot: 310, color: '#e11d48' }, // 绯红
  { left: 56, size: 23, dur: 9.6, delay: 2.9, drift: -55, rot: -290, color: '#b45309' }, // 焦糖橙
  { left: 67, size: 19, dur: 11.2, delay: 1.6, drift: 65, rot: 240, color: '#f97316' }, // 亮橙
  { left: 76, size: 21, dur: 8.5, delay: 3.8, drift: -45, rot: -320, color: '#ef4444' }, // 枫叶红
  { left: 86, size: 17, dur: 12.5, delay: 0.5, drift: 50, rot: 270, color: '#fbbf24' }, // 金银杏
  { left: 94, size: 20, dur: 10.0, delay: 2.1, drift: -50, rot: -220, color: '#ea580c' }, // 暖橙
]

const AUTUMN_POEMS = [
  { text: '自古逢秋悲寂寥，我言秋日胜春朝。', author: '刘禹锡 ·《秋词》' },
  { text: '落霞与孤鹜齐飞，秋水共长天一色。', author: '王勃 ·《滕王阁序》' },
  { text: '山明水净夜来霜，数树深红出浅黄。', author: '刘禹锡 ·《秋词二首》' },
  { text: '停车坐爱枫林晚，霜叶红于二月花。', author: '杜牧 ·《山行》' },
  { text: '春华秋实，岁岁丰登，愿灿灿收获满仓的欢笑！', author: '金秋寄语' },
  { text: '满载金秋阳光，愿所遇皆所求，所求皆所愿！', author: '温馨祝愿' },
]

/** 金秋落叶全站装饰层 */
export function AutumnDecor() {
  const [poem, setPoem] = useState<{ text: string; author: string } | null>(null)
  const [poemTimer, setPoemTimer] = useState<number | null>(null)

  const handlePumpkinClick = () => {
    audio.playSun()
    const nextPoem = AUTUMN_POEMS[Math.floor(Math.random() * AUTUMN_POEMS.length)]
    setPoem(nextPoem)
    if (poemTimer) clearTimeout(poemTimer)
    const t = window.setTimeout(() => setPoem(null), 3800)
    setPoemTimer(t)
  }

  return (
    <>
      {/* 飘落枫叶层（pointer-events-none，不影响点击） */}
      <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
        {AUTUMN_LEAVES.map((leaf, i) => (
          <div
            key={i}
            className="autumn-leaf absolute opacity-80"
            style={
              {
                left: `${leaf.left}%`,
                top: '-30px',
                width: `${leaf.size}px`,
                height: `${leaf.size}px`,
                color: leaf.color,
                '--leaf-dur': `${leaf.dur}s`,
                '--leaf-x-drift': `${leaf.drift}px`,
                '--leaf-rot': `${leaf.rot}deg`,
                animationDelay: `${leaf.delay}s`,
              } as React.CSSProperties
            }
          >
            {i % 3 === 0 ? (
              <GinkgoLeaf className="size-full drop-shadow-sm" />
            ) : (
              <MapleLeaf className="size-full drop-shadow-sm" />
            )}
          </div>
        ))}
      </div>

      {/* 右下角金秋南瓜彩蛋按钮 */}
      <div className="fixed bottom-3 right-3 z-30 flex flex-col items-end">
        {poem && (
          <div className="mb-2 max-w-xs rounded-2xl border-2 border-amber-400/50 bg-amber-950/85 p-3 text-white shadow-xl backdrop-blur-md animate-bounce">
            <p className="font-serif text-sm font-bold text-amber-200 leading-snug">
              “{poem.text}”
            </p>
            <p className="mt-1 text-right text-[10px] text-amber-300/80">
              —— {poem.author}
            </p>
          </div>
        )}

        <button
          onClick={handlePumpkinClick}
          className="group flex items-center gap-1.5 rounded-full border-2 border-amber-400/60 bg-gradient-to-r from-amber-500/90 to-orange-500/90 px-3 py-1.5 font-display text-xs font-black text-white shadow-lg backdrop-blur transition hover:scale-105 active:scale-95"
          title="点击收获秋日诗意"
        >
          <span className="text-base group-hover:rotate-12 transition-transform">🎃</span>
          <span>金秋丰收</span>
          <Sparkles className="size-3 text-amber-200" />
        </button>
      </div>
    </>
  )
}

const AUTUMN_GREETING_KEY = 'pvz-autumn-greeting-date'

/** 金秋每日首次进入祝福卡 */
export function AutumnGreeting({ userName }: { userName?: string }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const last = localStorage.getItem(AUTUMN_GREETING_KEY)
      if (last !== today) {
        setShow(true)
        localStorage.setItem(AUTUMN_GREETING_KEY, today)
      }
    } catch {
      /* 忽略 */
    }
  }, [])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-[#3a200f] via-[#24140a] to-[#160c06] p-6 text-white shadow-2xl">
        <button
          onClick={() => setShow(false)}
          className="absolute right-3 top-3 rounded-full bg-white/10 p-1 text-white/70 hover:bg-white/20 active:scale-95"
          aria-label="关闭"
        >
          <X className="size-4" />
        </button>

        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-3xl shadow-[0_0_24px_rgba(245,158,11,0.5)]">
          🍁
        </div>

        <h3 className="text-center font-display text-xl font-black text-amber-200">
          金秋丰收献礼
        </h3>
        <p className="mt-1 text-center text-xs text-amber-100/70">
          春华秋实 · 岁岁有期
        </p>

        <div className="my-4 rounded-2xl border border-amber-400/20 bg-black/30 p-4 text-xs leading-relaxed text-amber-50">
          <p className="font-bold text-amber-300 mb-1">
            亲爱的 {userName || '灿灿'}：
          </p>
          <p>
            金风送爽，稻菽千重。草坪上换上了暖金枫叶的华服，愿这个秋天满载甜蜜与硕果，每一场冒险都洋溢着喜悦与收获！
          </p>
        </div>

        <button
          onClick={() => setShow(false)}
          className="w-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 py-2.5 font-display text-sm font-extrabold text-slate-950 shadow transition hover:brightness-110 active:scale-98"
        >
          收获秋日祝福
        </button>
      </div>
    </div>
  )
}
