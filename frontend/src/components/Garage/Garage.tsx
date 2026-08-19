import type { CSSProperties } from "react"
import { useDrivers, useSessions } from "../../api/hooks"
import { sfx } from "../../audio/sfx"
import { teamColor } from "../../lib/teamColor"
import { useAppStore } from "../../state/store"
import { Helmet } from "../sprites/Sprites"
import "./Garage.css"

export function Garage() {
  const sessionsQuery = useSessions()
  const sessionId = useAppStore((s) => s.sessionId)
  const selectSession = useAppStore((s) => s.selectSession)
  const selectDriver = useAppStore((s) => s.selectDriver)
  const driversQuery = useDrivers(sessionId)

  return (
    <div className="garage">
      <div className="garage-header scanline-flicker">SELECT RACE // SELECT DRIVER</div>

      <div style={{ width: "100%", maxWidth: 1000 }}>
        <div className="garage-step-label">01 // GRAND PRIX</div>
        {sessionsQuery.isLoading && (
          <div className="garage-loading">LOADING TRACK DATA...</div>
        )}
        {sessionsQuery.isError && (
          <div className="garage-error">
            SYSTEM ERROR — BACKEND UNREACHABLE. IS THE API RUNNING?
          </div>
        )}
        <div className="session-grid">
          {sessionsQuery.data?.map((s) => (
            <button
              key={s.id}
              className={`session-card${sessionId === s.id ? " selected" : ""}`}
              onClick={() => {
                sfx.select()
                selectSession(s.id, s.label)
              }}
            >
              <div className="session-card-year">{s.year} · ROUND DATA LOCKED</div>
              <div className="session-card-label">{s.label}</div>
            </button>
          ))}
        </div>
      </div>

      {sessionId && (
        <div style={{ width: "100%", maxWidth: 1000 }}>
          <div className="garage-step-label">02 // DRIVER</div>
          {driversQuery.isLoading && (
            <div className="garage-loading">PULLING GRID FROM FASTF1 CACHE...</div>
          )}
          {driversQuery.isError && (
            <div className="garage-error">COULD NOT LOAD DRIVERS FOR THIS SESSION</div>
          )}
          <div className="driver-grid">
            {driversQuery.data?.map((d) => {
              const color = teamColor(d.team)
              return (
                <button
                  key={d.driver}
                  className="driver-card"
                  style={{ "--card-color": color } as CSSProperties}
                  onClick={() => {
                    sfx.confirm()
                    selectDriver(d.driver, d.team)
                  }}
                >
                  <Helmet color={color} size={44} />
                  <div className="driver-code">{d.driver}</div>
                  <div className="driver-team">{d.team}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
