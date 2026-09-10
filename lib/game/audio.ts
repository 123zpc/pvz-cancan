/**
 * 音频引擎。
 * 背景音乐：播放星露谷物语原声 mp3（public/music 目录）。
 * 游戏音效：仍由 Web Audio API 振荡器与噪声实时合成。
 */

/* ── 音符频率表（Hz） ── */
const N = (octave: number) => ({
  C: 16.35 * 2 ** octave,
  'C#': 17.32 * 2 ** octave,
  D: 18.35 * 2 ** octave,
  'D#': 19.45 * 2 ** octave,
  E: 20.60 * 2 ** octave,
  F: 21.83 * 2 ** octave,
  'F#': 23.12 * 2 ** octave,
  G: 24.50 * 2 ** octave,
  'G#': 25.96 * 2 ** octave,
  A: 27.50 * 2 ** octave,
  'A#': 29.14 * 2 ** octave,
  B: 30.87 * 2 ** octave,
})

type NoteName = keyof ReturnType<typeof N>

const freq = (note: `${NoteName}${number}`): number => {
  const m = note.match(/^([A-G]#?)(\d)$/)!
  return N(Number(m[2]))[m[1] as NoteName]
}

interface MelodyNote {
  note: `${NoteName}${2 | 3 | 4 | 5 | 6}` | 'R'
  dur: number
  vel?: number
}

/* ═══════════════════════════════════════════════
   背景音乐 — 星露谷物语原声（ConcernedApe）
   ═══════════════════════════════════════════════ */

type MusicType = 'menu' | 'day' | 'night' | 'match3' | 'garden'

/** 场景与曲目映射，文件位于 public/music */
const MUSIC_TRACKS: Record<MusicType, { src: string; volume: number }> = {
  /** 主菜单等非游戏界面：Stardew Valley Overture */
  menu: { src: '/music/menu-overture.mp3', volume: 0.55 },
  /** 白天战斗：Spring (The Valley Comes Alive) */
  day: { src: '/music/battle-day.mp3', volume: 0.5 },
  /** 夜晚战斗：Winter (Nocturne Of Ice) */
  night: { src: '/music/battle-night.mp3', volume: 0.5 },
  /** 消消乐：Summer (Tropicala) */
  match3: { src: '/music/match3.mp3', volume: 0.5 },
  /** 萌藤贪吃蛇：Dance Of The Moonlight Jellies */
  garden: { src: '/music/starlight-garden.mp3', volume: 0.55 },
}

/** 通关旋律：温暖的胜利钟声 */
const WIN_JINGLE: MelodyNote[] = [
  { note: 'C4', dur: 0.25, vel: 0.45 }, { note: 'E4', dur: 0.25, vel: 0.45 },
  { note: 'G4', dur: 0.25, vel: 0.48 }, { note: 'C5', dur: 0.50, vel: 0.50 },
  { note: 'G4', dur: 0.25, vel: 0.45 }, { note: 'C5', dur: 0.80, vel: 0.50 },
]

/** 失败旋律：轻柔的下行 */
const LOSE_JINGLE: MelodyNote[] = [
  { note: 'G4', dur: 0.50, vel: 0.35 }, { note: 'E4', dur: 0.50, vel: 0.35 },
  { note: 'C4', dur: 0.70, vel: 0.35 }, { note: 'A3', dur: 0.60, vel: 0.32 },
  { note: 'G3', dur: 1.00, vel: 0.30 },
]

/** 大波僵尸来袭 — 低音鼓点 */
const BIG_WAVE: MelodyNote[] = [
  { note: 'G3', dur: 0.15, vel: 0.25 }, { note: 'G3', dur: 0.15, vel: 0.25 },
  { note: 'G3', dur: 0.15, vel: 0.25 }, { note: 'G3', dur: 0.15, vel: 0.25 },
  { note: 'C4', dur: 0.15, vel: 0.28 }, { note: 'C4', dur: 0.15, vel: 0.28 },
  { note: 'C4', dur: 0.15, vel: 0.28 }, { note: 'C4', dur: 0.15, vel: 0.28 },
]

/* ═══════════════════════════════════════════════
   AudioManager — 单例
   ═══════════════════════════════════════════════ */

const STORAGE_MUSIC = 'pvz-audio-music'
const STORAGE_MUTED = 'pvz-audio-muted'
const STORAGE_SFX = 'pvz-audio-sfx'

function loadBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key)
    if (v === null) return fallback
    return v === 'true'
  } catch { return fallback }
}

function saveBool(key: string, v: boolean) {
  try { localStorage.setItem(key, String(v)) } catch { /* 忽略 */ }
}

class AudioManager {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private _muted = false
  private _musicOn = true
  private _sfxOn = true
  private musicEl: HTMLAudioElement | null = null
  private musicElType: MusicType | null = null
  private currentMusicType: MusicType | null = null
  private _resumeListener = false
  private _musicRetryListener = false

  constructor() {
    this._musicOn = loadBool(STORAGE_MUSIC, true)
    this._muted = loadBool(STORAGE_MUTED, false)
    this._sfxOn = loadBool(STORAGE_SFX, true)
  }

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.masterGain = this.ctx.createGain()
      this.masterGain.connect(this.ctx.destination)
      this.masterGain.gain.value = this._muted ? 0 : 0.30
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
      this._ensureResumeOnGesture()
    }
    return this.ctx
  }

  private _ensureResumeOnGesture() {
    if (this._resumeListener) return
    this._resumeListener = true
    const resume = () => {
      if (this.ctx?.state === 'suspended') this.ctx.resume()
      if (this.ctx?.state !== 'suspended') {
        document.removeEventListener('touchstart', resume)
        document.removeEventListener('touchend', resume)
        document.removeEventListener('click', resume)
      }
    }
    document.addEventListener('touchstart', resume, { passive: true })
    document.addEventListener('touchend', resume, { passive: true })
    document.addEventListener('click', resume, { passive: true })
  }

  get muted() { return this._muted }
  get musicOn() { return this._musicOn }
  get sfxOn() { return this._sfxOn }

  toggleMute() {
    this._muted = !this._muted
    saveBool(STORAGE_MUTED, this._muted)
    if (this.masterGain) {
      this.masterGain.gain.value = this._muted ? 0 : 0.30
    }
    if (this.musicEl) {
      this.musicEl.volume = this._muted ? 0 : (this.musicElType ? MUSIC_TRACKS[this.musicElType].volume : 0.5)
    }
    if (this._muted) {
      this.stopMusic()
    } else if (this._musicOn && this.currentMusicType) {
      this.startMusic(this.currentMusicType)
    }
  }

  toggleMusic() {
    this._musicOn = !this._musicOn
    saveBool(STORAGE_MUSIC, this._musicOn)
    if (this._musicOn) {
      if (this.currentMusicType) this.startMusic(this.currentMusicType)
    } else {
      this.stopMusic()
    }
  }

  toggleSfx() {
    this._sfxOn = !this._sfxOn
    saveBool(STORAGE_SFX, this._sfxOn)
  }

  setVolume(v: number) {
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, v))
  }

  /* ── 音乐播放（星露谷原声 mp3） ── */

  startMusic(type: MusicType) {
    this.currentMusicType = type
    if (!this._musicOn || this._muted) return
    // 同曲目正在播放时不打断，保证跨界面音乐连续
    if (this.musicEl && this.musicElType === type && !this.musicEl.paused) return
    this._playTrack(type)
  }

  stopMusic() {
    this.musicEl?.pause()
  }

  private _playTrack(type: MusicType) {
    if (typeof window === 'undefined') return
    const track = MUSIC_TRACKS[type]
    if (!this.musicEl) {
      this.musicEl = new Audio()
      this.musicEl.loop = true
      this.musicEl.preload = 'auto'
    }
    if (this.musicElType !== type) {
      this.musicEl.src = track.src
      this.musicElType = type
    }
    this.musicEl.volume = this._muted ? 0 : track.volume
    const p = this.musicEl.play()
    if (p) p.catch(() => this._ensureMusicRetryOnGesture())
  }

  /** iOS 等平台要求用户交互后才能播放音频：播放被拒时挂全局手势监听，首次交互时重试 */
  private _ensureMusicRetryOnGesture() {
    if (this._musicRetryListener) return
    this._musicRetryListener = true
    const retry = () => {
      if (this.musicEl?.paused && this._musicOn && !this._muted && this.currentMusicType) {
        this.musicEl.play()
          ?.then(() => {
            document.removeEventListener('touchstart', retry)
            document.removeEventListener('touchend', retry)
            document.removeEventListener('click', retry)
            this._musicRetryListener = false
          })
          .catch(() => { /* 继续等待下一次手势 */ })
      }
    }
    document.addEventListener('touchstart', retry, { passive: true })
    document.addEventListener('touchend', retry, { passive: true })
    document.addEventListener('click', retry, { passive: true })
  }

  /* ── 一次性音效 ── */

  private _sfx(): boolean {
    return this._sfxOn
  }

  /** 放置植物：短促上行音 */
  playPlant() {
    if (!this._sfx()) return
    const ctx = this.getCtx()
    const now = ctx.currentTime
    const notes = [freq('C4'), freq('E4'), freq('G4')]
    notes.forEach((hz, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = hz
      const t = now + i * 0.07
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
      osc.connect(gain)
      gain.connect(this.masterGain!)
      osc.start(t)
      osc.stop(t + 0.2)
    })
  }

  /** 铲除植物：下行音 */
  playDig() {
    if (!this._sfx()) return
    const ctx = this.getCtx()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq('G4'), now)
    osc.frequency.linearRampToValueAtTime(freq('C3'), now + 0.18)
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
    osc.connect(gain)
    gain.connect(this.masterGain!)
    osc.start(now)
    osc.stop(now + 0.25)
  }

  /** 射击：短促音 */
  playShoot() {
    if (!this._sfx()) return
    const ctx = this.getCtx()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq('C6'), now)
    osc.frequency.exponentialRampToValueAtTime(freq('C5'), now + 0.06)
    gain.gain.setValueAtTime(0.10, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.10)
    osc.connect(gain)
    gain.connect(this.masterGain!)
    osc.start(now)
    osc.stop(now + 0.12)
  }

  /** 冰冻射击 */
  playFreezeShoot() {
    if (!this._sfx()) return
    const ctx = this.getCtx()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq('E6'), now)
    osc.frequency.exponentialRampToValueAtTime(freq('E5'), now + 0.12)
    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14)
    osc.connect(gain)
    gain.connect(this.masterGain!)
    osc.start(now)
    osc.stop(now + 0.16)
  }

  /** 收集阳光：清脆 "叮" */
  playSun() {
    if (!this._sfx()) return
    const ctx = this.getCtx()
    const now = ctx.currentTime
    const sunNotes = [freq('C5'), freq('E5'), freq('G5')]
    sunNotes.forEach((hz, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = hz
      const t = now + i * 0.05
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.16, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
      osc.connect(gain)
      gain.connect(this.masterGain!)
      osc.start(t)
      osc.stop(t + 0.28)
    })
  }

  /** 樱桃炸弹爆炸 */
  playExplosion() {
    if (!this._sfx()) return
    const ctx = this.getCtx()
    const now = ctx.currentTime
    const bufferSize = ctx.sampleRate * 0.5
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2)
    }
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.25, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(2500, now)
    filter.frequency.exponentialRampToValueAtTime(150, now + 0.45)
    noise.connect(filter)
    filter.connect(noiseGain)
    noiseGain.connect(this.masterGain!)
    noise.start(now)
    noise.stop(now + 0.55)

    const osc = ctx.createOscillator()
    const oscGain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(70, now)
    osc.frequency.exponentialRampToValueAtTime(18, now + 0.35)
    oscGain.gain.setValueAtTime(0.35, now)
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    osc.connect(oscGain)
    oscGain.connect(this.masterGain!)
    osc.start(now)
    osc.stop(now + 0.45)
  }

  /** 僵尸死亡 */
  playZombieDie() {
    const ctx = this.getCtx()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq('G3'), now)
    osc.frequency.exponentialRampToValueAtTime(freq('C2'), now + 0.3)
    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(600, now)
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.3)
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain!)
    osc.start(now)
    osc.stop(now + 0.38)
  }

  /** 按钮点击 */
  playClick() {
    const ctx = this.getCtx()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 660
    gain.gain.setValueAtTime(0.06, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
    osc.connect(gain)
    gain.connect(this.masterGain!)
    osc.start(now)
    osc.stop(now + 0.06)
  }

  /** 大波僵尸警报 */
  playBigWave() {
    const ctx = this.getCtx()
    const now = ctx.currentTime
    BIG_WAVE.forEach((mn, i) => {
      if (mn.note === 'R') return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq(mn.note)
      const t = now + i * 0.15
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.12, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
      osc.connect(gain)
      gain.connect(this.masterGain!)
      osc.start(t)
      osc.stop(t + 0.14)
    })
  }

  /** 小推车 */
  playMower() {
    const ctx = this.getCtx()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(110, now)
    osc.frequency.linearRampToValueAtTime(180, now + 0.5)
    osc.frequency.linearRampToValueAtTime(70, now + 1.0)
    gain.gain.setValueAtTime(0.05, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0)
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 350
    filter.Q.value = 2
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain!)
    osc.start(now)
    osc.stop(now + 1.1)
  }

  /** 通关旋律 */
  playWin() {
    const ctx = this.getCtx()
    const now = ctx.currentTime
    this.stopMusic()
    WIN_JINGLE.forEach((mn, i) => {
      if (mn.note === 'R') return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq(mn.note)
      const t = now + WIN_JINGLE.slice(0, i).reduce((s, n) => s + n.dur, 0)
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.28, t + 0.03)
      gain.gain.setValueAtTime(0.28, t + mn.dur * 0.6)
      gain.gain.linearRampToValueAtTime(0, t + mn.dur)
      osc.connect(gain)
      gain.connect(this.masterGain!)
      osc.start(t)
      osc.stop(t + mn.dur + 0.1)
    })
  }

  /** 失败旋律 */
  playLose() {
    const ctx = this.getCtx()
    const now = ctx.currentTime
    this.stopMusic()
    LOSE_JINGLE.forEach((mn, i) => {
      if (mn.note === 'R') return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq(mn.note)
      const t = now + LOSE_JINGLE.slice(0, i).reduce((s, n) => s + n.dur, 0)
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.22, t + 0.03)
      gain.gain.setValueAtTime(0.22, t + mn.dur * 0.6)
      gain.gain.linearRampToValueAtTime(0, t + mn.dur)
      osc.connect(gain)
      gain.connect(this.masterGain!)
      osc.start(t)
      osc.stop(t + mn.dur + 0.1)
    })
  }

  /* ── 消消乐音效 ── */

  playMatch() {
    const ctx = this.getCtx()
    const now = ctx.currentTime
    const matchNotes = [freq('C5'), freq('E5'), freq('G5'), freq('C6')]
    matchNotes.forEach((hz, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = hz
      const t = now + i * 0.06
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.13, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
      osc.connect(gain)
      gain.connect(this.masterGain!)
      osc.start(t)
      osc.stop(t + 0.2)
    })
  }

  playChain(level: number) {
    const ctx = this.getCtx()
    const now = ctx.currentTime
    const notes: `${NoteName}${number}`[] = ['C5', 'E5', 'G5', 'C6', 'E6', 'G6']
    const count = Math.min(level + 2, notes.length)
    notes.slice(0, count).forEach((note, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq(note)
      const t = now + i * 0.07
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.16, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
      osc.connect(gain)
      gain.connect(this.masterGain!)
      osc.start(t)
      osc.stop(t + 0.25)
    })
  }

  playPowerup(type: 'bomb' | 'beam' | 'shuffle') {
    const ctx = this.getCtx()
    const now = ctx.currentTime
    if (type === 'bomb') {
      this.playExplosion()
      return
    }
    if (type === 'beam') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq('C6'), now)
      osc.frequency.exponentialRampToValueAtTime(freq('C4'), now + 0.35)
      gain.gain.setValueAtTime(0.10, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(1800, now)
      filter.frequency.exponentialRampToValueAtTime(350, now + 0.35)
      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.masterGain!)
      osc.start(now)
      osc.stop(now + 0.45)
      return
    }
    const shuffleNotes = [freq('C4'), freq('E4'), freq('G4'), freq('C5')]
    shuffleNotes.forEach((hz, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = hz
      const t = now + i * 0.05
      gain.gain.setValueAtTime(0.10, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14)
      osc.connect(gain)
      gain.connect(this.masterGain!)
      osc.start(t)
      osc.stop(t + 0.16)
    })
  }

  playMatch3Win() {
    this.playWin()
  }
}

/** 全局单例 */
export const audio = new AudioManager()