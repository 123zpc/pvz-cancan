export const COLS = 9
export const ROWS = 5

export type PlantId = 'sunflower' | 'peashooter' | 'wallnut' | 'snowpea' | 'repeater' | 'cherry'

export interface PlantDef {
  id: PlantId
  name: string
  cost: number
  hp: number
  /** 卡片重新可用所需秒数 */
  recharge: number
  kind: 'producer' | 'shooter' | 'wall' | 'bomb'
  /** 生产 / 射击 间隔（秒） */
  interval?: number
  damage?: number
  /** 每次开火发射几颗 */
  shots?: number
  freeze?: boolean
  desc: string
}

export const PLANTS: Record<PlantId, PlantDef> = {
  sunflower: {
    id: 'sunflower',
    name: '向日葵',
    cost: 50,
    hp: 300,
    recharge: 5,
    kind: 'producer',
    interval: 8,
    desc: '每 8 秒产出 25 点阳光，是全场的经济支柱。',
  },
  peashooter: {
    id: 'peashooter',
    name: '豌豆射手',
    cost: 100,
    hp: 300,
    recharge: 5,
    kind: 'shooter',
    interval: 1.4,
    damage: 20,
    shots: 1,
    desc: '朝前方连续吐出豌豆，最基础也最可靠。',
  },
  wallnut: {
    id: 'wallnut',
    name: '坚果墙',
    cost: 50,
    hp: 1600,
    recharge: 18,
    kind: 'wall',
    desc: '皮厚肉多，用来给后排射手挡刀。',
  },
  snowpea: {
    id: 'snowpea',
    name: '寒冰射手',
    cost: 175,
    hp: 300,
    recharge: 7,
    kind: 'shooter',
    interval: 1.5,
    damage: 20,
    shots: 1,
    freeze: true,
    desc: '冰豌豆会让僵尸减速一半，怕冷的它们走得更慢。',
  },
  repeater: {
    id: 'repeater',
    name: '双发射手',
    cost: 200,
    hp: 300,
    recharge: 8,
    kind: 'shooter',
    interval: 1.5,
    damage: 20,
    shots: 2,
    desc: '一次射出两颗豌豆，火力翻倍。',
  },
  cherry: {
    id: 'cherry',
    name: '樱桃炸弹',
    cost: 150,
    hp: 4000,
    recharge: 25,
    kind: 'bomb',
    desc: '放下后 1.2 秒引爆，清空周围 3×3 的僵尸。',
  },
}

export type ZombieId = 'normal' | 'cone' | 'bucket' | 'imp' | 'brute'

export interface ZombieDef {
  id: ZombieId
  name: string
  hp: number
  /** 每秒移动格数 */
  speed: number
  /** 啃食伤害（每次） */
  bite: number
  /** 啃食间隔（秒） */
  biteInterval: number
  desc: string
}

export const ZOMBIES: Record<ZombieId, ZombieDef> = {
  normal: { id: 'normal', name: '普通僵尸', hp: 200, speed: 0.22, bite: 50, biteInterval: 0.5, desc: '慢慢走来的家伙' },
  cone: { id: 'cone', name: '路障僵尸', hp: 420, speed: 0.22, bite: 50, biteInterval: 0.5, desc: '头顶路障，更耐打' },
  bucket: { id: 'bucket', name: '铁桶僵尸', hp: 750, speed: 0.2, bite: 50, biteInterval: 0.5, desc: '铁桶护头，非常硬' },
  imp: { id: 'imp', name: '小鬼僵尸', hp: 110, speed: 0.46, bite: 40, biteInterval: 0.45, desc: '个子小，跑得快' },
  brute: { id: 'brute', name: '壮汉僵尸', hp: 1200, speed: 0.3, bite: 80, biteInterval: 0.45, desc: '又快又厚的大块头' },
}

export interface Spawn {
  at: number
  type: ZombieId
  row: number
}

export interface Level {
  id: number
  name: string
  subtitle: string
  hint: string
  /** 通关后显示的寄语 */
  message: string
  /** 「我们的故事」页面正文，与关卡卡片共用同一份文案 */
  story: string
  /** 故事页章节高亮句（可选，仅终章使用） */
  storyHighlight?: string
  /** 故事页章节配色主题 */
  storyTheme: 'sunny' | 'rose' | 'ice' | 'mint' | 'cherry' | 'dawn' | 'rain' | 'milk' | 'star' | 'gold'
  night: boolean
  startSun: number
  /** 自然阳光间隔（秒），0 表示不掉落 */
  sunInterval: number
  plants: PlantId[]
  spawns: Spawn[]
  finalWaveAt: number
}

/** 生成一组僵尸：从 at 开始，每 gap 秒一只，行号循环取自 rows */
function group(at: number, gap: number, type: ZombieId, rows: number[]): Spawn[] {
  return rows.map((row, i) => ({ at: at + i * gap, type, row }))
}

export const LEVELS: Level[] = [
  {
    id: 1,
    name: '初遇',
    subtitle: '白天 · 心动的那一刻',
    hint: '先种 3 朵向日葵攒阳光，就像先攒足勇气去认识她。',
    message: '那天的阳光格外温暖，就像灿灿的笑容一样。',
    story: '那是一个阳光明媚的午后，你在人群中笑着，整个世界都亮了。我笨拙地走上前，心跳得像草坪上第一朵向日葵刚绽放。',
    storyTheme: 'sunny',
    night: false,
    startSun: 75,
    sunInterval: 7,
    plants: ['sunflower', 'peashooter'],
    finalWaveAt: 92,
    spawns: [
      ...group(14, 0, 'normal', [2]),
      ...group(30, 6, 'normal', [1, 3]),
      ...group(50, 5, 'normal', [0, 2, 4]),
      ...group(74, 3, 'normal', [3, 1, 2]),
      ...group(92, 2.2, 'normal', [0, 4, 2, 1, 3]),
    ],
  },
  {
    id: 2,
    name: '约会',
    subtitle: '白天 · 带上坚果出门',
    hint: '坚果墙放在射手前面一格，就像约会时给她满满的安全感。',
    message: '愿每一次约会，都像这片草坪一样充满阳光。',
    story: '每一次约会，紧张得像面对一波路障僵尸。但你来的时候，所有不安都化成了笑。那天我们走了很久很久。',
    storyTheme: 'rose',
    night: false,
    startSun: 100,
    sunInterval: 7,
    plants: ['sunflower', 'peashooter', 'wallnut'],
    finalWaveAt: 100,
    spawns: [
      ...group(12, 0, 'normal', [2]),
      ...group(26, 4, 'normal', [0, 4]),
      ...group(42, 5, 'cone', [1, 3]),
      ...group(60, 3.5, 'normal', [2, 0, 4]),
      ...group(78, 4, 'cone', [3, 2, 1]),
      ...group(100, 2, 'cone', [0, 2, 4]),
      ...group(103, 2, 'normal', [1, 3, 2, 0]),
    ],
  },
  {
    id: 3,
    name: '暖冬',
    subtitle: '夜晚 · 阳光稀少但有你',
    hint: '夜里天上不掉阳光，全靠向日葵！就像再冷的冬天，有她在就温暖。',
    message: '冬夜再长，有灿灿在身边，心里就一直是春天。',
    story: '冬天很冷，但你的手很暖。即使最冷的夜晚，有你在，心里就一直是春天。',
    storyTheme: 'ice',
    night: true,
    startSun: 150,
    sunInterval: 0,
    plants: ['sunflower', 'peashooter', 'wallnut', 'snowpea'],
    finalWaveAt: 105,
    spawns: [
      ...group(15, 0, 'normal', [2]),
      ...group(28, 4, 'imp', [0, 4]),
      ...group(45, 4, 'cone', [1, 3]),
      ...group(62, 3, 'imp', [2, 3, 1]),
      ...group(80, 4, 'cone', [0, 4, 2]),
      ...group(105, 1.8, 'imp', [1, 3, 0, 4]),
      ...group(108, 2.4, 'cone', [2, 1, 3]),
    ],
  },
  {
    id: 4,
    name: '磨合',
    subtitle: '白天 · 一起面对困难',
    hint: '双发射手叠火力，樱桃炸弹留给成堆的困难。两个人一起，什么都不怕。',
    message: '磨合的日子偶尔磕碰，但只要并肩作战，没有过不去的坎。',
    story: '不是每一天都完美。困难不可怕，一起面对就好。',
    storyTheme: 'mint',
    night: false,
    startSun: 175,
    sunInterval: 6.5,
    plants: ['sunflower', 'peashooter', 'wallnut', 'repeater', 'cherry'],
    finalWaveAt: 110,
    spawns: [
      ...group(12, 0, 'cone', [2]),
      ...group(25, 3.5, 'normal', [0, 4, 2]),
      ...group(44, 5, 'bucket', [1, 3]),
      ...group(62, 3, 'cone', [2, 0, 4, 1]),
      ...group(84, 4, 'bucket', [3, 2, 1]),
      ...group(110, 1.6, 'bucket', [0, 2, 4]),
      ...group(112, 1.8, 'cone', [1, 3, 2, 0, 4]),
    ],
  },
  {
    id: 5,
    name: '守护',
    subtitle: '夜晚 · 用一生去守护',
    hint: '壮汉僵尸血厚又快，前排坚果 + 后排双发是关键。守护她，守护这份爱。',
    message: '灿灿，不管未来有多少风雨，我都愿做你身边最坚固的防线。',
    story: '你知道，爱不只是一时心动。不管未来有多少风雨，我都愿意做你身边最坚固的那道防线。',
    storyTheme: 'cherry',
    night: true,
    startSun: 250,
    sunInterval: 0,
    plants: ['sunflower', 'peashooter', 'wallnut', 'snowpea', 'repeater', 'cherry'],
    finalWaveAt: 118,
    spawns: [
      ...group(12, 2.5, 'normal', [2, 0, 4]),
      ...group(28, 3, 'imp', [1, 3, 2]),
      ...group(46, 4, 'bucket', [0, 4]),
      ...group(60, 2.5, 'cone', [1, 2, 3]),
      ...group(78, 6, 'brute', [2, 0]),
      ...group(96, 2.5, 'imp', [4, 3, 1]),
      ...group(118, 1.5, 'brute', [1, 3]),
      ...group(120, 1.5, 'bucket', [0, 2, 4]),
      ...group(124, 1.6, 'cone', [2, 1, 3, 0, 4]),
    ],
  },
  {
    id: 6,
    name: '早晨',
    subtitle: '白天 · 醒来有你在',
    hint: '双发射手+寒冰射手组合，让僵尸又慢又疼。就像每个早晨有灿灿在，一切都不慌不忙。',
    message: '清晨第一缕阳光照进来，灿灿还在身边，这就是最好的日常。',
    story: '日子一天天过去，最好的浪漫变成了清晨醒来。一句早安，平凡得发光。',
    storyTheme: 'dawn',
    night: false,
    startSun: 200,
    sunInterval: 6,
    plants: ['sunflower', 'peashooter', 'wallnut', 'snowpea', 'repeater'],
    finalWaveAt: 100,
    spawns: [
      ...group(12, 0, 'normal', [2]),
      ...group(24, 4, 'imp', [0, 4]),
      ...group(40, 4, 'cone', [1, 3]),
      ...group(58, 3, 'bucket', [2, 0]),
      ...group(75, 3.5, 'imp', [3, 1, 4]),
      ...group(100, 2, 'cone', [0, 2, 4, 1, 3]),
    ],
  },
  {
    id: 7,
    name: '雨天',
    subtitle: '夜晚 · 风雨中有我',
    hint: '夜里没有自然阳光，多种向日葵！樱桃炸弹留给扎堆的铁桶。',
    message: '下雨天窝在一起看电影，外面的风雨与你们无关。',
    story: '下雨天，也有不一样的风味。外面风大雨大，但你的头靠在我肩上，整个世界就安安静静的。',
    storyTheme: 'rain',
    night: true,
    startSun: 200,
    sunInterval: 0,
    plants: ['sunflower', 'peashooter', 'wallnut', 'snowpea', 'cherry'],
    finalWaveAt: 105,
    spawns: [
      ...group(14, 0, 'normal', [2]),
      ...group(26, 3.5, 'cone', [0, 4]),
      ...group(42, 4, 'imp', [1, 3, 2]),
      ...group(60, 3, 'bucket', [0, 2, 4]),
      ...group(80, 4, 'cone', [3, 1]),
      ...group(105, 2, 'bucket', [2, 0, 4, 1, 3]),
    ],
  },
  {
    id: 8,
    name: '日常',
    subtitle: '白天 · 平凡也幸福',
    hint: '全部植物可用！合理安排阵型，前排坚果后排双发，寒冰辅助。',
    message: '一起逛超市、一起追剧，平淡的日子也挺有意思的。',
    story: '一起逛超市、一起散步、一起游戏。我发现最幸福的事不是轰轰烈烈，而是和你过的每一个普通日子。',
    storyTheme: 'milk',
    night: false,
    startSun: 225,
    sunInterval: 6,
    plants: ['sunflower', 'peashooter', 'wallnut', 'snowpea', 'repeater', 'cherry'],
    finalWaveAt: 110,
    spawns: [
      ...group(12, 2, 'normal', [2, 0]),
      ...group(28, 3, 'cone', [4, 1, 3]),
      ...group(46, 3.5, 'imp', [0, 2, 4]),
      ...group(64, 3, 'bucket', [1, 3]),
      ...group(82, 3, 'cone', [0, 2, 4, 1]),
      ...group(110, 1.8, 'brute', [2, 0]),
      ...group(113, 2, 'bucket', [4, 1, 3]),
    ],
  },
  {
    id: 9,
    name: '星空',
    subtitle: '夜晚 · 一起数星星',
    hint: '壮汉+铁桶联手来袭！樱桃炸弹务必留给最密集的时刻。',
    message: '那天晚上星星很亮，你们坐在公园椅子上很久，什么都没说。',
    story: '那晚我们坐在公园长椅上看星星。我们有说有笑，你笑的时候所有星星都黯然失色。',
    storyTheme: 'star',
    night: true,
    startSun: 250,
    sunInterval: 0,
    plants: ['sunflower', 'peashooter', 'wallnut', 'snowpea', 'repeater', 'cherry'],
    finalWaveAt: 115,
    spawns: [
      ...group(14, 2.5, 'normal', [2, 0, 4]),
      ...group(30, 3, 'cone', [1, 3]),
      ...group(48, 3, 'bucket', [0, 4, 2]),
      ...group(66, 2.5, 'imp', [1, 3, 0, 4]),
      ...group(84, 5, 'brute', [2]),
      ...group(100, 3, 'cone', [1, 3, 0, 4]),
      ...group(115, 1.8, 'brute', [2, 1, 3]),
      ...group(118, 2, 'bucket', [0, 4, 2]),
    ],
  },
  {
    id: 10,
    name: '守护',
    subtitle: '黄昏 · 一生的承诺',
    hint: '最终决战！所有僵尸倾巢出动，用你学到的一切守护这片草坪，守护灿灿。',
    message: '灿灿，接下来也请继续多多关照。',
    story: '从初遇到永远，这条路我们一起走。不管未来还有什么关卡，我都愿意陪你一关一关过下去。',
    storyHighlight: '灿灿，这个游戏是送给你的礼物。愿你永远灿烂。',
    storyTheme: 'gold',
    night: false,
    startSun: 275,
    sunInterval: 5.5,
    plants: ['sunflower', 'peashooter', 'wallnut', 'snowpea', 'repeater', 'cherry'],
    finalWaveAt: 130,
    spawns: [
      ...group(12, 2, 'normal', [2, 0, 4, 1, 3]),
      ...group(28, 2.5, 'cone', [0, 2, 4]),
      ...group(44, 3, 'imp', [1, 3, 2, 0]),
      ...group(60, 3, 'bucket', [4, 1, 3]),
      ...group(78, 2.5, 'brute', [2, 0]),
      ...group(94, 2.5, 'cone', [4, 1, 3, 2, 0]),
      ...group(110, 2, 'bucket', [0, 2, 4]),
      ...group(120, 1.5, 'brute', [1, 3]),
      ...group(124, 1.5, 'imp', [0, 2, 4, 1, 3]),
      ...group(130, 1.5, 'cone', [2, 0, 4, 1, 3]),
    ],
  },
]
