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
  Sparkles,
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
  adminSetFestivalConfig,
  getFestivalConfig,
  type AdminGame,
  type AdminUserSummary,
  type Progress,
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AdminPanelProps {
  onBack: () => void
  /** 七夕主题开关变化后回调（让全局立即换装） */
  onFestivalChanged?: () => void
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

export function AdminPanel({ onBack, onFestivalChanged }: AdminPanelProps) {
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
      <section className="mb-5 grid grid-cols-3 gap-2.5">
        <StatCard label="用户总数" value={users.length.toString()} />
        <StatCard
          label="累计在线时长"
          value={fmtTime(users.reduce((s, u) => s + (u.totalPlayTimeSec ?? 0), 0))}
        />
        <StatCard
          label="贪吃蛇最高纪录"
          value={(() => {
            const top = users.reduce((m, u) => Math.max(m, u.starlightBestScore || 0), 0)
            return top > 0 ? `${top}分` : '0分'
          })()}
        />
      </section>

      <DataManagement users={users} onChanged={refresh} />

      <FestivalSection onChanged={onFestivalChanged} />

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

/* ── 节日主题（七夕限定）开关 ── */
function FestivalSection({ onChanged }: { onChanged?: () => void }) {
  const [qixi, setQixi] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getFestivalConfig()
      .then((c) => {
        if (!cancelled) setQixi(c.qixi)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '读取节日配置失败')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const toggle = async () => {
    if (qixi === null || busy) return
    setBusy(true)
    setError(null)
    try {
      const c = await adminSetFestivalConfig(!qixi)
      setQixi(c.qixi)
      onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : '切换失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mb-5 rounded-2xl border-2 border-rose-200 bg-rose-50/60 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-rose-500" aria-hidden="true" />
        <p className="font-display text-sm font-extrabold text-rose-600">节日主题 · 七夕限定</p>
        {/* 开关 */}
        <button
          type="button"
          role="switch"
          aria-checked={qixi === true}
          aria-label="七夕主题开关"
          onClick={toggle}
          disabled={busy || qixi === null}
          className={cn(
            'ml-auto relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60',
            qixi ? 'bg-primary' : 'border-2 border-border bg-secondary',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 size-6 rounded-full bg-white shadow transition-all duration-200',
              qixi ? 'left-[22px]' : 'left-0.5',
            )}
          />
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        开启后全站换上玫瑰色调，菜单飘起星空鹊桥与流星，点喜鹊有诗词彩蛋，每日首次进入还有七夕祝福卡；关闭则恢复经典草坪风。
        修改立即生效，其他设备重新进入或刷新后同步。
      </p>
      <p className={cn('mt-2 text-xs font-bold', qixi ? 'text-rose-500' : 'text-muted-foreground')}>
        {qixi === null ? '读取中…' : qixi ? '已开启 · 星河浪漫进行中' : '已关闭 · 经典草坪风'}
      </p>
      {error && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
    </section>
  )
}

export function getSnakeRank(score: number): string {
  if (score >= 3000) return '极光通天龙 🌟'
  if (score >= 1500) return '繁花巨藤 🌸'
  if (score >= 800) return '灵动藤苗 🌿'
  if (score >= 300) return '破土嫩芽 🌱'
  if (score > 0) return '初探草坪 🍀'
  return '未入驻 🍃'
}

function UserCard({ user, onEdit }: { user: AdminUserSummary; onEdit: () => void }) {
  const pvzTotal = LEVELS.length
  const m3Total = MATCH3_LEVELS.length
  const snakeScore = user.starlightBestScore || 0

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
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
            <Sparkles className="size-3" aria-hidden="true" />
            贪吃蛇 {snakeScore > 0 ? `${snakeScore}分` : '未游玩'}
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>

      {/* 三大游戏模块进度 */}
      <div className="mt-3 grid grid-cols-3 gap-2">
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
        <div className="flex flex-col justify-between rounded-xl bg-secondary/50 p-2 text-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
            <span>萌藤贪吃蛇</span>
            <span className={snakeScore > 0 ? 'font-extrabold text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>
              {snakeScore > 0 ? '已入驻' : '未游玩'}
            </span>
          </div>
          <div className="my-1">
            <span className="font-display text-sm font-extrabold tabular-nums text-foreground">
              {snakeScore}
            </span>
            <span className="ml-0.5 text-[10px] text-muted-foreground">分</span>
          </div>
          <p className="truncate text-[10px] font-medium text-muted-foreground">
            {getSnakeRank(snakeScore)}
          </p>
        </div>
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
  const [tab, setTab] = useState<'pvz' | 'm3' | 'snake'>('pvz')

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
                <TabButton active={tab === 'snake'} onClick={() => setTab('snake')}>
                  萌藤贪吃蛇
                </TabButton>
              </div>

              {tab === 'pvz' && (
                <PvzEditor
                  progress={progress}
                  onChange={setProgress}
                />
              )}
              {tab === 'm3' && (
                <Match3Editor
                  progress={progress}
                  onChange={setProgress}
                />
              )}
              {tab === 'snake' && (
                <SnakeEditor
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

/* ── 萌藤贪吃蛇编辑 ── */
function SnakeEditor({ progress, onChange }: { progress: Progress; onChange: (p: Progress) => void }) {
  const score = progress.starlightBestScore ?? 0

  const setScore = (v: number) => {
    onChange({ ...progress, starlightBestScore: Math.max(0, Math.floor(v)) })
  }

  return (
    <div className="space-y-4">
      {/* 荣誉概览卡 */}
      <div className="rounded-2xl border-2 border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <Sparkles className="size-6" />
        </div>
        <h4 className="font-display text-base font-extrabold text-foreground">
          萌藤贪吃蛇 · 历史最高记录
        </h4>
        <div className="mt-1 flex items-baseline justify-center gap-1">
          <span className="font-display text-3xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
            {score}
          </span>
          <span className="text-xs font-bold text-muted-foreground">分</span>
        </div>
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-extrabold text-secondary-foreground">
          当前段位：{getSnakeRank(score)}
        </div>
      </div>

      {/* 修改分值 */}
      <div className="rounded-2xl border-2 border-border bg-card p-4">
        <label className="mb-2 block text-xs font-bold text-muted-foreground">
          修改贪吃蛇最高得分（输入或快捷增减）
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={score}
            onChange={(e) => setScore(Number(e.target.value) || 0)}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 font-display text-base font-bold tabular-nums outline-none focus:border-primary"
            placeholder="输入分值"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setScore(0)}
            className="rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10"
          >
            清零
          </Button>
        </div>

        {/* 快捷增减分值按钮 */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setScore(score + 100)}
            className="rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground transition active:scale-95"
          >
            +100 分
          </button>
          <button
            type="button"
            onClick={() => setScore(score + 500)}
            className="rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground transition active:scale-95"
          >
            +500 分
          </button>
          <button
            type="button"
            onClick={() => setScore(score + 1000)}
            className="rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground transition active:scale-95"
          >
            +1000 分
          </button>
          <button
            type="button"
            onClick={() => setScore(2025)}
            className="rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground transition active:scale-95"
          >
            设为 2025 分
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          点击下方“保存”写入 Redis，用户重新进入或刷新即可同步最新纪录。
        </p>
      </div>
    </div>
  )
}

