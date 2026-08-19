import type { CSSProperties } from "react"
import { useMemo } from "react"
import { useSimulate } from "../../api/hooks"
import type { Compound, StintPlan } from "../../api/types"
import { sfx } from "../../audio/sfx"
import { formatDelta, formatRaceTime } from "../../lib/format"
import { teamColor } from "../../lib/teamColor"
import { useAppStore } from "../../state/store"
import { PixelChart } from "../PixelChart/PixelChart"
import { PixelCar, TireBadge } from "../sprites/Sprites"
import "./PitWall.css"

const COMPOUNDS: Compound[] = ["SOFT", "MEDIUM", "HARD"]
const WEAR_REFERENCE_LAPS = 28

function StintEditor({
  plan,
  onCompound,
  onLaps,
  onAdd,
  onRemove,
}: {
  plan: StintPlan[]
  onCompound: (i: number, c: Compound) => void
  onLaps: (i: number, laps: number) => void
  onAdd: () => void
  onRemove: (i: number) => void
}) {
  return (
    <>
      <div className="stint-list">
        {plan.map((stint, i) => (
          <div className="stint-row" key={i}>
            <div className="stint-row-index">S{i + 1}</div>
            <div className="compound-buttons">
              {COMPOUNDS.map((c) => (
                <button
                  key={c}
                  className={stint.compound === c ? "active" : ""}
                  onClick={() => {
                    sfx.blip()
                    onCompound(i, c)
                  }}
                  title={c}
                >
                  <TireBadge compound={c} size={22} />
                </button>
              ))}
            </div>
            <div className="laps-stepper">
              <button onClick={() => onLaps(i, Math.max(1, stint.laps - 1))}>-</button>
              {stint.laps} laps
              <button onClick={() => onLaps(i, Math.min(60, stint.laps + 1))}>+</button>
            </div>
            {plan.length > 1 && (
              <button className="stint-remove" onClick={() => onRemove(i)}>
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <button className="arcade-btn" onClick={onAdd}>
        + ADD STINT
      </button>
    </>
  )
}

export function PitWall() {
  const {
    sessionId,
    sessionLabel,
    driver,
    team,
    plan,
    rivalEnabled,
    rivalPlan,
    pitLossS,
    goTo,
    addStint,
    removeStint,
    updateStintCompound,
    updateStintLaps,
    toggleRival,
    setRivalPlan,
    setPitLoss,
    reset,
  } = useAppStore()

  const simulate = useSimulate()
  const color = team ? teamColor(team) : "var(--accent)"

  const totalPlanLaps = useMemo(() => plan.reduce((sum, s) => sum + s.laps, 0), [plan])

  const runSimulation = () => {
    if (!sessionId || !driver) return
    sfx.pitStop()
    simulate.mutate({
      session_id: sessionId,
      driver,
      plan,
      rival_plan: rivalEnabled ? rivalPlan : null,
      pit_loss_s: pitLossS,
    })
  }

  const result = simulate.data
  const lastLap = result?.primary.laps[result.primary.laps.length - 1]
  const wearPct = lastLap ? Math.min(100, (lastLap.tire_age / WEAR_REFERENCE_LAPS) * 100) : 0
  const wearColor =
    lastLap?.compound === "SOFT" ? "#ff3333" : lastLap?.compound === "MEDIUM" ? "#ffd400" : "#f2f2f2"

  return (
    <div className="pitwall" style={{ "--card-color": color } as CSSProperties}>
      <div className="pitwall-topbar">
        <div className="pitwall-title">
          <span className="pitwall-driver-tag">{driver}</span>
          <span>PIT WALL CONSOLE</span>
        </div>
        <div className="pitwall-session-label">{sessionLabel}</div>
        <button
          className="arcade-btn"
          onClick={() => {
            sfx.blip()
            reset()
            goTo("garage")
          }}
        >
          ← GARAGE
        </button>
      </div>

      <div className="pitwall-grid">
        {/* LEFT: track + tire wear */}
        <div className="panel track-panel">
          <div className="panel-title">CAR // TYRE STATUS</div>
          <div className={`track-strip ${simulate.isPending ? "" : "idle"}`}>
            <div className="track-dashes" />
            <div className="track-car">
              <PixelCar color={color} size={80} />
            </div>
          </div>
          <div className="tire-wear-box">
            <div className="tire-wear-label">
              <span>TYRE: {lastLap?.compound ?? "—"}</span>
              <span>{lastLap ? `${lastLap.tire_age} laps on` : "STANDBY"}</span>
            </div>
            <div className="tire-wear-bar-track">
              <div
                className="tire-wear-bar-fill"
                style={{ width: `${wearPct}%`, background: wearColor }}
              />
            </div>
          </div>
          <div className="lap-counter">
            LAP {lastLap?.lap ?? 0}
            <br />
            OF {totalPlanLaps}
            <small>PLANNED RACE DISTANCE</small>
          </div>
        </div>

        {/* CENTER: strategy builder */}
        <div className="panel builder-panel">
          <div className="panel-title">STRATEGY BUILDER</div>
          <StintEditor
            plan={plan}
            onCompound={updateStintCompound}
            onLaps={updateStintLaps}
            onAdd={() => addStint("HARD")}
            onRemove={removeStint}
          />

          <label className="rival-toggle">
            <input type="checkbox" checked={rivalEnabled} onChange={toggleRival} />
            COMPARE VS RIVAL STRATEGY (UNDERCUT / OVERCUT)
          </label>
          {rivalEnabled && (
            <StintEditor
              plan={rivalPlan}
              onCompound={(i, c) =>
                setRivalPlan(rivalPlan.map((s, idx) => (idx === i ? { ...s, compound: c } : s)))
              }
              onLaps={(i, laps) =>
                setRivalPlan(rivalPlan.map((s, idx) => (idx === i ? { ...s, laps } : s)))
              }
              onAdd={() => setRivalPlan([...rivalPlan, { compound: "HARD", laps: 10 }])}
              onRemove={(i) => setRivalPlan(rivalPlan.filter((_, idx) => idx !== i))}
            />
          )}

          <div className="pit-loss-row">
            PIT LOSS
            <input
              type="number"
              value={pitLossS}
              min={0}
              max={60}
              onChange={(e) => setPitLoss(Number(e.target.value))}
            />
            SEC / STOP
          </div>

          <button
            className="arcade-btn primary run-button"
            disabled={!sessionId || !driver || simulate.isPending}
            onClick={runSimulation}
          >
            {simulate.isPending ? "▶ RUNNING TFT ROLLOUT..." : "🏁 BOX BOX BOX — SIMULATE"}
          </button>
          {simulate.isError && (
            <div className="sim-error">{(simulate.error as Error).message}</div>
          )}
        </div>

        {/* RIGHT: chart + readouts */}
        <div className="panel readout-panel">
          <div className="panel-title">LIVE TFT LAP-TIME FORECAST</div>
          {simulate.isPending && (
            <div className="sim-loading blink">RUNNING AUTOREGRESSIVE ROLLOUT...</div>
          )}
          {!simulate.isPending && (
            <PixelChart
              primary={result?.primary.laps ?? []}
              rival={result?.rival?.laps ?? null}
            />
          )}

          <div className="readout-grid">
            <div className="readout-tile">
              <div className="readout-tile-label">TOTAL RACE TIME</div>
              <div className="readout-tile-value">
                {result ? formatRaceTime(result.primary.total_time_s) : "—:——.———"}
              </div>
            </div>
            <div className="readout-tile">
              <div className="readout-tile-label">PIT LOSS APPLIED</div>
              <div className="readout-tile-value warn">
                {result ? `${result.primary.pit_loss_total_s.toFixed(1)}s` : "—"}
              </div>
            </div>
            <div className="readout-tile">
              <div className="readout-tile-label">MODEL CALIBRATION</div>
              <div className="readout-tile-value small">
                {result ? `${result.primary.calibration_offset_s.toFixed(2)}s` : "—"}
              </div>
            </div>
            <div className="readout-tile">
              <div className="readout-tile-label">
                {rivalEnabled ? "UNDERCUT / OVERCUT" : "RIVAL COMPARE"}
              </div>
              <div
                className={`readout-tile-value small ${
                  result?.delta && result.delta.final_delta_s !== null
                    ? result.delta.final_delta_s < 0
                      ? ""
                      : "red"
                    : ""
                }`}
              >
                {result?.delta?.final_delta_s != null
                  ? formatDelta(result.delta.final_delta_s)
                  : "OFF"}
              </div>
            </div>
          </div>

          <div className="readout-note">
            {result?.delta?.crossover_lap
              ? `Strategies cross over around lap ${result.delta.crossover_lap} — whoever pits first pays it back there.`
              : "Predictions come from a live pytorch_forecasting Temporal Fusion Transformer, seeded with this driver's real opening laps. Quantile band = model's P10–P90 uncertainty; calibration offset corrects the checkpoint's cross-race pooling bias back to this circuit's real pace."}
          </div>
        </div>
      </div>
    </div>
  )
}
