import type { PlantId, ZombieId } from './data'

/** 消消乐元素类型：植物 + 僵尸 */
export type TileType = 'sunflower' | 'peashooter' | 'wallnut' | 'cherry' | 'normal' | 'cone'

export interface TileTypeDef {
  id: TileType
  name: string
  /** 显示用 sprite 类型 */
  kind: 'plant' | 'zombie'
  spriteId: PlantId | ZombieId
  /** 元素主色（用于网格背景提示） */
  color: string
}

export const TILE_TYPES: Record<TileType, TileTypeDef> = {
  sunflower: { id: 'sunflower', name: '向日葵', kind: 'plant', spriteId: 'sunflower', color: '#ffd23f' },
  peashooter: { id: 'peashooter', name: '豌豆射手', kind: 'plant', spriteId: 'peashooter', color: '#5ab03d' },
  wallnut: { id: 'wallnut', name: '坚果墙', kind: 'plant', spriteId: 'wallnut', color: '#d99354' },
  cherry: { id: 'cherry', name: '樱桃炸弹', kind: 'plant', spriteId: 'cherry', color: '#f4555c' },
  normal: { id: 'normal', name: '普通僵尸', kind: 'zombie', spriteId: 'normal', color: '#9a9ada' },
  cone: { id: 'cone', name: '路障僵尸', kind: 'zombie', spriteId: 'cone', color: '#ff9440' },
}

/** 所有可用元素（按难度递增的关卡会逐步解锁更多） */
const ALL_TILES: TileType[] = ['sunflower', 'peashooter', 'wallnut', 'cherry', 'normal', 'cone']

export interface Match3Level {
  id: number
  name: string
  subtitle: string
  /** 网格尺寸（行 × 列） */
  rows: number
  cols: number
  /** 可用元素数量（3-6，越多越难） */
  tileCount: number
  /** 目标分数 */
  target: number
  /** 可用步数 */
  moves: number
  /** 通关寄语 */
  message: string
  /** 配色主题（与主游戏 storyTheme 一同风格） */
  theme: string
}

/**
 * 消消乐 10 关：与主游戏关卡呼应。
 * 难度曲线：target/moves 从 30 平滑递增到 300，元素 4→5→6，网格 7×7→8×8→9×9。
 */
export const MATCH3_LEVELS: Match3Level[] = [
  { id: 1,  name: '初遇', subtitle: '心动的那一刻', rows: 7, cols: 7, tileCount: 4, target: 600,  moves: 20, message: '第一次消消乐，就像第一次心动。', theme: 'sunny' },
  { id: 2,  name: '约会', subtitle: '带上坚果出门', rows: 7, cols: 7, tileCount: 4, target: 900,  moves: 18, message: '愿每一次约会都甜甜蜜蜜。', theme: 'rose' },
  { id: 3,  name: '暖冬', subtitle: '阳光稀少但有你', rows: 7, cols: 7, tileCount: 5, target: 1400, moves: 18, message: '冬夜再长，有你就暖。', theme: 'ice' },
  { id: 4,  name: '磨合', subtitle: '一起面对困难', rows: 8, cols: 8, tileCount: 5, target: 2000, moves: 20, message: '磨合的日子，也有甜。', theme: 'mint' },
  { id: 5,  name: '守护', subtitle: '用一生去守护', rows: 8, cols: 8, tileCount: 6, target: 2600, moves: 20, message: '守护你，是我最大的愿望。', theme: 'cherry' },
  { id: 6,  name: '早晨', subtitle: '醒来有你在',   rows: 8, cols: 8, tileCount: 6, target: 3200, moves: 20, message: '早安，灿灿。', theme: 'dawn' },
  { id: 7,  name: '雨天', subtitle: '风雨中有我',   rows: 8, cols: 8, tileCount: 6, target: 4000, moves: 22, message: '下雨天，窝在一起。', theme: 'rain' },
  { id: 8,  name: '日常', subtitle: '平凡也幸福',   rows: 9, cols: 9, tileCount: 6, target: 5000, moves: 22, message: '和你过的每一天都很甜。', theme: 'milk' },
  { id: 9,  name: '星空', subtitle: '一起数星星',   rows: 9, cols: 9, tileCount: 6, target: 6000, moves: 22, message: '星星再亮，也不如你亮。', theme: 'star' },
  { id: 10, name: '永远', subtitle: '一生的承诺',   rows: 9, cols: 9, tileCount: 6, target: 7200, moves: 24, message: '灿灿，往后余生，多多关照。', theme: 'gold' },
]

/** 网格单元 */
export type Cell = { type: TileType } | null

/** 单条匹配线（≥3） */
export interface MatchGroup {
  cells: [number, number][]
  length: number
  direction: 'row' | 'col'
  type: TileType
}

/** 创建初始网格，确保开局无三连 */
export function createGrid(rows: number, cols: number, tileCount: number): Cell[][] {
  const pool = ALL_TILES.slice(0, tileCount)
  const grid: Cell[][] = []
  for (let r = 0; r < rows; r++) {
    grid[r] = []
    for (let c = 0; c < cols; c++) {
      let t: TileType
      let tries = 0
      do {
        t = pool[Math.floor(Math.random() * pool.length)]
        tries++
      } while (
        tries < 20 && (
          (c >= 2 && grid[r][c - 1]?.type === t && grid[r][c - 2]?.type === t) ||
          (r >= 2 && grid[r - 1][c]?.type === t && grid[r - 2][c]?.type === t)
        )
      )
      grid[r][c] = { type: t }
    }
  }
  // 确保初始局面存在可行交换，否则重新生成
  if (!hasPossibleMove(grid, tileCount)) return createGrid(rows, cols, tileCount)
  return grid
}

/** 找出所有匹配线（≥3 连成行/列） */
export function findMatchGroups(grid: Cell[][]): MatchGroup[] {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  const groups: MatchGroup[] = []

  // 横向
  for (let r = 0; r < rows; r++) {
    let runStart = 0
    for (let c = 1; c <= cols; c++) {
      const prev = grid[r][c - 1]?.type
      const cur = c < cols ? grid[r][c]?.type : null
      if (cur !== prev || c === cols) {
        if (c - runStart >= 3 && prev) {
          const cells: [number, number][] = []
          for (let k = runStart; k < c; k++) cells.push([r, k])
          groups.push({ cells, length: c - runStart, direction: 'row', type: prev })
        }
        runStart = c
      }
    }
  }
  // 纵向
  for (let c = 0; c < cols; c++) {
    let runStart = 0
    for (let r = 1; r <= rows; r++) {
      const prev = grid[r - 1][c]?.type
      const cur = r < rows ? grid[r][c]?.type : null
      if (cur !== prev || r === rows) {
        if (r - runStart >= 3 && prev) {
          const cells: [number, number][] = []
          for (let k = runStart; k < r; k++) cells.push([k, c])
          groups.push({ cells, length: r - runStart, direction: 'col', type: prev })
        }
        runStart = r
      }
    }
  }
  return groups
}

/** 找出所有匹配（≥3 连成行/列）的格子坐标集合 */
export function findMatches(grid: Cell[][]): Set<string> {
  const groups = findMatchGroups(grid)
  const matched = new Set<string>()
  for (const g of groups) for (const [r, c] of g.cells) matched.add(`${r},${c}`)
  return matched
}

/** 交换两个格子，返回新网格（不可变） */
export function swap(grid: Cell[][], a: [number, number], b: [number, number]): Cell[][] {
  const next = grid.map((row) => row.slice())
  const tmp = next[a[0]][a[1]]
  next[a[0]][a[1]] = next[b[0]][b[1]]
  next[b[0]][b[1]] = tmp
  return next
}

/** 判断两个坐标是否相邻 */
export function isAdjacent(a: [number, number], b: [number, number]): boolean {
  const dr = Math.abs(a[0] - b[0])
  const dc = Math.abs(a[1] - b[1])
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1)
}

/** 单步消除：清除匹配、下落、填充，返回新网格 + 清除的格子坐标列表 */
export function resolveStep(grid: Cell[][], tileCount: number): {
  grid: Cell[][]
  cleared: number
  clearedCells: { r: number; c: number; type: TileType }[]
  groups: MatchGroup[]
} {
  const groups = findMatchGroups(grid)
  if (groups.length === 0) return { grid, cleared: 0, clearedCells: [], groups }

  const rows = grid.length
  const cols = grid[0].length
  const pool = ALL_TILES.slice(0, tileCount)
  const next = grid.map((row) => row.slice())
  const clearedCells: { r: number; c: number; type: TileType }[] = []
  const seen = new Set<string>()

  groups.forEach((g) => {
    for (const [r, c] of g.cells) {
      const key = `${r},${c}`
      if (seen.has(key)) return
      seen.add(key)
      const cellType = next[r][c]?.type
      if (cellType) clearedCells.push({ r, c, type: cellType })
      next[r][c] = null
    }
  })

  // 下落 + 填充
  for (let c = 0; c < cols; c++) {
    let writeRow = rows - 1
    for (let r = rows - 1; r >= 0; r--) {
      if (next[r][c]) {
        if (writeRow !== r) {
          next[writeRow][c] = next[r][c]
          next[r][c] = null
        }
        writeRow--
      }
    }
    for (let r = writeRow; r >= 0; r--) {
      next[r][c] = { type: pool[Math.floor(Math.random() * pool.length)] }
    }
  }

  return { grid: next, cleared: clearedCells.length, clearedCells, groups }
}

/** 链式消除：返回每一步的详细信息，供特效使用 */
export interface ResolveStepResult {
  grid: Cell[][] // 该步消除后的网格（含已下落填充）
  cleared: number
  clearedCells: { r: number; c: number; type: TileType }[] // 该步被清除的原始坐标
  groups: MatchGroup[]
  chains: number // 当前是第几条链
  totalCleared: number
  bestRunLength: number // 该步最长匹配线长度
}

export function resolveChain(grid: Cell[][], tileCount: number): {
  grid: Cell[][]
  totalCleared: number
  chains: number
  steps: ResolveStepResult[]
  bestRunLength: number
} {
  let current = grid
  let total = 0
  let chains = 0
  const steps: ResolveStepResult[] = []
  let bestRun = 0
  for (let i = 0; i < 12; i++) {
    const res = resolveStep(current, tileCount)
    if (res.cleared === 0) break
    chains++
    total += res.cleared
    const stepBest = res.groups.reduce((m, g) => Math.max(m, g.length), 0)
    bestRun = Math.max(bestRun, stepBest)
    steps.push({
      grid: res.grid,
      cleared: res.cleared,
      clearedCells: res.clearedCells,
      groups: res.groups,
      chains,
      totalCleared: total,
      bestRunLength: stepBest,
    })
    current = res.grid
  }
  return { grid: current, totalCleared: total, chains, steps, bestRunLength: bestRun }
}

/** 计算分数：
 *  - 3 连：100/格
 *  - 4 连：150/格（1.5×）
 *  - 5+ 连：200/格（2×）+ "星之回响" 加成
 *  - 连消链：每多一层 ×1.5
 */
export function calcScore(cleared: number, chains: number, bestRun: number = 3): number {
  const perCell = bestRun >= 5 ? 200 : bestRun >= 4 ? 150 : 100
  let base = cleared * perCell
  let mult = 1
  for (let i = 1; i < chains; i++) mult *= 1.5
  return Math.round(base * mult)
}

/** 检测是否存在可行的交换（避免死局） */
export function hasPossibleMove(grid: Cell[][], tileCount: number): boolean {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols) {
        const test = swap(grid, [r, c], [r, c + 1])
        if (findMatches(test).size > 0) return true
      }
      if (r + 1 < rows) {
        const test = swap(grid, [r, c], [r + 1, c])
        if (findMatches(test).size > 0) return true
      }
    }
  }
  return false
}
