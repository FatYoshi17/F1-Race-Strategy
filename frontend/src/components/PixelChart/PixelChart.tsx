import { useEffect, useRef } from "react"
import type { SimLap } from "../../api/types"
import "./PixelChart.css"

interface Props {
  primary: SimLap[]
  rival?: SimLap[] | null
  height?: number
}

const PAD_L = 52
const PAD_R = 16
const PAD_T = 16
const PAD_B = 30

export function PixelChart({ primary, rival, height = 260 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const dpr = window.devicePixelRatio || 1
    const cssWidth = wrap.clientWidth
    canvas.width = cssWidth * dpr
    canvas.height = height * dpr
    canvas.style.width = `${cssWidth}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = false

    ctx.fillStyle = "#050505"
    ctx.fillRect(0, 0, cssWidth, height)

    if (primary.length === 0) {
      ctx.fillStyle = "#555"
      ctx.font = "14px monospace"
      ctx.fillText("NO DATA — RUN A SIMULATION", PAD_L, height / 2)
      return
    }

    const allLaps = [...primary, ...(rival ?? [])]
    const allTimes = allLaps.flatMap((l) => [
      l.quantiles.p10,
      l.quantiles.p90,
      l.quantiles.p50,
    ])
    const minLap = Math.min(...allLaps.map((l) => l.lap))
    const maxLap = Math.max(...allLaps.map((l) => l.lap))
    const minTime = Math.min(...allTimes) - 0.4
    const maxTime = Math.max(...allTimes) + 0.4

    const plotW = cssWidth - PAD_L - PAD_R
    const plotH = height - PAD_T - PAD_B

    const xFor = (lap: number) =>
      PAD_L + ((lap - minLap) / Math.max(1, maxLap - minLap)) * plotW
    const yFor = (t: number) =>
      PAD_T + plotH - ((t - minTime) / Math.max(0.01, maxTime - minTime)) * plotH

    // grid
    ctx.strokeStyle = "#1c2028"
    ctx.lineWidth = 1
    const ySteps = 5
    ctx.font = "11px monospace"
    ctx.fillStyle = "#666"
    for (let i = 0; i <= ySteps; i++) {
      const t = minTime + ((maxTime - minTime) * i) / ySteps
      const y = Math.round(yFor(t)) + 0.5
      ctx.beginPath()
      ctx.moveTo(PAD_L, y)
      ctx.lineTo(cssWidth - PAD_R, y)
      ctx.stroke()
      ctx.fillText(t.toFixed(1) + "s", 4, y + 4)
    }
    for (let lap = minLap; lap <= maxLap; lap += Math.max(1, Math.round((maxLap - minLap) / 10))) {
      const x = Math.round(xFor(lap)) + 0.5
      ctx.beginPath()
      ctx.moveTo(x, PAD_T)
      ctx.lineTo(x, height - PAD_B)
      ctx.stroke()
      ctx.fillText(String(lap), x - 6, height - 10)
    }

    // pit markers
    ctx.strokeStyle = "#ffb400"
    ctx.setLineDash([3, 3])
    for (const l of primary) {
      if (l.is_pit_lap) {
        const x = Math.round(xFor(l.lap)) + 0.5
        ctx.beginPath()
        ctx.moveTo(x, PAD_T)
        ctx.lineTo(x, height - PAD_B)
        ctx.stroke()
      }
    }
    ctx.setLineDash([])

    const drawSeries = (laps: SimLap[], color: string, withBand: boolean) => {
      if (withBand) {
        ctx.fillStyle = color + "26"
        ctx.beginPath()
        laps.forEach((l, i) => {
          const x = xFor(l.lap)
          const y = yFor(l.quantiles.p90)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        for (let i = laps.length - 1; i >= 0; i--) {
          const l = laps[i]
          ctx.lineTo(xFor(l.lap), yFor(l.quantiles.p10))
        }
        ctx.closePath()
        ctx.fill()
      }

      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      laps.forEach((l, i) => {
        const x = xFor(l.lap)
        const y = yFor(l.quantiles.p50)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()

      for (const l of laps) {
        const x = xFor(l.lap)
        const y = yFor(l.quantiles.p50)
        ctx.fillStyle = l.is_actual ? color : "#050505"
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.rect(x - 3, y - 3, 6, 6)
        ctx.fill()
        ctx.stroke()
      }
    }

    if (rival && rival.length) {
      drawSeries(rival, "#ff3b3b", false)
    }
    drawSeries(primary, "#39ff88", true)
  }, [primary, rival, height])

  return (
    <div className="pixel-chart-wrap" ref={wrapRef}>
      <canvas ref={canvasRef} />
    </div>
  )
}
