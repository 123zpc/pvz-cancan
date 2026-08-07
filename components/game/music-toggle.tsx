'use client'

import { useCallback, useEffect, useState } from 'react'
import { Music, Music2, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { audio } from '@/lib/game/audio'

type ToggleMode = 'music' | 'sfx'

interface ToggleProps {
  mode?: ToggleMode
}

/**
 * 音乐/音效开关按钮
 * - mode="music"（默认）：控制背景音乐开关，用于非游戏界面（主菜单等）
 * - mode="sfx"：控制游戏音效开关，用于游戏界面（battle、match3 等）
 */
export function MusicToggle({ mode = 'music' }: ToggleProps) {
  const isMusic = mode === 'music'
  const [on, setOn] = useState(() => isMusic ? audio.musicOn : audio.sfxOn)

  useEffect(() => {
    setOn(isMusic ? audio.musicOn : audio.sfxOn)
  }, [isMusic])

  const toggle = useCallback(() => {
    if (isMusic) {
      audio.toggleMusic()
      setOn(audio.musicOn)
    } else {
      audio.toggleSfx()
      setOn(audio.sfxOn)
    }
  }, [isMusic])

  const title = isMusic
    ? (on ? '关闭背景音乐' : '开启背景音乐')
    : (on ? '关闭游戏音效' : '开启游戏音效')

  return (
    <Button
      variant="secondary"
      size="icon"
      className="rounded-full"
      onClick={toggle}
      title={title}
    >
      {on ? (
        isMusic ? <Music2 className="size-4" /> : <Volume2 className="size-4" />
      ) : (
        <VolumeX className="size-4" />
      )}
      <span className="sr-only">{title}</span>
    </Button>
  )
}

/**
 * 完整版音乐/音效控制：开关 + 静音
 * - mode="music"（默认）：背景音乐 + 静音
 * - mode="sfx"：游戏音效 + 静音
 */
export function MusicToggleFull({ mode = 'music' }: ToggleProps) {
  const isMusic = mode === 'music'
  const [on, setOn] = useState(() => isMusic ? audio.musicOn : audio.sfxOn)
  const [muted, setMuted] = useState(() => audio.muted)

  useEffect(() => {
    setOn(isMusic ? audio.musicOn : audio.sfxOn)
    setMuted(audio.muted)
  }, [isMusic])

  const toggleLabel = isMusic
    ? (on ? '关闭背景音乐' : '开启背景音乐')
    : (on ? '关闭游戏音效' : '开启游戏音效')

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="secondary"
        size="icon-sm"
        className="rounded-full"
        onClick={() => {
          if (isMusic) {
            audio.toggleMusic()
            setOn(audio.musicOn)
          } else {
            audio.toggleSfx()
            setOn(audio.sfxOn)
          }
        }}
        title={toggleLabel}
      >
        {on ? (
          isMusic ? <Music2 className="size-3.5" /> : <Volume2 className="size-3.5" />
        ) : (
          <Music className="size-3.5" />
        )}
      </Button>
      <Button
        variant="secondary"
        size="icon-sm"
        className="rounded-full"
        onClick={() => {
          audio.toggleMute()
          setMuted(audio.muted)
        }}
        title={muted ? '取消静音' : '静音'}
      >
        <VolumeX className={muted ? 'size-3.5 text-destructive' : 'size-3.5'} />
      </Button>
    </div>
  )
}