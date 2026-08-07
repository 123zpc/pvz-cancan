/**
 * 音频引擎 - 使用 Web Audio API 合成游戏音乐与音效。
 * 风格参考星露谷物语：温暖、舒缓、田园。
 * 无需外部音频文件，所有声音由振荡器与噪声实时生成。
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
   原创旋律 — 星露谷物语风格 · 灿灿专属
   特点：慢速、温暖、大调、五声音阶，像阳光洒在草坪上
   ═══════════════════════════════════════════════ */

/** 主菜单主题：早安，草坪 — 温暖 C 大调，像清晨第一缕阳光 */
const MENU_THEME: MelodyNote[] = [
  { note: 'C4', dur: 1.0, vel: 0.38 }, { note: 'E4', dur: 0.8, vel: 0.38 },
  { note: 'G4', dur: 1.2, vel: 0.42 }, { note: 'C5', dur: 1.5, vel: 0.42 },
  { note: 'R', dur: 0.6 },
  { note: 'G4', dur: 0.8, vel: 0.34 }, { note: 'A4', dur: 0.8, vel: 0.34 },
  { note: 'G4', dur: 0.8, vel: 0.34 }, { note: 'E4', dur: 1.2, vel: 0.38 },
  { note: 'D4', dur: 0.8, vel: 0.34 }, { note: 'E4', dur: 0.8, vel: 0.34 },
  { note: 'D4', dur: 0.8, vel: 0.34 }, { note: 'C4', dur: 1.8, vel: 0.38 },
  { note: 'R', dur: 0.8 },
  { note: 'E4', dur: 0.8, vel: 0.38 }, { note: 'G4', dur: 0.8, vel: 0.38 },
  { note: 'A4', dur: 1.0, vel: 0.42 }, { note: 'C5', dur: 1.0, vel: 0.42 },
  { note: 'D5', dur: 0.8, vel: 0.40 }, { note: 'C5', dur: 0.8, vel: 0.40 },
  { note: 'A4', dur: 1.2, vel: 0.38 }, { note: 'G4', dur: 1.2, vel: 0.38 },
  { note: 'E4', dur: 0.8, vel: 0.34 }, { note: 'D4', dur: 0.8, vel: 0.34 },
  { note: 'C4', dur: 2.0, vel: 0.38 },
]

/** 菜单低音线：简单根音，温暖铺垫 */
const MENU_BASS: MelodyNote[] = [
  { note: 'C3', dur: 4.0, vel: 0.14 }, { note: 'G2', dur: 4.0, vel: 0.14 },
  { note: 'A2', dur: 4.0, vel: 0.14 }, { note: 'F2', dur: 4.0, vel: 0.14 },
  { note: 'C3', dur: 4.0, vel: 0.14 }, { note: 'G2', dur: 4.0, vel: 0.14 },
  { note: 'F2', dur: 2.0, vel: 0.14 }, { note: 'G2', dur: 2.0, vel: 0.14 },
  { note: 'C3', dur: 4.0, vel: 0.14 },
]

/** 菜单和弦铺垫：C - G - Am - F */
const MENU_CHORDS: { notes: `${NoteName}${number}`[]; dur: number }[] = [
  { notes: ['C3', 'E3', 'G3'], dur: 18.0 },
  { notes: ['G2', 'B2', 'D3'], dur: 18.0 },
  { notes: ['A2', 'C3', 'E3'], dur: 18.0 },
  { notes: ['F2', 'A2', 'C3'], dur: 18.0 },
]

/** 白天战斗主题：阳光草坪 — 轻快但不急促，像在花园里劳作 */
const DAY_BATTLE: MelodyNote[] = [
  { note: 'C4', dur: 0.7, vel: 0.38 }, { note: 'E4', dur: 0.6, vel: 0.38 },
  { note: 'G4', dur: 0.9, vel: 0.40 }, { note: 'E4', dur: 0.6, vel: 0.35 },
  { note: 'C5', dur: 0.9, vel: 0.42 }, { note: 'A4', dur: 0.6, vel: 0.38 },
  { note: 'G4', dur: 0.9, vel: 0.38 }, { note: 'E4', dur: 0.7, vel: 0.35 },
  { note: 'F4', dur: 0.7, vel: 0.38 }, { note: 'A4', dur: 0.6, vel: 0.38 },
  { note: 'C5', dur: 0.9, vel: 0.40 }, { note: 'A4', dur: 0.6, vel: 0.35 },
  { note: 'G4', dur: 0.9, vel: 0.38 }, { note: 'E4', dur: 0.6, vel: 0.35 },
  { note: 'D4', dur: 0.7, vel: 0.34 }, { note: 'C4', dur: 1.2, vel: 0.38 },
  { note: 'R', dur: 0.5 },
  { note: 'G4', dur: 0.7, vel: 0.38 }, { note: 'C5', dur: 0.6, vel: 0.40 },
  { note: 'E5', dur: 0.9, vel: 0.42 }, { note: 'D5', dur: 0.6, vel: 0.40 },
  { note: 'C5', dur: 0.9, vel: 0.40 }, { note: 'A4', dur: 0.6, vel: 0.38 },
  { note: 'G4', dur: 0.9, vel: 0.38 }, { note: 'E4', dur: 0.7, vel: 0.35 },
  { note: 'F4', dur: 0.7, vel: 0.35 }, { note: 'G4', dur: 0.6, vel: 0.35 },
  { note: 'A4', dur: 0.9, vel: 0.38 }, { note: 'G4', dur: 0.7, vel: 0.35 },
  { note: 'C4', dur: 1.5, vel: 0.38 },
]

/** 白天低音 */
const DAY_BASS: MelodyNote[] = [
  { note: 'C3', dur: 2.2, vel: 0.14 }, { note: 'F3', dur: 2.2, vel: 0.14 },
  { note: 'G3', dur: 2.2, vel: 0.14 }, { note: 'C3', dur: 2.2, vel: 0.14 },
  { note: 'C3', dur: 2.2, vel: 0.14 }, { note: 'F3', dur: 2.2, vel: 0.14 },
  { note: 'G3', dur: 2.2, vel: 0.14 }, { note: 'C3', dur: 2.5, vel: 0.14 },
]

/** 白天和弦铺垫：C - F - G - C */
const DAY_CHORDS: { notes: `${NoteName}${number}`[]; dur: number }[] = [
  { notes: ['C3', 'E3', 'G3'], dur: 8.8 },
  { notes: ['F2', 'A2', 'C3'], dur: 8.8 },
  { notes: ['G2', 'B2', 'D3'], dur: 8.8 },
  { notes: ['C3', 'E3', 'G3'], dur: 9.0 },
]

/** 夜晚战斗主题：星光草坪 — 宁静 C 大调摇篮曲，像仰望星空 */
const NIGHT_BATTLE: MelodyNote[] = [
  { note: 'C4', dur: 1.4, vel: 0.35 }, { note: 'E4', dur: 1.0, vel: 0.35 },
  { note: 'G4', dur: 1.4, vel: 0.38 },
  { note: 'C5', dur: 1.8, vel: 0.38 }, { note: 'G4', dur: 1.0, vel: 0.35 },
  { note: 'E4', dur: 1.4, vel: 0.35 },
  { note: 'R', dur: 0.6 },
  { note: 'A4', dur: 1.2, vel: 0.35 }, { note: 'G4', dur: 1.0, vel: 0.35 },
  { note: 'F4', dur: 1.0, vel: 0.33 }, { note: 'E4', dur: 1.4, vel: 0.35 },
  { note: 'D4', dur: 1.0, vel: 0.33 }, { note: 'C4', dur: 2.0, vel: 0.35 },
  { note: 'R', dur: 0.8 },
  { note: 'E4', dur: 1.2, vel: 0.35 }, { note: 'G4', dur: 1.0, vel: 0.35 },
  { note: 'C5', dur: 1.4, vel: 0.38 },
  { note: 'D5', dur: 1.0, vel: 0.35 }, { note: 'C5', dur: 1.2, vel: 0.35 },
  { note: 'A4', dur: 1.0, vel: 0.33 }, { note: 'G4', dur: 1.4, vel: 0.35 },
  { note: 'E4', dur: 1.0, vel: 0.33 }, { note: 'D4', dur: 1.0, vel: 0.33 },
  { note: 'C4', dur: 2.5, vel: 0.35 },
]

/** 夜晚低音 */
const NIGHT_BASS: MelodyNote[] = [
  { note: 'C3', dur: 5.0, vel: 0.13 }, { note: 'A2', dur: 5.0, vel: 0.13 },
  { note: 'F2', dur: 5.0, vel: 0.13 }, { note: 'G2', dur: 5.0, vel: 0.13 },
  { note: 'C3', dur: 5.0, vel: 0.13 }, { note: 'A2', dur: 5.0, vel: 0.13 },
  { note: 'F2', dur: 2.5, vel: 0.13 }, { note: 'G2', dur: 2.5, vel: 0.13 },
  { note: 'C3', dur: 5.0, vel: 0.13 },
]

/** 夜晚和弦铺垫：C - Am - F - G */
const NIGHT_CHORDS: { notes: `${NoteName}${number}`[]; dur: number }[] = [
  { notes: ['C3', 'E3', 'G3'], dur: 22.0 },
  { notes: ['A2', 'C3', 'E3'], dur: 22.0 },
  { notes: ['F2', 'A2', 'C3'], dur: 22.0 },
  { notes: ['G2', 'B2', 'D3'], dur: 22.0 },
]

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
  private musicTimeout: ReturnType<typeof setTimeout> | null = null
  private chordTimeout: ReturnType<typeof setTimeout> | null = null
  private musicPlaying = false
  private currentMusicType: 'menu' | 'day' | 'night' | null = null
  private _resumeListener = false

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

  /** 重新创建 masterGain，立即切断所有已调度的声音 */
  private _killAllSounds() {
    if (!this.ctx) return
    try { this.masterGain?.disconnect() } catch { /* 忽略 */ }
    this.masterGain = this.ctx.createGain()
    this.masterGain.connect(this.ctx.destination)
    this.masterGain.gain.value = this._muted ? 0 : 0.30
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
    if (this._muted) this.stopMusic()
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

  /* ── 音乐播放 ── */

  startMusic(type: 'menu' | 'day' | 'night') {
    this.currentMusicType = type
    if (!this._musicOn || this._muted) return
    this.stopMusic()
    const ctx = this.getCtx()
    const melody = type === 'menu' ? MENU_THEME : type === 'day' ? DAY_BATTLE : NIGHT_BATTLE
    const bass = type === 'menu' ? MENU_BASS : type === 'day' ? DAY_BASS : NIGHT_BASS
    const chords = type === 'menu' ? MENU_CHORDS : type === 'day' ? DAY_CHORDS : NIGHT_CHORDS
    // 星露谷风格：更慢速，让音符有充分呼吸感
    const speed = type === 'menu' ? 0.48 : type === 'day' ? 0.55 : 0.42
    this.musicPlaying = true
    this._playMusicLoop(ctx, melody, bass, speed)
    this._startChordPad(ctx, chords, speed)
  }

  stopMusic() {
    this.musicPlaying = false
    if (this.musicTimeout) {
      clearTimeout(this.musicTimeout)
      this.musicTimeout = null
    }
    if (this.chordTimeout) {
      clearTimeout(this.chordTimeout)
      this.chordTimeout = null
    }
    // 立即切断所有已调度但尚未播放的声音
    this._killAllSounds()
  }

  private _playMusicLoop(
    ctx: AudioContext,
    melody: MelodyNote[],
    bass: MelodyNote[],
    speed: number,
    melIdx = 0,
    bassIdx = 0,
    melTime = ctx.currentTime,
    bassTime = ctx.currentTime,
  ) {
    if (!this.musicPlaying || this._muted) return

    // 播放旋律音符
    if (melIdx < melody.length) {
      const mn = melody[melIdx]
      if (mn.note !== 'R') {
        this._playNote(ctx, freq(mn.note), mn.dur * speed * 0.9, 'triangle', mn.vel ?? 0.45, melTime)
        // 轻混响：延迟 0.15s 的柔和回声
        this._playNote(ctx, freq(mn.note), mn.dur * speed * 0.4, 'sine', (mn.vel ?? 0.45) * 0.06, melTime + 0.15)
      }
      melTime += mn.dur * speed
      melIdx++
    } else {
      melIdx = 0
      melTime = ctx.currentTime
    }

    // 播放低音音符
    if (bassIdx < bass.length) {
      const bn = bass[bassIdx]
      if (bn.note !== 'R') {
        this._playNote(ctx, freq(bn.note), bn.dur * speed * 0.95, 'sine', bn.vel ?? 0.22, bassTime)
      }
      bassTime += bn.dur * speed
      bassIdx++
    } else {
      bassIdx = 0
      bassTime = ctx.currentTime
    }

    // 递归调度下一帧
    const nextDelay = Math.min(
      melIdx < melody.length ? melody[melIdx].dur * speed * 1000 : 50,
      bassIdx < bass.length ? bass[bassIdx].dur * speed * 1000 : 50,
    )
    this.musicTimeout = setTimeout(() => {
      this._playMusicLoop(ctx, melody, bass, speed, melIdx, bassIdx, melTime, bassTime)
    }, nextDelay)
  }

  /** 和弦铺垫：持续的低音量和弦，营造温暖氛围 */
  private _startChordPad(
    ctx: AudioContext,
    chords: { notes: `${NoteName}${number}`[]; dur: number }[],
    speed: number,
    idx = 0,
  ) {
    if (!this.musicPlaying || this._muted) return

    const chord = chords[idx % chords.length]
    const chordDur = chord.dur * speed

    chord.notes.forEach((note) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      osc.type = 'sine'
      osc.frequency.value = freq(note)
      filter.type = 'lowpass'
      filter.frequency.value = 400
      filter.Q.value = 0.3
      const now = ctx.currentTime
      const fadeIn = 0.8
      const fadeOut = 1.0
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.05, now + fadeIn)
      gain.gain.setValueAtTime(0.05, now + chordDur - fadeOut)
      gain.gain.linearRampToValueAtTime(0, now + chordDur)
      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.masterGain!)
      osc.start(now)
      osc.stop(now + chordDur + 0.1)
    })

    this.chordTimeout = setTimeout(() => {
      this._startChordPad(ctx, chords, speed, idx + 1)
    }, chordDur * 1000)
  }

  /** 播放单个音符，使用柔和正弦波 + 轻泛音，营造温暖自然的音乐盒音色 */
  private _playNote(
    ctx: AudioContext,
    hz: number,
    duration: number,
    wave: OscillatorType,
    vol: number,
    startTime: number,
  ) {
    const now = startTime
    const attack = Math.min(0.06, duration * 0.12)
    const release = Math.min(0.5, duration * 0.45)
    const sustain = vol * 0.50

    // 主音：柔和正弦波，温暖不刺耳
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = 'sine'
    osc.frequency.value = hz
    osc.detune.value = (Math.random() - 0.5) * 1

    filter.type = 'lowpass'
    // 激进低通滤波，切掉高频刺耳部分
    filter.frequency.value = hz < 300 ? 400 : Math.min(1600, hz * 2.5)
    filter.Q.value = 0.25

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(sustain, now + attack)
    gain.gain.setValueAtTime(sustain * 0.65, now + duration - release)
    gain.gain.linearRampToValueAtTime(0, now + duration)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain!)
    osc.start(now)
    osc.stop(now + duration + 0.2)

    // 轻柔泛音（仅高八度，极低音量，增加空气感）
    if (hz < 800) {
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.value = hz * 2
      osc2.detune.value = 3 + (Math.random() - 0.5) * 2
      const hv2 = sustain * 0.12
      gain2.gain.setValueAtTime(0, now + 0.02)
      gain2.gain.linearRampToValueAtTime(hv2, now + attack + 0.02)
      gain2.gain.setValueAtTime(hv2 * 0.5, now + duration - release)
      gain2.gain.linearRampToValueAtTime(0, now + duration)
      osc2.connect(gain2)
      gain2.connect(this.masterGain!)
      osc2.start(now + 0.02)
      osc2.stop(now + duration + 0.2)
    }
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