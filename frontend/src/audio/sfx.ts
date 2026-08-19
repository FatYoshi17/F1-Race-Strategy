let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
  }
  if (ctx.state === "suspended") {
    void ctx.resume()
  }
  return ctx
}

function tone(
  freq: number,
  duration: number,
  opts: { type?: OscillatorType; gain?: number; delay?: number; slideTo?: number } = {}
) {
  const audio = getCtx()
  const { type = "square", gain = 0.06, delay = 0, slideTo } = opts
  const osc = audio.createOscillator()
  const amp = audio.createGain()
  osc.type = type
  const start = audio.currentTime + delay
  osc.frequency.setValueAtTime(freq, start)
  if (slideTo !== undefined) {
    osc.frequency.linearRampToValueAtTime(slideTo, start + duration)
  }
  amp.gain.setValueAtTime(gain, start)
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(amp)
  amp.connect(audio.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

export const sfx = {
  coin: () => {
    tone(1046, 0.09, { delay: 0 })
    tone(1568, 0.14, { delay: 0.08 })
  },
  blip: () => tone(660, 0.05, { gain: 0.05 }),
  select: () => tone(880, 0.06, { gain: 0.05 }),
  confirm: () => {
    tone(523, 0.07, { delay: 0 })
    tone(659, 0.07, { delay: 0.06 })
    tone(784, 0.1, { delay: 0.12 })
  },
  error: () => tone(120, 0.25, { type: "sawtooth", gain: 0.07, slideTo: 80 }),
  engine: () => tone(90, 0.5, { type: "sawtooth", gain: 0.03, slideTo: 140 }),
  pitStop: () => {
    tone(200, 0.06, { type: "square", gain: 0.07 })
    tone(200, 0.06, { type: "square", gain: 0.07, delay: 0.1 })
    tone(200, 0.06, { type: "square", gain: 0.07, delay: 0.2 })
    tone(600, 0.15, { type: "square", gain: 0.06, delay: 0.32 })
  },
}
