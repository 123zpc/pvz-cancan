/**
 * 后端 API 客户端。
 * 对接 Spring Boot 后端（默认 http://localhost:8080），
 * 提供 登录 与 通关进度持久化 两个接口。
 */

/**
 * 后端地址：
 * - 生产环境：留空（同源），由 OpenResty 反向代理 /api/* 到后端 8080
 * - 开发环境：通过 NEXT_PUBLIC_API_BASE 指向后端，默认 http://localhost:8080
 */
export const API_BASE =
  process.env.NODE_ENV === 'production'
    ? ''
    : process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8081'

/** 进度数据结构：主游戏 + 消消乐 + 星愿花园 + 用时统计 */
export interface Progress {
  unlocked: number
  cleared: number[]
  m3Unlocked?: number
  m3Cleared?: number[]
  /** 累计游戏时长（秒） */
  totalPlayTimeSec?: number
  /** 主游戏每关最佳通关用时（秒），key 为关卡 id */
  levelBestTimes?: Record<number, number>
  /** 消消乐每关最佳通关用时（秒） */
  m3LevelBestTimes?: Record<number, number>
  /** 星愿花园历史最高星光分数 */
  starlightBestScore?: number
  /** 最近一次保存进度的时间戳（epoch 毫秒） */
  lastPlayedAt?: number
}

/** 登录响应 */
export interface LoginResult {
  token: string
  userId: string
  name: string
}

export interface EndlessLeaderboardEntry {
  userId: string
  name: string
  score: number
  rank: number
}

export interface EndlessLeaderboard {
  entries: EndlessLeaderboardEntry[]
  myScore: number
  myRank: number
  scoreToBeat: number
}

/** 管理后台用户列表项 */
export interface AdminUserSummary {
  userId: string
  name: string
  unlocked: number
  cleared: number[]
  clearedCount: number
  m3Unlocked: number
  m3Cleared: number[]
  m3ClearedCount: number
  totalPlayTimeSec: number
  levelBestTimes: Record<number, number>
  m3LevelBestTimes: Record<number, number>
  starlightBestScore: number
  lastPlayedAt: number
}

export type AdminGame = 'pvz' | 'm3'

/** 节日主题配置 */
export interface FestivalConfig {
  /** 七夕限定主题（星空鹊桥装饰 + 彩蛋），管理后台可开关 */
  qixi: boolean
}

const TOKEN_KEY = 'pvz-cancan-token'
const NAME_KEY = 'pvz-cancan-name'
const USERID_KEY = 'pvz-cancan-userid'

/* ── token 本地缓存 ── */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getUserName(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(NAME_KEY)
}

export function getUserId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(USERID_KEY)
}

/** 管理员 userId（与后端 UserService.ADMIN_USER_ID 保持一致） */
export const ADMIN_USER_ID = '020510'

export function isAdmin(): boolean {
  return getUserId() === ADMIN_USER_ID
}

function cacheAuth(token: string, name: string, userId: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(NAME_KEY, name)
    localStorage.setItem(USERID_KEY, userId)
  } catch { /* 忽略 */ }
}

export function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(NAME_KEY)
    localStorage.removeItem(USERID_KEY)
  } catch { /* 忽略 */ }
}

/* ── 网络请求封装 ── */
async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (options.auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })
  if (!res.ok) {
    const msg = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((msg as { error?: string }).error ?? '请求失败')
  }
  return res.json() as Promise<T>
}

/* ── 对外接口 ── */

/** 登录：密码即用户身份。成功后缓存 token。 */
export async function login(password: string): Promise<LoginResult> {
  const data = await request<LoginResult>('/api/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
  cacheAuth(data.token, data.name, data.userId)
  return data
}

/** 读取当前用户进度。token 失效会抛错。 */
export async function getProgress(): Promise<Progress> {
  return request<Progress>('/api/progress', { auth: true })
}

/** 保存当前用户进度。 */
export async function saveProgress(progress: Progress): Promise<void> {
  await request<{ success: boolean }>('/api/progress', {
    method: 'POST',
    body: JSON.stringify(progress),
    auth: true,
  })
}

export async function getEndlessLeaderboard(): Promise<EndlessLeaderboard> {
  return request<EndlessLeaderboard>('/api/match3/endless/leaderboard', { auth: true })
}

export async function submitEndlessScore(score: number): Promise<EndlessLeaderboard> {
  return request<EndlessLeaderboard>('/api/match3/endless/score', {
    method: 'POST',
    body: JSON.stringify({ score }),
    auth: true,
  })
}

/** 读取节日主题配置（七夕主题开关）。 */
export async function getFestivalConfig(): Promise<FestivalConfig> {
  return request<FestivalConfig>('/api/config/festival', { auth: true })
}

/* ── 管理员接口 ── */

/** 列出所有用户进度摘要。 */
export async function adminListUsers(): Promise<AdminUserSummary[]> {
  const data = await request<{ users: AdminUserSummary[] }>('/api/admin/users', { auth: true })
  return data.users
}

/** 管理员新增用户。新用户的登录密码即用户 ID。 */
export async function adminCreateUser(userId: string, name: string): Promise<void> {
  await request<{ success: boolean }>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify({ userId, name }),
    auth: true,
  })
}

/** 管理员批量补录通关记录，并自动解锁到下一关。 */
export async function adminAddClearedLevels(
  userIds: string[],
  levelIds: number[],
  game: AdminGame,
): Promise<void> {
  await request<{ success: boolean }>('/api/admin/progress/cleared', {
    method: 'POST',
    body: JSON.stringify({ userIds, levelIds, game }),
    auth: true,
  })
}

/** 读取指定用户完整进度。 */
export async function adminGetUser(userId: string): Promise<Progress> {
  return request<Progress>(`/api/admin/users/${encodeURIComponent(userId)}`, { auth: true })
}

/** 覆盖指定用户进度。 */
export async function adminOverwriteUser(userId: string, progress: Progress): Promise<void> {
  await request<{ success: boolean }>(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: 'POST',
    body: JSON.stringify(progress),
    auth: true,
  })
}

/** 管理员切换节日主题（七夕）开关。 */
export async function adminSetFestivalConfig(qixi: boolean): Promise<FestivalConfig> {
  return request<FestivalConfig>('/api/admin/config/festival', {
    method: 'POST',
    body: JSON.stringify({ qixi }),
    auth: true,
  })
}
