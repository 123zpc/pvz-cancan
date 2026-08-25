'use client'

/**
 * 七夕限定主题（管理后台可开关）：
 * - QixiDecor：非游戏界面的星空鹊桥装饰层 + 点喜鹊彩蛋（流星雨 / 诗句 / 心星飞散）
 * - QixiBadge：「七夕限定」金色流光徽章
 * - QixiGreeting：每日首次进入的七夕祝福卡
 *
 * 全部为纯 CSS/SVG 动画，颜色与站内 oklch 体系一致，不引入任何图片资源。
 */

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/* ── 基础图形 ── */

/** 四角星光 */
function Star4({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
      <path d="M12 1c.9 5.6 4.4 9.1 10 10-5.6.9-9.1 4.4-10 10-.9-5.6-4.4-9.1-10-10 5.6-.9 9.1-4.4 10-10z" />
    </svg>
  )
}

/** 心形（Material Design 经典轮廓：两瓣对称、凹陷居中，小尺寸下也端正清晰） */
export const HEART_PATH = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'

function Heart({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
      <path d={HEART_PATH} />
    </svg>
  )
}

/** 玫瑰花瓣 */
function Petal({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
      <path d="M12 1c5.5 5.5 6.5 12 0 22-6.5-10-5.5-16.5 0-22z" />
    </svg>
  )
}

/** 喜鹊（长尾、朝右飞姿） */
function Magpie({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 64 40" fill="currentColor" className={className} style={style} aria-hidden="true">
      {/* 长尾 */}
      <path d="M38 17 62 8 57 15 63 17 55 22 38 24Z" />
      {/* 身体 */}
      <ellipse cx="30" cy="20" rx="13" ry="7.5" />
      {/* 头 */}
      <circle cx="15" cy="15" r="5.5" />
      {/* 喙 */}
      <path d="M10 13.5 3 15.5 10 17Z" />
      {/* 展开的上翼 */}
      <path d="M24 15Q27 2 43 3 32 8 30 17Z" opacity=".92" />
      {/* 腹部留白 */}
      <ellipse cx="31" cy="23" rx="8" ry="3.2" fill="#fff" opacity=".22" />
    </svg>
  )
}

/** 新月（lucide moon 路线，弧线更优雅） */
function CrescentMoon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}

/* ── 常量（固定值，避免 SSR 水合不一致） ── */

/** 横幅星群 */
const BAND_STARS = [
  { left: 4, top: 14, size: 8, dur: 2.2, delay: 0.4, min: 0.2 },
  { left: 13, top: 52, size: 6, dur: 3.1, delay: 1.2, min: 0.15 },
  { left: 22, top: 26, size: 10, dur: 2.6, delay: 0.8, min: 0.25 },
  { left: 31, top: 66, size: 6, dur: 3.4, delay: 2.1, min: 0.12 },
  { left: 39, top: 18, size: 7, dur: 2.8, delay: 0.2, min: 0.2 },
  { left: 47, top: 58, size: 9, dur: 3.2, delay: 1.6, min: 0.18 },
  { left: 56, top: 30, size: 6, dur: 2.4, delay: 2.6, min: 0.15 },
  { left: 64, top: 12, size: 9, dur: 2.9, delay: 0.9, min: 0.22 },
  { left: 72, top: 62, size: 6, dur: 3.6, delay: 1.9, min: 0.12 },
  { left: 81, top: 24, size: 10, dur: 2.5, delay: 0.5, min: 0.25 },
  { left: 89, top: 56, size: 7, dur: 3.0, delay: 2.3, min: 0.16 },
  { left: 95, top: 16, size: 8, dur: 2.7, delay: 1.4, min: 0.2 },
]

/** 鹊桥：9 只喜鹊沿抛物线排列 */
const BRIDGE_MAGPIES = Array.from({ length: 9 }, (_, i) => {
  const t = (i + 1) / 10
  const arc = 4 * t * (1 - t) // 0..1，中心最高
  return {
    left: t * 100,
    top: 112 - 70 * arc, // 横幅内弧线位置（px）
    rotate: (1 - 2 * t) * 20,
    scale: 0.8 + 0.28 * arc,
  }
})

/** 飘落的花瓣与星屑 */
const FLOATING_DECOR = [
  { left: 6, size: 13, delay: 0, dur: 12, sway: 26, op: 0.5, kind: 'petal' },
  { left: 15, size: 10, delay: 3.2, dur: 14, sway: -20, op: 0.45, kind: 'star' },
  { left: 26, size: 15, delay: 1.4, dur: 11, sway: 18, op: 0.5, kind: 'heart' },
  { left: 38, size: 11, delay: 4.6, dur: 13, sway: -24, op: 0.4, kind: 'petal' },
  { left: 49, size: 9, delay: 2.2, dur: 15, sway: 16, op: 0.45, kind: 'star' },
  { left: 60, size: 14, delay: 0.8, dur: 12.5, sway: -18, op: 0.5, kind: 'heart' },
  { left: 71, size: 12, delay: 5.1, dur: 11.5, sway: 22, op: 0.45, kind: 'petal' },
  { left: 82, size: 10, delay: 2.8, dur: 14.5, sway: -16, op: 0.4, kind: 'star' },
  { left: 92, size: 13, delay: 1.9, dur: 12.8, sway: 20, op: 0.5, kind: 'heart' },
]

/** 彩蛋诗句（顺序轮换） */
const QUOTES = [
  '金风玉露一相逢，便胜却人间无数',
  '两情若是久长时，又岂在朝朝暮暮',
  '迢迢牵牛星，皎皎河汉女',
  '愿我如星君如月，夜夜流光相皎洁',
  '天上鹊桥相会，人间与你相守',
  '星河滚烫，你是人间理想',
  '所爱隔山海，山海皆可平',
  '今夜星如雨，思念落满桥',
]

/** 彩蛋流星雨路径（dy = |dx| × tan32° ≈ 0.625，与光条倾角严格一致，头前尾后） */
const RAIN_METEORS = [
  { top: '10%', right: '12%', dx: '-46vw', dy: '28.8vw', delay: 0 },
  { top: '4%', right: '34%', dx: '-38vw', dy: '23.8vw', delay: 0.14 },
  { top: '16%', right: '4%', dx: '-42vw', dy: '26.3vw', delay: 0.28 },
  { top: '6%', right: '22%', dx: '-44vw', dy: '27.5vw', delay: 0.42 },
  { top: '13%', right: '42%', dx: '-36vw', dy: '22.5vw', delay: 0.55 },
]

/** 彩蛋爆散粒子 */
const BURST_PARTICLES = Array.from({ length: 10 }, (_, i) => {
  const angle = (Math.PI * 2 * i) / 10
  const radius = 44 + (i % 3) * 18
  return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius, kind: i % 2 === 0 ? 'heart' : 'star' }
})

/* ── 彩蛋特效 ── */

interface EggFx {
  id: number
  x: number
  y: number
  quote: string
}

function EggEffects({ fx }: { fx: EggFx }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" aria-hidden="true">
      {/* 流星雨（一次性整段划过，延迟与角度各异） */}
      {RAIN_METEORS.map((m, i) => (
        <i
          key={`rain-${fx.id}-${i}`}
          className="qixi-meteor-burst absolute h-[2px] w-28 rounded-full opacity-0"
          style={
            {
              top: m.top,
              right: m.right,
              '--mx': m.dx,
              '--my': m.dy,
              '--m-delay': `${m.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
      {/* 心与星屑爆散 */}
      {BURST_PARTICLES.map((p, i) => (
        <span
          key={`burst-${fx.id}-${i}`}
          className="qixi-burst absolute"
          style={{ left: fx.x, top: fx.y, '--dx': `${p.dx}px`, '--dy': `${p.dy}px` } as React.CSSProperties}
        >
          {p.kind === 'heart' ? (
            <Heart className="size-4 text-rose-400/90" />
          ) : (
            <Star4 className="size-3.5 text-amber-400/90" />
          )}
        </span>
      ))}
      {/* 诗句卡 */}
      <div
        key={`quote-${fx.id}`}
        className="qixi-quote absolute left-1/2 top-[30%] max-w-[86vw] whitespace-nowrap rounded-full border border-amber-200/30 bg-[oklch(0.27_0.09_286_/_0.92)] px-6 py-3 text-center font-display text-base font-bold tracking-wide text-[oklch(0.9_0.12_95)] shadow-xl backdrop-blur-sm sm:text-lg"
      >
        {fx.quote}
      </div>
    </div>
  )
}

/* ── 装饰层 ── */

export function QixiDecor() {
  const [fx, setFx] = useState<EggFx | null>(null)
  const quoteIdx = useRef(0)
  const lastClick = useRef(0)

  // 特效自动清理
  useEffect(() => {
    if (!fx) return
    const timer = setTimeout(() => setFx(null), 2800)
    return () => clearTimeout(timer)
  }, [fx])

  /** 点喜鹊：流星雨 + 诗句 + 心星飞散 */
  const triggerEgg = (clientX: number, clientY: number) => {
    const now = Date.now()
    if (now - lastClick.current < 700) return
    lastClick.current = now
    quoteIdx.current = (quoteIdx.current + 1) % QUOTES.length
    setFx({ id: now, x: clientX, y: clientY, quote: QUOTES[quoteIdx.current] })
  }

  return (
    <>
      {/* 星空横幅：银河、鹊桥、双星、流星（天幕罩在页面顶部，不被各页背景遮挡，pointer-events-none 不挡操作） */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[6] h-32 overflow-hidden"
        style={{
          background:
            'linear-gradient(to bottom, oklch(0.3 0.1 285 / 0.5), oklch(0.33 0.1 300 / 0.22) 55%, transparent)',
        }}
        aria-hidden="true"
      >
        {/* 状态栏安全区玫瑰色遮罩：避免横幅深色背景污染 iOS 状态栏区域，让它显示与 body 一致的玫瑰色 */}
        <div
          className="absolute inset-x-0 top-0 z-[7]"
          style={{ height: 'env(safe-area-inset-top, 0px)', backgroundColor: 'oklch(0.965 0.022 350)' }}
          aria-hidden="true"
        />
        {/* 星群 */}
        {BAND_STARS.map((s, i) => (
          <Star4
            key={i}
            className="qixi-twinkle absolute text-[oklch(0.88_0.14_95)]"
            style={
              {
                left: `${s.left}%`,
                top: `${s.top}px`,
                width: s.size,
                '--tw-dur': `${s.dur}s`,
                '--tw-min': s.min,
                animationDelay: `${s.delay}s`,
              } as React.CSSProperties
            }
          />
        ))}

        {/* 新月 */}
        <CrescentMoon
          className="absolute right-[26%] top-2 size-6 text-[oklch(0.9_0.12_95_/_0.85)]"
        />

        {/* 织女星（左）与牛郎星（右） */}
        <Star4
          className="qixi-glow absolute left-[9%] top-[34px] size-4 text-[oklch(0.88_0.15_92)]"
        />
        <Star4
          className="qixi-glow absolute right-[9%] top-[34px] size-4 text-[oklch(0.88_0.15_92)]"
          style={{ animationDelay: '1.6s' }}
        />

        {/* 鹊桥（中间最高处的那只是可点的彩蛋入口，单独渲染在内容之上） */}
        {BRIDGE_MAGPIES.map((m, i) => {
          const isCenter = i === 4
          if (isCenter) return null
          return (
            <Magpie
              key={i}
              className="absolute text-[oklch(0.93_0.02_280_/_0.85)]"
              style={{
                left: `${m.left}%`,
                top: `${m.top}px`,
                width: `${34 * m.scale}px`,
                transform: `translateX(-50%) rotate(${m.rotate}deg)`,
                opacity: 0.8 + 0.2 * (1 - Math.abs(4 - i) / 4),
              }}
            />
          )
        })}

        {/* 常驻流星（低频，斜划天幕；dy = |dx|×tan32°，行程收在天幕内） */}
        <i
          className="qixi-meteor absolute right-[-3%] top-[18%] h-[2px] w-24 rounded-full"
          style={
            {
              '--mx': '-160px',
              '--my': '100px',
              '--m-dur': '9s',
              '--m-delay': '2s',
            } as React.CSSProperties
          }
        />
        <i
          className="qixi-meteor absolute right-[22%] top-[8%] h-[2px] w-20 rounded-full"
          style={
            {
              '--mx': '-140px',
              '--my': '88px',
              '--m-dur': '11s',
              '--m-delay': '6.5s',
            } as React.CSSProperties
          }
        />
      </div>

      {/* 飘落花瓣 / 星屑 / 小心心（置于内容卡片之上，pointer-events-none 不挡操作） */}
      <div className="pointer-events-none fixed inset-0 z-[5] overflow-hidden" aria-hidden="true">
        {FLOATING_DECOR.map((d, i) => (
          <span
            key={i}
            className="qixi-petal absolute bottom-[-24px]"
            style={
              {
                left: `${d.left}%`,
                '--p-dur': `${d.dur}s`,
                '--p-delay': `${d.delay}s`,
                '--p-sway': `${d.sway}px`,
                '--p-op': d.op,
              } as React.CSSProperties
            }
          >
            {d.kind === 'petal' && <Petal className="text-rose-300/70" style={{ width: d.size }} />}
            {d.kind === 'star' && <Star4 className="text-amber-300/70" style={{ width: d.size }} />}
            {d.kind === 'heart' && <Heart className="text-rose-300/50" style={{ width: d.size }} />}
          </span>
        ))}
      </div>

      {/* 彩蛋入口 1：鹊桥中央的喜鹊（与桥顶弧线对齐，内容之上可点击） */}
      <button
        type="button"
        onClick={(e) => triggerEgg(e.clientX, e.clientY)}
        className="fixed left-1/2 top-[42px] z-20 cursor-pointer transition-transform hover:scale-110"
        style={{ transform: 'translateX(-50%)' }}
        aria-label="喜鹊传情，点一点有惊喜"
        title="喜鹊传情"
      >
        <Magpie className="w-[40px] text-[oklch(0.93_0.02_280)] drop-shadow-sm" />
      </button>

      {/* 彩蛋入口 2：横渡银河的喜鹊（每 30 秒飞过一次，追上它也有惊喜） */}
      <button
        type="button"
        onClick={(e) => triggerEgg(e.clientX, e.clientY)}
        className="qixi-fly pointer-events-auto fixed left-0 top-[34%] z-20 cursor-pointer"
        style={{ '--f-dur': '30s', '--f-delay': '5s' } as React.CSSProperties}
        aria-label="横渡银河的喜鹊"
        title="横渡银河的喜鹊"
      >
        <Magpie className="w-11 text-[oklch(0.42_0.1_285_/_0.55)]" />
      </button>

      {/* 彩蛋特效 */}
      {fx && <EggEffects fx={fx} />}
    </>
  )
}

/* ── 七夕限定徽章 ── */

export function QixiBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'qixi-shimmer inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-display text-[11px] font-extrabold text-[oklch(0.33_0.1_286)] shadow-sm',
        className,
      )}
    >
      <Star4 className="size-2.5 text-[oklch(0.5_0.12_286)]" />
      七夕限定
    </span>
  )
}

/* ── 每日七夕祝福卡 ── */

const GREET_KEY = 'pvz-qixi-greet'

function todayStr(): string {
  try {
    return new Date().toLocaleDateString('sv') // YYYY-MM-DD（本地时区）
  } catch {
    return ''
  }
}

export function QixiGreeting({ userName }: { userName?: string }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(GREET_KEY) !== todayStr()) setShow(true)
    } catch {
      setShow(true)
    }
  }, [])

  const close = () => {
    try {
      localStorage.setItem(GREET_KEY, todayStr())
    } catch {
      /* 忽略 */
    }
    setShow(false)
  }

  if (!show) return null
  const name = userName || '灿灿'

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-foreground/45 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="七夕祝福"
      onClick={close}
    >
      <div
        className="qixi-card-in relative w-full max-w-sm overflow-hidden rounded-3xl border border-amber-200/25 shadow-2xl"
        style={{
          background: 'linear-gradient(160deg, oklch(0.25 0.1 286), oklch(0.33 0.11 300) 70%, oklch(0.38 0.12 330))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 卡内星空 */}
        <div className="relative h-32" aria-hidden="true">
          {BAND_STARS.slice(0, 8).map((s, i) => (
            <Star4
              key={i}
              className="qixi-twinkle absolute text-[oklch(0.88_0.14_95)]"
              style={
                {
                  left: `${s.left + 4}%`,
                  top: `${s.top / 1.6}px`,
                  width: s.size - 2,
                  '--tw-dur': `${s.dur}s`,
                  '--tw-min': s.min,
                  animationDelay: `${s.delay}s`,
                } as React.CSSProperties
              }
            />
          ))}
          <CrescentMoon className="absolute right-5 top-3 size-5 text-[oklch(0.9_0.12_95_/_0.9)]" />
          {/* 双星相会 */}
          <Star4 className="qixi-glow absolute left-[18%] top-[52px] size-3.5 text-[oklch(0.88_0.15_92)]" />
          <Star4
            className="qixi-glow absolute right-[18%] top-[52px] size-3.5 text-[oklch(0.88_0.15_92)]"
            style={{ animationDelay: '1.4s' }}
          />
          {/* 小鹊桥 */}
          <svg viewBox="0 0 200 40" className="absolute inset-x-8 bottom-2 h-8 w-[calc(100%-4rem)] text-[oklch(0.93_0.02_280_/_0.9)]" fill="currentColor">
            {Array.from({ length: 7 }, (_, i) => {
              const t = (i + 0.5) / 7
              const arc = 4 * t * (1 - t)
              const x = 10 + t * 180
              const y = 30 - 18 * arc
              return <circle key={i} cx={x} cy={y} r={2.6} opacity={0.5 + 0.5 * arc} />
            })}
          </svg>
        </div>

        {/* 文案 */}
        <div className="px-7 pb-7 text-center">
          <p className="font-display text-xs font-bold tracking-[0.3em] text-[oklch(0.85_0.13_95_/_0.75)]">七夕 · 鹊桥相会</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold text-[oklch(0.92_0.12_95)] drop-shadow">
            星河为证
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[oklch(0.88_0.04_350)]">
            银河迢迢，今夜鹊桥相会。
            <br />
            愿与灿灿在一起的每一天，
            <br />
            都像今夜的星光一样温柔闪亮。
          </p>

          {/* 红线牵心 */}
          <svg viewBox="0 0 160 28" className="mx-auto mt-5 h-7 w-44" aria-hidden="true">
            <path
              d="M16 16 C 52 4, 108 28, 144 14"
              fill="none"
              stroke="oklch(0.62 0.2 15)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeDasharray="1 5"
            />
            <path
              transform="translate(3 7) scale(0.72)"
              fill="oklch(0.66 0.19 15)"
              d={HEART_PATH}
            />
            <path
              transform="translate(135 7) scale(0.72)"
              fill="oklch(0.66 0.19 15)"
              d={HEART_PATH}
            />
          </svg>

          <button
            type="button"
            onClick={close}
            className="qixi-shimmer mt-2 w-full rounded-full py-3 font-display text-base font-extrabold text-[oklch(0.33_0.1_286)] shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            愿岁岁常相见
          </button>
        </div>
      </div>
    </div>
  )
}
