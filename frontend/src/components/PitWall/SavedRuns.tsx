import { useDeleteRun, useRuns, useSessions } from "../../api/hooks"
import type { SavedRun } from "../../api/types"
import { sfx } from "../../audio/sfx"
import { formatDelta, formatRaceTime } from "../../lib/format"
import { useAuthStore } from "../../state/auth"
import { useAppStore } from "../../state/store"

export function SavedRuns() {
  const user = useAuthStore((s) => s.user)
  const runs = useRuns(!!user)
  const del = useDeleteRun()
  const sessions = useSessions()
  const { selectSession, selectDriver, setPlan, setRivalPlan, setPitLoss, goTo } =
    useAppStore()

  if (!user) return null

  const load = (run: SavedRun) => {
    sfx.confirm()
    const label =
      sessions.data?.find((s) => s.id === run.session_id)?.label ?? run.session_id
    selectSession(run.session_id, label)
    selectDriver(run.driver, run.team)
    setPlan(run.plan)
    if (run.rival_plan) {
      setRivalPlan(run.rival_plan)
      if (!useAppStore.getState().rivalEnabled) useAppStore.getState().toggleRival()
    } else if (useAppStore.getState().rivalEnabled) {
      useAppStore.getState().toggleRival()
    }
    setPitLoss(run.pit_loss_s)
    goTo("pitwall")
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="panel runs-panel">
      <div className="panel-title">MY SAVED RUNS</div>
      {runs.isLoading && <div className="runs-empty">LOADING...</div>}
      {runs.isError && <div className="runs-empty">COULD NOT LOAD RUNS</div>}
      {runs.data && runs.data.length === 0 && (
        <div className="runs-empty">NOTHING SAVED YET — SIMULATE, THEN HIT SAVE RUN.</div>
      )}
      <div className="runs-list">
        {runs.data?.map((run) => (
          <div className="run-row" key={run.id}>
            <span className="run-row-name">{run.name}</span>
            <span className="run-row-meta">
              {run.plan.map((s) => `${s.compound[0]}${s.laps}`).join("-")}
            </span>
            <span className="run-row-time">{formatRaceTime(run.total_time_s)}</span>
            {run.final_delta_s !== null && (
              <span className="run-row-meta">vs rival {formatDelta(run.final_delta_s)}</span>
            )}
            <button className="arcade-btn" onClick={() => load(run)}>
              LOAD
            </button>
            <button
              className="arcade-btn danger"
              disabled={del.isPending}
              onClick={() => {
                sfx.blip()
                del.mutate(run.id)
              }}
            >
              DEL
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
