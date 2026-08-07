import type { PlantId, ZombieId } from '@/lib/game/data'

type SpriteProps = { className?: string }

/* 卡通描边墨色 */
const INK = '#2d3a22'
const INK_Z = '#39422f'

const P = {
  stem: '#5ab03d',
  stemDark: '#3f8a29',
  leaf: '#7ed957',
  body: '#8fe05c',
  bodyLight: '#b6f08d',
  bodyDark: '#5fb238',
  petal: '#ffd23f',
  petalDark: '#ffb01f',
  face: '#a4682f',
  faceLight: '#c07f3d',
  nut: '#d99354',
  nutLight: '#efb87e',
  cherry: '#f4555c',
  cherryLight: '#ff8a8f',
  ice: '#9fe2f5',
  iceLight: '#cff3fc',
  blush: '#ff8fa0',
  white: '#ffffff',
}

const Z = {
  skin: '#b6cfa4',
  skinLight: '#d2e5c4',
  shirt: '#9a9ada',
  shirtDark: '#7273bd',
  cone: '#ff9440',
  coneLight: '#ffb877',
  bucket: '#c6ccd6',
  bucketLight: '#e6eaf0',
  eye: '#fffdf5',
  pupil: '#2b2b2b',
  mouth: '#7a4148',
}

/** 大眼睛 + 高光，卡通感的关键 */
function BigEyes({
  cx1,
  cx2,
  cy,
  r = 7,
  ink = INK,
}: {
  cx1: number
  cx2: number
  cy: number
  r?: number
  ink?: string
}) {
  return (
    <g stroke={ink} strokeWidth="2.6">
      <circle cx={cx1} cy={cy} r={r} fill={P.white} />
      <circle cx={cx2} cy={cy} r={r} fill={P.white} />
      <circle cx={cx1 + r * 0.22} cy={cy + r * 0.18} r={r * 0.52} fill="#2b2b2b" stroke="none" />
      <circle cx={cx2 + r * 0.22} cy={cy + r * 0.18} r={r * 0.52} fill="#2b2b2b" stroke="none" />
      <circle cx={cx1 + r * 0.02} cy={cy - r * 0.24} r={r * 0.2} fill={P.white} stroke="none" />
      <circle cx={cx2 + r * 0.02} cy={cy - r * 0.24} r={r * 0.2} fill={P.white} stroke="none" />
    </g>
  )
}

function Blush({ cx1, cx2, cy, rx = 5 }: { cx1: number; cx2: number; cy: number; rx?: number }) {
  return (
    <g fill={P.blush} opacity="0.55" stroke="none">
      <ellipse cx={cx1} cy={cy} rx={rx} ry={rx * 0.62} />
      <ellipse cx={cx2} cy={cy} rx={rx} ry={rx * 0.62} />
    </g>
  )
}

function Sunflower({ className }: SpriteProps) {
  const petals = Array.from({ length: 10 }, (_, i) => i * 36)
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g stroke={INK} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 95 C45 76 47 62 50 54" stroke={P.stem} strokeWidth="9" fill="none" />
        <path d="M50 95 C45 76 47 62 50 54" stroke={INK} strokeWidth="3" fill="none" opacity="0.18" />
        <path d="M46 76 C34 70 24 72 20 78 C26 84 38 85 46 79 Z" fill={P.leaf} />
        <path d="M53 84 C64 79 74 81 78 86 C72 92 61 92 53 87 Z" fill={P.leaf} />
        {petals.map((deg) => (
          <ellipse
            key={deg}
            cx="50"
            cy="19"
            rx="9"
            ry="14"
            fill={P.petal}
            transform={`rotate(${deg} 50 43)`}
          />
        ))}
        {petals.map((deg) => (
          <ellipse
            key={`hl-${deg}`}
            cx="50"
            cy="14"
            rx="4"
            ry="5"
            fill="#ffe680"
            stroke="none"
            transform={`rotate(${deg} 50 43)`}
          />
        ))}
        <circle cx="50" cy="43" r="19" fill={P.face} />
        <ellipse cx="42" cy="33" rx="8" ry="5" fill={P.faceLight} stroke="none" transform="rotate(-26 42 33)" />
        <BigEyes cx1={43} cx2={57} cy={40} r={6.4} />
        <Blush cx1={35} cx2={65} cy={50} rx={4.6} />
        <path d="M43 51 Q50 59 57 51" stroke={INK} strokeWidth="3" fill="none" />
      </g>
    </svg>
  )
}

function Shooter({ className, cold, twin }: SpriteProps & { cold?: boolean; twin?: boolean }) {
  const main = cold ? P.ice : P.body
  const light = cold ? P.iceLight : P.bodyLight
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g stroke={INK} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M45 96 C40 78 43 64 46 57" stroke={P.stem} strokeWidth="9" fill="none" />
        <path d="M42 78 C30 72 20 74 16 80 C22 86 34 87 42 81 Z" fill={P.leaf} />
        <path d="M50 88 C61 83 71 85 75 90 C69 96 58 96 50 91 Z" fill={P.leaf} />
        {twin && <rect x="58" y="47" width="30" height="15" rx="7.5" fill={main} />}
        <rect x="60" y="29" width="34" height="17" rx="8.5" fill={main} />
        <circle cx="45" cy="39" r="24" fill={main} />
        <ellipse cx="37" cy="30" rx="9" ry="6" fill={light} stroke="none" transform="rotate(-24 37 30)" />
        <BigEyes cx1={40} cx2={55} cy={35} r={6.8} />
        <Blush cx1={31} cx2={62} cy={46} rx={4.8} />
        <path d="M40 47 Q46 54 53 47" stroke={INK} strokeWidth="3" fill="none" />
      </g>
    </svg>
  )
}

function Wallnut({ className }: SpriteProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g stroke={INK} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 7 C76 7 88 30 88 55 C88 80 71 94 50 94 C29 94 12 80 12 55 C12 30 24 7 50 7 Z" fill={P.nut} />
        <path d="M40 16 C30 24 24 36 24 48" stroke={P.nutLight} strokeWidth="7" fill="none" />
        <path d="M22 44 C20 54 21 62 25 70" stroke={INK} strokeWidth="2.4" fill="none" opacity="0.25" />
        <path d="M76 42 C79 52 78 62 74 70" stroke={INK} strokeWidth="2.4" fill="none" opacity="0.25" />
        <BigEyes cx1={39} cx2={63} cy={47} r={8.4} />
        <Blush cx1={26} cx2={76} cy={62} rx={6.4} />
        <path d="M40 68 Q51 79 63 68" stroke={INK} strokeWidth="3.4" fill="none" />
      </g>
    </svg>
  )
}

function CherryBomb({ className }: SpriteProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g stroke={INK} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M34 44 C38 26 48 16 58 12" stroke={P.stemDark} strokeWidth="6.5" fill="none" />
        <path d="M68 50 C64 30 60 20 58 12" stroke={P.stemDark} strokeWidth="6.5" fill="none" />
        <path d="M60 10 C70 2 82 4 86 10 C80 18 68 18 60 12 Z" fill={P.leaf} />
        <circle cx="33" cy="61" r="25" fill={P.cherry} />
        <circle cx="71" cy="67" r="22" fill={P.cherry} />
        <ellipse cx="25" cy="52" rx="7" ry="4.6" fill={P.cherryLight} stroke="none" transform="rotate(-26 25 52)" />
        <ellipse cx="64" cy="59" rx="6" ry="4" fill={P.cherryLight} stroke="none" transform="rotate(-26 64 59)" />
        <BigEyes cx1={26} cx2={40} cy={57} r={6} />
        <BigEyes cx1={65} cx2={78} cy={63} r={5.2} />
        <path d="M26 71 Q33 79 41 71" stroke={INK} strokeWidth="2.8" fill="none" />
        <path d="M65 77 Q71 84 78 77" stroke={INK} strokeWidth="2.6" fill="none" />
      </g>
    </svg>
  )
}

function Cactus({ className }: SpriteProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g stroke={INK} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        {/* 地面小沙丘 */}
        <ellipse cx="50" cy="90" rx="22" ry="6" fill="#e8c97a" />
        {/* 主干 */}
        <rect x="38" y="40" width="22" height="52" rx="11" fill="#5dbb4a" />
        <ellipse cx="49" cy="45" rx="9" ry="5" fill="#7ed957" stroke="none" transform="rotate(-12 49 45)" />
        {/* 左臂 */}
        <path d="M38 60 L18 60 C14 60 14 50 18 50 L26 50 L26 40 L38 40" fill="#5dbb4a" />
        <ellipse cx="22" cy="52" rx="5" ry="3.5" fill="#7ed957" stroke="none" transform="rotate(-12 22 52)" />
        {/* 右臂 */}
        <path d="M60 60 L80 60 C84 60 84 50 80 50 L72 50 L72 40 L60 40" fill="#5dbb4a" />
        <ellipse cx="76" cy="52" rx="5" ry="3.5" fill="#7ed957" stroke="none" transform="rotate(-12 76 52)" />
        {/* 小刺 */}
        {[[44,46],[48,44],[52,44],[56,46],[44,50],[56,50],[44,54],[56,54],[44,58],[56,58],[44,62],[56,62],[44,66],[56,66],[48,70],[52,70]].map(([cx,cy], i) => (
          <line key={i} x1={cx} y1={cy} x2={cx + (cx < 50 ? -3 : 3)} y2={cy - 3} stroke="#c8e6a0" strokeWidth="2" />
        ))}
        {/* 头顶小花 */}
        <circle cx="49" cy="34" r="6" fill="#ffdb4d" />
        {[0,72,144,216,288].map((deg) => (
          <ellipse key={deg} cx="49" cy="26" rx="4" ry="7" fill="#ffe680" transform={`rotate(${deg} 49 34)`} />
        ))}
        {/* 脸 */}
        <BigEyes cx1={42} cx2={56} cy={48} r={4.5} />
        <Blush cx1={34} cx2={64} cy={56} rx={3.5} />
        <path d="M44 56 Q49 61 54 56" stroke={INK} strokeWidth="2.4" fill="none" />
      </g>
    </svg>
  )
}

function CoconutTree({ className }: SpriteProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g stroke={INK} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        {/* 树干 */}
        <path d="M48 95 C47 70 49 50 50 30" stroke="#c4995a" strokeWidth="12" fill="none" />
        <path d="M48 95 C47 70 49 50 50 30" stroke="#d4b07a" strokeWidth="6" fill="none" opacity="0.5" />
        {/* 树干纹理 */}
        {[90,80,70,60,50,40].map((y, i) => (
          <path key={i} d={`M44 ${y} Q49 ${y - 2} 54 ${y}`} stroke="#8a6328" strokeWidth="2" fill="none" opacity="0.4" />
        ))}
        {/* 叶子 */}
        {[-30, 30, 0].map((rot) => (
          <path key={rot} d="M50 30 C30 10 10 15 5 30 C10 38 30 40 50 30" fill="#4da638" transform={`rotate(${rot} 50 30)`} />
        ))}
        {[-30, 30, 0].map((rot) => (
          <path key={`l2-${rot}`} d="M50 30 C38 18 25 22 20 32 C25 36 38 34 50 30" fill="#6ed957" stroke="none" transform={`rotate(${rot} 50 30)`} />
        ))}
        {/* 椰子 */}
        <circle cx="42" cy="42" r="7" fill="#8b5e3c" />
        <ellipse cx="40" cy="39" rx="3" ry="2.5" fill="#a47a5a" stroke="none" transform="rotate(-20 40 39)" />
        <circle cx="58" cy="44" r="6.5" fill="#8b5e3c" />
        <ellipse cx="56" cy="41" rx="2.8" ry="2.3" fill="#a47a5a" stroke="none" transform="rotate(-20 56 41)" />
        {/* 脸 */}
        <BigEyes cx1={40} cx2={56} cy={58} r={4.8} />
        <Blush cx1={31} cx2={65} cy={66} rx={3.8} />
        <path d="M42 64 Q49 70 55 64" stroke={INK} strokeWidth="2.6" fill="none" />
        {/* 地面小沙丘 */}
        <ellipse cx="50" cy="93" rx="24" ry="6" fill="#e8c97a" />
      </g>
    </svg>
  )
}

export function PlantSprite({ id, className }: { id: PlantId; className?: string }) {
  switch (id) {
    case 'sunflower':
      return <Sunflower className={className} />
    case 'peashooter':
      return <Shooter className={className} />
    case 'snowpea':
      return <Shooter className={className} cold />
    case 'repeater':
      return <Shooter className={className} twin />
    case 'wallnut':
      return <Wallnut className={className} />
    case 'cherry':
      return <CherryBomb className={className} />
    case 'cactus':
      return <Cactus className={className} />
    case 'coconut':
      return <CoconutTree className={className} />
  }
}

export function ZombieSprite({ id, className }: { id: ZombieId; className?: string }) {
  const big = id === 'brute'
  const small = id === 'imp'
  const shirt = big ? '#7d7ecb' : Z.shirt
  const scale = big ? 1.12 : small ? 0.74 : 1
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g transform={`translate(50 100) scale(${scale}) translate(-50 -100)`}>
        <g stroke={INK_Z} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          {/* 腿 */}
          <rect x="37" y="70" width="12" height="28" rx="6" fill={Z.skin} />
          <rect x="54" y="70" width="12" height="28" rx="6" fill={Z.skin} />
          {/* 身体 */}
          <path d="M35 45 C35 41 65 41 65 45 L69 74 C69 79 33 79 33 74 Z" fill={shirt} />
          <path d="M42 47 C41 56 41 64 43 72" stroke={Z.shirtDark} strokeWidth="5" fill="none" />
          {/* 前伸的手臂（伸向左侧行进方向） */}
          <rect x="12" y="47" width="30" height="11" rx="5.5" fill={Z.skin} />
          <circle cx="10" cy="52" r="7" fill={Z.skin} />
          {/* 头 */}
          <circle cx="50" cy="29" r="21" fill={Z.skin} />
          <ellipse cx="41" cy="19" rx="8" ry="5" fill={Z.skinLight} stroke="none" transform="rotate(-24 41 19)" />
          {/* 呆滞的大眼 */}
          <g strokeWidth="2.6">
            <circle cx="42" cy="26" r="7" fill={Z.eye} />
            <circle cx="58" cy="26" r="7" fill={Z.eye} />
          </g>
          <circle cx="43.5" cy="27.5" r="3" fill={Z.pupil} stroke="none" />
          <circle cx="59.5" cy="27.5" r="3" fill={Z.pupil} stroke="none" />
          {/* 张开的嘴 + 小牙 */}
          <path d="M42 39 Q50 48 59 39 Q50 43 42 39 Z" fill={Z.mouth} strokeWidth="2.8" />
          <path d="M47 40 L48.6 44 L50.4 40 Z" fill={Z.eye} strokeWidth="1.6" />
          <path d="M31 15 Q40 5 50 9" stroke="#4b5a44" strokeWidth="4.4" fill="none" />
          {/* 头饰 */}
          {id === 'cone' && (
            <>
              <path d="M50 0 L68 18 C58 22 42 22 32 18 Z" fill={Z.cone} />
              <path d="M50 3 C46 8 43 13 42 18" stroke={Z.coneLight} strokeWidth="4.5" fill="none" />
            </>
          )}
          {id === 'bucket' && (
            <>
              <path d="M32 18 L35 3 C42 0 58 0 65 3 L68 18 C58 23 42 23 32 18 Z" fill={Z.bucket} />
              <path d="M40 5 C38 10 37 14 37 18" stroke={Z.bucketLight} strokeWidth="4.5" fill="none" />
            </>
          )}
          {big && (
            <>
              <path d="M31 16 C31 6 69 6 69 16 C58 20 42 20 31 16 Z" fill="#a3565b" />
              <path d="M38 9 C36 12 35 14 35 16" stroke="#c98287" strokeWidth="4" fill="none" />
            </>
          )}
          {/* 泳圈（沙滩僵尸） */}
          {id === 'swimring' && (
            <>
              <ellipse cx="50" cy="62" rx="18" ry="8" fill="none" stroke="#ff6b6b" strokeWidth="6" />
              <ellipse cx="50" cy="62" rx="18" ry="8" fill="none" stroke="#ff9999" strokeWidth="3" />
              <path d="M38 58 Q40 54 44 54" stroke="#ffcccc" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d="M56 54 Q60 54 62 58" stroke="#ffcccc" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </>
          )}
        </g>
      </g>
    </svg>
  )
}

export function SunSprite({ className }: SpriteProps) {
  const rays = Array.from({ length: 9 }, (_, i) => i * 40)
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g stroke="#b8791a" strokeWidth="3" strokeLinejoin="round">
        <g className="anim-sun" style={{ transformOrigin: '50px 50px' }}>
          {rays.map((deg) => (
            <path
              key={deg}
              d="M50 2 L57 20 L43 20 Z"
              fill="#ffdb4d"
              transform={`rotate(${deg} 50 50)`}
            />
          ))}
        </g>
        <circle cx="50" cy="50" r="28" fill="#ffc61a" />
        <ellipse cx="40" cy="40" rx="9" ry="6" fill="#ffeaa0" stroke="none" transform="rotate(-30 40 40)" />
        <g stroke="#b8791a" strokeWidth="2.4">
          <path d="M40 47 Q43 43 46 47" fill="none" strokeLinecap="round" />
          <path d="M54 47 Q57 43 60 47" fill="none" strokeLinecap="round" />
          <path d="M43 57 Q50 63 57 57" fill="none" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  )
}

export function PeaSprite({ className, freeze }: SpriteProps & { freeze?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle
        cx="50"
        cy="50"
        r="33"
        fill={freeze ? P.ice : P.body}
        stroke={INK}
        strokeWidth="7"
      />
      <ellipse cx="39" cy="38" rx="10" ry="7" fill={P.white} opacity="0.7" transform="rotate(-30 39 38)" />
    </svg>
  )
}

/** 草坪上的小草丛装饰 */
export function TuftSprite({ className }: SpriteProps) {
  return (
    <svg viewBox="0 0 100 60" className={className} aria-hidden="true">
      <g stroke="#3f7a2c" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.55">
        <path d="M22 56 C18 40 22 28 30 20" />
        <path d="M50 57 C50 38 50 26 52 14" />
        <path d="M78 56 C82 40 78 30 70 21" />
      </g>
    </svg>
  )
}

/** 草坪上的小雏菊装饰 */
export function DaisySprite({ className }: SpriteProps) {
  const petals = [0, 72, 144, 216, 288]
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g stroke="#3f7a2c" strokeWidth="4" strokeLinejoin="round">
        {petals.map((deg) => (
          <ellipse
            key={deg}
            cx="50"
            cy="26"
            rx="13"
            ry="19"
            fill="#fff6e0"
            transform={`rotate(${deg} 50 50)`}
          />
        ))}
        <circle cx="50" cy="50" r="15" fill="#ffcf3d" />
      </g>
    </svg>
  )
}

export function MowerSprite({ className }: SpriteProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g stroke={INK} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="16" y="42" width="60" height="27" rx="11" fill="#f0574f" />
        <rect x="23" y="31" width="28" height="16" rx="7" fill="#fbf7ec" />
        <ellipse cx="30" cy="49" rx="8" ry="4" fill="#ff8f88" stroke="none" />
        <path d="M72 46 L90 28" stroke="#a9b0b8" strokeWidth="7" />
        <circle cx="31" cy="73" r="12" fill="#3b3b3b" />
        <circle cx="62" cy="73" r="12" fill="#3b3b3b" />
        <circle cx="31" cy="73" r="4.5" fill="#dfe3e8" />
        <circle cx="62" cy="73" r="4.5" fill="#dfe3e8" />
      </g>
    </svg>
  )
}
