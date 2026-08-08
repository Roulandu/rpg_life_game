let ctx: AudioContext | null = null

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

function tone(
  frequency: number,
  duration: number,
  delay = 0,
  type: OscillatorType = 'sine',
  volume = 0.18,
): void {
  const context = getContext()
  if (!context) return
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const start = context.currentTime + delay

  oscillator.type = type
  oscillator.frequency.value = frequency

  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(volume, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.05)
}

export function playChoose(): void {
  tone(520, 0.09, 0, 'triangle', 0.16)
}

export function playMilestone(): void {
  tone(660, 0.16, 0, 'sine', 0.16)
  tone(880, 0.2, 0.09, 'sine', 0.14)
}

export function playAchievement(): void {
  tone(523.25, 0.14, 0, 'triangle', 0.15)
  tone(659.25, 0.14, 0.1, 'triangle', 0.15)
  tone(783.99, 0.16, 0.2, 'triangle', 0.15)
  tone(1046.5, 0.26, 0.3, 'sine', 0.16)
}

export function playEnding(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((note, index) => tone(note, 0.28, index * 0.12, 'sine', 0.15))
}
