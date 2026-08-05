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
    : process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080'

/** 进度数据结构 */
export interface Progress {
  unlocked: number
  cleared: number[]
}

/** 登录响应 */
export interface LoginResult {
  token: string
  userId: string
  name: string
}

const TOKEN_KEY = 'pvz-cancan-token'
const NAME_KEY = 'pvz-cancan-name'

/* ── token 本地缓存 ── */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getUserName(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(NAME_KEY)
}

function cacheAuth(token: string, name: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(NAME_KEY, name)
  } catch { /* 忽略 */ }
}

export function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(NAME_KEY)
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
  cacheAuth(data.token, data.name)
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
