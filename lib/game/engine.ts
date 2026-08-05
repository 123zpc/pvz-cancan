import { COLS, PLANTS, ROWS, ZOMBIES, type Level, type PlantId, type ZombieId } from './data'

export interface PlantEntity {
  uid: number
  def: PlantId
  row: number
  col: number
  hp: number
  maxHp: number
  timer: number
  fuse: number
  shooting: boolean
}

export interface ZombieEntity {
  uid: number
  def: ZombieId
  row: number
  /** 横向位置，单位为格子，9 = 草坪最右侧，0 = 房子门口 */
  x: number
  hp: number
  maxHp: number
  slow: number
  eating: boolean
  chew: number
  hurt: number
}

export interface PeaEntity {
  uid: number
  row: number
  x: number
  damage: number
  freeze: boolean
}

export interface SunEntity {
  uid: number
  /** 百分比坐标 */
  x: number
  y: number
  targetY: number
  value: number
  life: number
}

export interface EffectEntity {
  uid: number
  kind: 'boom' | 'freeze' | 'crunch' | 'text'
  x: number
  y: number
  text?: string
  life: number
}

export interface MowerEntity {
  row: number
  x: number
  running: boolean
  used: boolean
}

export type GameStatus = 'playing' | 'won' | 'lost'

export interface GameState {
  level: Level
  time: number
  sun: number
  plants: PlantEntity[]
  zombies: ZombieEntity[]
  peas: PeaEntity[]
  suns: SunEntity[]
  effects: EffectEntity[]
  mowers: MowerEntity[]
  cooldowns: Record<string, number>
  spawnIndex: number
  sunTimer: number
  status: GameStatus
  killed: number
  bigWaveShown: boolean
  banner: { text: string; life: number } | null
}

let seq = 1
const uid = () => seq++

const PEA_SPEED = 4.2
const CHERRY_FUSE = 1.2

export function createGame(level: Level): GameState {
  const cooldowns: Record<string, number> = {}
  for (const p of level.plants) cooldowns[p] = 0
  return {
    level,
    time: 0,
    sun: level.startSun,
    plants: [],
    zombies: [],
    peas: [],
    suns: [],
    effects: [],
    mowers: Array.from({ length: ROWS }, (_, row) => ({ row, x: -0.6, running: false, used: false })),
    cooldowns,
    spawnIndex: 0,
    sunTimer: 4,
    status: 'playing',
    killed: 0,
    bigWaveShown: false,
    banner: { text: '准备种植！', life: 2.4 },
  }
}

export function canPlant(g: GameState, id: PlantId, row: number, col: number) {
  if (g.status !== 'playing') return false
  if (g.sun < PLANTS[id].cost) return false
  if ((g.cooldowns[id] ?? 0) > 0) return false
  return !g.plants.some((p) => p.row === row && p.col === col)
}

export function placePlant(g: GameState, id: PlantId, row: number, col: number) {
  if (!canPlant(g, id, row, col)) return false
  const def = PLANTS[id]
  g.sun -= def.cost
  g.cooldowns[id] = def.recharge
  g.plants.push({
    uid: uid(),
    def: id,
    row,
    col,
    hp: def.hp,
    maxHp: def.hp,
    timer: def.kind === 'producer' ? 2.5 : 0,
    fuse: def.kind === 'bomb' ? CHERRY_FUSE : 0,
    shooting: false,
  })
  return true
}

export function digPlant(g: GameState, plantUid: number) {
  g.plants = g.plants.filter((p) => p.uid !== plantUid)
}

export function collectSun(g: GameState, sunUid: number) {
  const s = g.suns.find((x) => x.uid === sunUid)
  if (!s) return
  g.sun += s.value
  g.suns = g.suns.filter((x) => x.uid !== sunUid)
  g.effects.push({ uid: uid(), kind: 'text', x: s.x, y: s.y, text: `+${s.value}`, life: 0.9 })
}

function dropSun(g: GameState, x: number, y: number, targetY: number, value = 25) {
  g.suns.push({ uid: uid(), x, y, targetY, value, life: 14 })
}

function damageZombie(g: GameState, z: ZombieEntity, dmg: number) {
  z.hp -= dmg
  z.hurt = 0.12
  if (z.hp <= 0) {
    g.zombies = g.zombies.filter((o) => o.uid !== z.uid)
    g.killed += 1
  }
}

function explode(g: GameState, row: number, col: number) {
  g.effects.push({ uid: uid(), kind: 'boom', x: ((col + 0.5) / COLS) * 100, y: ((row + 0.5) / ROWS) * 100, life: 0.5 })
  for (const z of [...g.zombies]) {
    if (Math.abs(z.row - row) <= 1 && Math.abs(z.x - (col + 0.5)) <= 1.5) damageZombie(g, z, 1800)
  }
}

export function step(g: GameState, dt: number) {
  if (g.status !== 'playing') return
  g.time += dt

  for (const key of Object.keys(g.cooldowns)) {
    if (g.cooldowns[key] > 0) g.cooldowns[key] = Math.max(0, g.cooldowns[key] - dt)
  }

  if (g.banner) {
    g.banner.life -= dt
    if (g.banner.life <= 0) g.banner = null
  }

  // 自然阳光
  if (g.level.sunInterval > 0) {
    g.sunTimer -= dt
    if (g.sunTimer <= 0) {
      g.sunTimer = g.level.sunInterval
      const x = 8 + Math.random() * 84
      dropSun(g, x, -8, 25 + Math.random() * 62)
    }
  }

  // 阳光下落
  for (const s of g.suns) {
    if (s.y < s.targetY) s.y = Math.min(s.targetY, s.y + 14 * dt)
    else s.life -= dt
  }
  g.suns = g.suns.filter((s) => s.life > 0)

  // 出怪
  const { spawns } = g.level
  while (g.spawnIndex < spawns.length && spawns[g.spawnIndex].at <= g.time) {
    const sp = spawns[g.spawnIndex]
    const def = ZOMBIES[sp.type]
    g.zombies.push({
      uid: uid(),
      def: sp.type,
      row: sp.row,
      x: COLS + 0.4 + Math.random() * 0.5,
      hp: def.hp,
      maxHp: def.hp,
      slow: 0,
      eating: false,
      chew: 0,
      hurt: 0,
    })
    g.spawnIndex++
  }

  if (!g.bigWaveShown && g.time >= g.level.finalWaveAt - 4) {
    g.bigWaveShown = true
    g.banner = { text: '一大波僵尸即将来袭！', life: 3 }
  }

  // 植物行为
  for (const p of [...g.plants]) {
    const def = PLANTS[p.def]
    if (def.kind === 'producer') {
      p.timer += dt
      if (p.timer >= (def.interval ?? 8)) {
        p.timer = 0
        dropSun(
          g,
          ((p.col + 0.5) / COLS) * 100 + (Math.random() * 6 - 3),
          ((p.row + 0.4) / ROWS) * 100,
          ((p.row + 0.75) / ROWS) * 100,
        )
      }
    } else if (def.kind === 'shooter') {
      const hasTarget = g.zombies.some((z) => z.row === p.row && z.x > p.col + 0.2 && z.x < COLS + 1)
      p.shooting = hasTarget
      if (hasTarget) {
        p.timer += dt
        if (p.timer >= (def.interval ?? 1.5)) {
          p.timer = 0
          for (let i = 0; i < (def.shots ?? 1); i++) {
            g.peas.push({
              uid: uid(),
              row: p.row,
              x: p.col + 0.72 - i * 0.35,
              damage: def.damage ?? 20,
              freeze: !!def.freeze,
            })
          }
        }
      } else {
        p.timer = Math.min(p.timer, def.interval ?? 1.5)
      }
    } else if (def.kind === 'bomb') {
      p.fuse -= dt
      if (p.fuse <= 0) {
        digPlant(g, p.uid)
        explode(g, p.row, p.col)
      }
    }
  }

  // 豌豆飞行与命中
  for (const pea of [...g.peas]) {
    pea.x += PEA_SPEED * dt
    const hit = g.zombies
      .filter((z) => z.row === pea.row && z.x <= pea.x + 0.32 && z.x > pea.x - 0.6)
      .sort((a, b) => a.x - b.x)[0]
    if (hit) {
      damageZombie(g, hit, pea.damage)
      if (pea.freeze) {
        hit.slow = 4
        g.effects.push({
          uid: uid(),
          kind: 'freeze',
          x: (hit.x / COLS) * 100,
          y: ((hit.row + 0.5) / ROWS) * 100,
          life: 0.35,
        })
      }
      g.peas = g.peas.filter((o) => o.uid !== pea.uid)
    } else if (pea.x > COLS + 0.6) {
      g.peas = g.peas.filter((o) => o.uid !== pea.uid)
    }
  }

  // 僵尸行动
  for (const z of [...g.zombies]) {
    const def = ZOMBIES[z.def]
    if (z.slow > 0) z.slow = Math.max(0, z.slow - dt)
    if (z.hurt > 0) z.hurt = Math.max(0, z.hurt - dt)

    const target = g.plants
      .filter((p) => p.row === z.row && z.x - (p.col + 0.5) <= 0.42 && z.x - (p.col + 0.5) >= -0.35)
      .sort((a, b) => b.col - a.col)[0]

    if (target) {
      z.eating = true
      z.chew += dt
      if (z.chew >= def.biteInterval) {
        z.chew = 0
        target.hp -= def.bite
        g.effects.push({
          uid: uid(),
          kind: 'crunch',
          x: ((target.col + 0.5) / COLS) * 100,
          y: ((target.row + 0.35) / ROWS) * 100,
          life: 0.3,
        })
        if (target.hp <= 0) digPlant(g, target.uid)
      }
    } else {
      z.eating = false
      z.x -= def.speed * dt * (z.slow > 0 ? 0.45 : 1)
    }

    if (z.x <= 0.35) {
      const mower = g.mowers[z.row]
      if (mower && !mower.used) {
        mower.used = true
        mower.running = true
      } else if (!mower?.running) {
        g.status = 'lost'
        return
      }
    }
  }

  // 小推车
  for (const m of g.mowers) {
    if (!m.running) continue
    m.x += 4.5 * dt
    for (const z of [...g.zombies]) {
      if (z.row === m.row && Math.abs(z.x - m.x) < 0.6) damageZombie(g, z, 5000)
    }
    if (m.x > COLS + 1) m.running = false
  }

  // 特效
  for (const e of g.effects) e.life -= dt
  g.effects = g.effects.filter((e) => e.life > 0)

  // 胜利判定
  if (g.spawnIndex >= spawns.length && g.zombies.length === 0 && g.time > 5) {
    g.status = 'won'
  }
}
