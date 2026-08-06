'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Crown,
  Pencil,
  RefreshCw,
  Save,
  Trophy,
  X,
} from 'lucide-react'
import { LEVELS } from '@/lib/game/data'
import { MATCH3_LEVELS } from '@/lib/game/match3'
import {
  adminAddClearedLevels,
  adminCreateUser,
  adminGetUser,
  adminListUsers,
  adminOverwriteUser,
  type AdminGame,
  type AdminUserSummary,
  type Progress,
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AdminPanelProps {
  onBack: () => void
}

/** 秒数格式化为 mm:ss */
function fmtTime(sec?: number): string {
  if (!sec || sec <= 0) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** 毫秒时间戳格式化为本地时间字符串 */
function fmtDate(ms?: number): string {
  if (!ms) return '从未'
  try {
    return new Date(ms).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function AdminPanel({ onBack }: AdminPanelProps) {
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await adminListUsers()
      setUsers(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6 sm:max-w-2xl">
      {/* 顶部栏 */}
      <header className="mb-5 flex items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-2 text-sm font-bold text-secondary-foreground transition-transform active:scale-95"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          菜单
        </button>
        <h1 className="flex items-center gap-1.5 font-display text-xl font-extrabold">
          <Crown className="size-5 text-amber-500" aria-hidden="true" />
          管理后台
        </h1>
        <button
          onClick={refresh}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground shadow-sm transition-transform active:scale-95 disabled:opacity-60"
          title="刷新"
        >
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} aria-hidden="true" />
          刷新
        </button>
      </header>

      {/* 摘要卡 */}
      <section className="mb-5 grid grid-cols-2 gap-3">
        <StatCard label="用户总数" value={users.length.toString()} />
        <StatCard
          label="累计在线时长"
          value={fmtTime(users.reduce((s, u) => s + (u.totalPlayTimeSec ?? 0), 0))}
        />
      </section>

      <DataManagement users={users} onChanged={refresh} />

      {error && (
        <div className="mb-4 rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 用户列表 */}
      <ul className="flex flex-col gap-3">
        {users.map((u) => (
          <li key={u.userId}>
            <UserCard
              user={u}
              onEdit={() => setEditingId(u.userId)}
            />
          </li>
        ))}
      </ul>

      {/* 编辑弹层 */}
      {editingId && (
        <EditDialog
          userId={editingId}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null)
            refresh()
          }}
        />
      )}
    </main>
  )
}

/* ── 摘要小卡 ── */
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-border bg-card p-3">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-extrabold tabular-nums">{value}</p>
    </div>
  )
}

/* ── 用户卡片 ── */
function DataManagement({ users, onChanged }: { users: AdminUserSummary[]; onChanged: () => Promise<void> }) {
  const [newUserId, setNewUserId] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [targetUserIds, setTargetUserIds] = useState<string[]>([])
  const [levelInput, setLevelInput] = useState('')
  const [game, setGame] = useState<AdminGame>('pvz')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCreateUser = async () => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await adminCreateUser(newUserId, newUserName)
      setNewUserId('')
      setNewUserName('')
      setMessage('用户已新增，登录密码就是用户 ID。')
      await onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : '新增用户失败')
    } finally {
      setBusy(false)
    }
  }

  const handleAddCleared = async () => {
    const levelIds = [...new Set(
      levelInput
        .split(/[，,\s]+/)
        .filter(Boolean)
        .map(Number)
        .filter((level) => Number.isInteger(level)),
    )]
    if (targetUserIds.length === 0) {
      setError('请至少选择一位用户')
      return
    }
    if (levelIds.length === 0) {
      setError('请输入关卡编号，例如 1,2,3')
      return
    }

    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await adminAddClearedLevels(targetUserIds, levelIds, game)
      setMessage('通关记录已补录，并已自动解锁到下一关。')
      await onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : '补录通关记录失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className="mb-5 rounded-2xl border-2 border-primary/25 bg-primary/5 p-4">
      <summary className="cursor-pointer font-display text-sm font-extrabold text-primary">
        数据管理（Redis）
      </summary>
      <div className="mt-4 space-y-5">
        <section>
          <p className="text-sm font-bold">新增用户</p>
          <p className="mt-1 text-xs text-muted-foreground">用户 ID 同时作为登录密码。</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              placeholder="用户 ID，例如 002524"
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <input
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="昵称"
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <Button className="mt-2 w-full rounded-xl" onClick={handleCreateUser} disabled={busy}>
            新增用户
          </Button>
        </section>

        <section className="border-t border-primary/15 pt-4">
          <p className="text-sm font-bold">批量补录通关记录</p>
          <p className="mt-1 text-xs text-muted-foreground">选择用户和关卡后，写入 Redis 的 cleared，并自动解锁下一关。</p>
          <div className="mt-2 grid max-h-32 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-border bg-background p-2">
            {users.map((user) => (
              <label key={user.userId} className="flex min-w-0 items-center gap-1.5 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={targetUserIds.includes(user.userId)}
                  onChange={(e) => setTargetUserIds((ids) => (
                    e.target.checked ? [...ids, user.userId] : ids.filter((id) => id !== user.userId)
                  ))}
                />
                <span className="truncate">{user.name}（{user.userId}）</span>
              </label>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-[auto_1fr] gap-2">
            <select
              value={game}
              onChange={(e) => setGame(e.target.value as AdminGame)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              aria-label="选择游戏"
            >
              <option value="pvz">主游戏</option>
              <option value="m3">消消乐</option>
            </select>
            <input
              value={levelInput}
              onChange={(e) => setLevelInput(e.target.value)}
              placeholder="关卡，如 1,2,3"
              className="min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <Button className="mt-2 w-full rounded-xl" onClick={handleAddCleared} disabled={busy || users.length === 0}>
            补录通关
          </Button>
        </section>

        {message && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</p>}
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
      </div>
    </details>
  )
}

function UserCard({ user, onEdit }: { user: AdminUserSummary; onEdit: () => void }) {
  const pvzTotal = LEVELS.length
  const m3Total = MATCH3_LEVELS.length
  return (
    <button
      type="button"
      onClick={onEdit}
      className="w-full rounded-3xl border-2 border-border bg-card p-4 text-left shadow-sm transition-transform active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 font-display text-base font-extrabold text-primary">
          {user.name.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold">{user.name}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" aria-hidden="true" />
            累计 {fmtTime(user.totalPlayTimeSec)}
            <span className="mx-1 opacity-50">·</span>
            最近 {fmtDate(user.lastPlayedAt)}
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>

      {/* 进度条 */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <ProgressMini
          label="主游戏"
          unlocked={user.unlocked}
          cleared={user.clearedCount}
          total={pvzTotal}
        />
        <ProgressMini
          label="消消乐"
          unlocked={user.m3Unlocked}
          cleared={user.m3ClearedCount}
          total={m3Total}
        />
      </div>
    </button>
  )
}

function ProgressMini({ label, unlocked, cleared, total }: { label: string; unlocked: number; cleared: number; total: number }) {
  const unlockedCount = Math.min(Math.max(unlocked, 0), total)
  const clearedCount = Math.min(Math.max(cleared, 0), total)
  const pct = total > 0 ? Math.round((unlockedCount / total) * 100) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-bold text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">解锁 {unlockedCount}/{total}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">通关 {clearedCount}/{total}</p>
    </div>
  )
}

/* ── 编辑弹层：查看 / 修改用户通关数与用时 ── */
function EditDialog({
  userId,
  onClose,
  onSaved,
}: {
  userId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'pvz' | 'm3'>('pvz')

  // 加载完整进度
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    adminGetUser(userId)
      .then((p) => {
        if (!cancelled) setProgress(p)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const handleSave = useCallback(async () => {
    if (!progress) return
    setSaving(true)
    setError(null)
    try {
      await adminOverwriteUser(userId, progress)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
      setSaving(false)
    }
  }, [progress, userId, onSaved])

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-foreground/55 sm:items-center">
      <div className="flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-3xl bg-background shadow-xl sm:rounded-3xl">
        {/* 头部 */}
        <header className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Pencil className="size-4 text-primary" aria-hidden="true" />
          <h2 className="flex-1 font-display text-base font-bold">编辑用户进度</h2>
          <button
            onClick={onClose}
            className="rounded-full bg-secondary p-1.5 text-secondary-foreground transition-transform active:scale-95"
            aria-label="关闭"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && <p className="py-10 text-center text-sm text-muted-foreground">加载中…</p>}
          {error && (
            <div className="mb-3 rounded-2xl border-2 border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          {progress && (
            <>
              {/* 总览 */}
              <div className="mb-4 grid grid-cols-2 gap-3">
                <StatCard label="累计时长" value={fmtTime(progress.totalPlayTimeSec ?? 0)} />
                <StatCard label="最近游玩" value={fmtDate(progress.lastPlayedAt ?? 0)} />
              </div>

              {/* Tab 切换 */}
              <div className="mb-3 flex gap-1 rounded-full bg-secondary p-1">
                <TabButton active={tab === 'pvz'} onClick={() => setTab('pvz')}>
                  主游戏
                </TabButton>
                <TabButton active={tab === 'm3'} onClick={() => setTab('m3')}>
                  消消乐
                </TabButton>
              </div>

              {tab === 'pvz' ? (
                <PvzEditor
                  progress={progress}
                  onChange={setProgress}
                />
              ) : (
                <Match3Editor
                  progress={progress}
                  onChange={setProgress}
                />
              )}
            </>
          )}
        </div>

        {/* 底部按钮 */}
        <footer className="flex items-center gap-2 border-t border-border px-5 py-4">
          <Button variant="secondary" className="flex-1 rounded-full" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button className="flex-1 rounded-full" onClick={handleSave} disabled={saving || !progress}>
            {saving ? '保存中…' : '保存'}
            {!saving && <Save className="ml-1 size-4" />}
          </Button>
        </footer>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
        active ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground',
      )}
    >
      {children}
    </button>
  )
}

/* ── 主游戏编辑 ── */
function PvzEditor({ progress, onChange }: { progress: Progress; onChange: (p: Progress) => void }) {
  const cleared = progress.cleared ?? []
  const unlocked = progress.unlocked ?? 1
  const bestTimes = progress.levelBestTimes ?? {}

  const toggleCleared = (id: number) => {
    const next = cleared.includes(id) ? cleared.filter((x) => x !== id) : [...cleared, id].sort((a, b) => a - b)
    onChange({ ...progress, cleared: next })
  }

  const setUnlocked = (v: number) => {
    const next = Math.max(1, Math.min(LEVELS.length, v))
    onChange({ ...progress, unlocked: next })
  }

  return (
    <div className="space-y-4">
      {/* 解锁到第几关 */}
      <div className="rounded-2xl border-2 border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">已解锁到第几关</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUnlocked(unlocked - 1)}
              className="size-7 rounded-full bg-secondary font-bold text-secondary-foreground active:scale-95"
              aria-label="减少"
            >
              −
            </button>
            <span className="w-8 text-center font-display text-base font-extrabold tabular-nums">{unlocked}</span>
            <button
              type="button"
              onClick={() => setUnlocked(unlocked + 1)}
              className="size-7 rounded-full bg-secondary font-bold text-secondary-foreground active:scale-95"
              aria-label="增加"
            >
              +
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          共 {LEVELS.length} 关，调整后用户可从第 1 关玩到第 {unlocked} 关
        </p>
      </div>

      {/* 关卡通关勾选 */}
      <div>
        <p className="mb-2 flex items-center gap-1 text-sm font-bold">
          <Trophy className="size-3.5 text-amber-500" />
          通关记录（点按切换）
        </p>
        <ul className="grid grid-cols-1 gap-2">
          {LEVELS.map((lv) => {
            const done = cleared.includes(lv.id)
            const time = bestTimes[lv.id]
            return (
              <li
                key={lv.id}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border-2 p-2.5 transition-colors',
                  done ? 'border-primary/40 bg-primary/5' : 'border-border bg-card',
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleCleared(lv.id)}
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-extrabold transition-colors',
                    done ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
                  )}
                >
                  {done ? '✓' : lv.id}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    第{lv.id}关 · {lv.name}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" aria-hidden="true" />
                    最佳 {fmtTime(time)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/* ── 消消乐编辑 ── */
function Match3Editor({ progress, onChange }: { progress: Progress; onChange: (p: Progress) => void }) {
  const cleared = progress.m3Cleared ?? []
  const unlocked = progress.m3Unlocked ?? 1
  const bestTimes = progress.m3LevelBestTimes ?? {}

  const toggleCleared = (id: number) => {
    const next = cleared.includes(id) ? cleared.filter((x) => x !== id) : [...cleared, id].sort((a, b) => a - b)
    onChange({ ...progress, m3Cleared: next })
  }

  const setUnlocked = (v: number) => {
    const next = Math.max(1, Math.min(MATCH3_LEVELS.length, v))
    onChange({ ...progress, m3Unlocked: next })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">已解锁到第几关</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUnlocked(unlocked - 1)}
              className="size-7 rounded-full bg-secondary font-bold text-secondary-foreground active:scale-95"
              aria-label="减少"
            >
              −
            </button>
            <span className="w-8 text-center font-display text-base font-extrabold tabular-nums">{unlocked}</span>
            <button
              type="button"
              onClick={() => setUnlocked(unlocked + 1)}
              className="size-7 rounded-full bg-secondary font-bold text-secondary-foreground active:scale-95"
              aria-label="增加"
            >
              +
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          共 {MATCH3_LEVELS.length} 关，调整后用户可从第 1 关玩到第 {unlocked} 关
        </p>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1 text-sm font-bold">
          <Trophy className="size-3.5 text-amber-500" />
          通关记录（点按切换）
        </p>
        <ul className="grid grid-cols-1 gap-2">
          {MATCH3_LEVELS.map((lv) => {
            const done = cleared.includes(lv.id)
            const time = bestTimes[lv.id]
            return (
              <li
                key={lv.id}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border-2 p-2.5 transition-colors',
                  done ? 'border-primary/40 bg-primary/5' : 'border-border bg-card',
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleCleared(lv.id)}
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-extrabold transition-colors',
                    done ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
                  )}
                >
                  {done ? '✓' : lv.id}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    第{lv.id}关 · {lv.name}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" aria-hidden="true" />
                    最佳 {fmtTime(time)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
