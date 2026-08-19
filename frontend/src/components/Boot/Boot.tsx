import { useEffect } from "react"
import { PixelFlag } from "../sprites/Sprites"
import { sfx } from "../../audio/sfx"
import { useAppStore } from "../../state/store"
import "./Boot.css"

export function Boot() {
  const goTo = useAppStore((s) => s.goTo)

  const start = () => {
    sfx.coin()
    goTo("garage")
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") start()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="boot">
      <div className="boot-flags">
        <PixelFlag size={40} />
        <PixelFlag size={40} />
        <PixelFlag size={40} />
      </div>
      <div className="boot-title scanline-flicker">
        PIT WALL
        <br />
        STRATEGY UNIT
      </div>
      <div className="boot-subtitle">A RACE-STRATEGY ARCADE CABINET</div>
      <div className="boot-model-tag">
        POWERED BY A REAL TEMPORAL FUSION TRANSFORMER — LIVE INFERENCE ON REAL
        2025 FASTF1 TELEMETRY, NO CANNED DATA
      </div>
      <button className="boot-press-start blink" onClick={start}>
        ▶ PRESS START
      </button>
      <div className="boot-footer">© 2025 GARAGE 21 — INSERT DRIVER TO CONTINUE</div>
    </div>
  )
}
