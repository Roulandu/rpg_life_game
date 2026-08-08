let ctx: AudioContext | null = null
let timer: ReturnType<typeof setInterval> | null = null
let playing = false
let step = 0

const MELODY = [523.25, 587.33, 659.25, 587.33, 659.25, 783.99, 659.25, 587.33]

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AudioCtor = window.AudioContext
    const WebkitCtor = (
      window as unknown as { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext
    const Ctor = AudioCtor ?? WebkitCtor
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function softTone(frequency: number, duration: number, volume = 0.05): void {
  const context = getContext()
  if (!context) return
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const start = context.currentTime

  oscillator.type = 'sine'
  oscillator.frequency.value = frequency

  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(volume, start + 0.3)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.05)
}

export function isMusicPlaying(): boolean {
  return playing
}

export function toggleMusic(): boolean {
  if (playing) {
    stopMusic()
    return false
  }
  startMusic()
  return true
}

function startMusic(): void {
  if (playing) return
  playing = true
  step = 0
  timer = setInterval(() => {
    softTone(MELODY[step % MELODY.length], 1.6, 0.05)
    step += 1
  }, 800)
}

function stopMusic(): void {
  playing = false
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}
