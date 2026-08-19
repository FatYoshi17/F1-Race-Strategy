# Pit Wall — Live TFT Strategy Console

An 8-bit arcade-styled race-strategy simulator built around a real, trained
Temporal Fusion Transformer (`runs/tft_fastf1.ckpt`). Pick a real 2025 F1
session and driver, build a hypothetical tyre strategy, and the backend
runs an actual autoregressive TFT rollout — lap by lap, live — against real
FastF1 telemetry to forecast lap times, total race time, and
undercut/overcut deltas against a rival strategy.

Only the TFT model from the original project is used here (the other
models mentioned alongside it — Linear/Ridge, Random Forest, Gradient
Boosting, LSTM — are intentionally out of scope for this build).

## Run it

**Backend** (needs the `tire-telemetry` conda env — see [backend/README.md](backend/README.md)):

```bash
conda activate tire-telemetry
cd backend
uvicorn app.main:app --reload --port 8000
```

**Frontend**:

```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173. The Vite dev server proxies `/api` to
`http://127.0.0.1:8000`, so start the backend first.

## What's real here

- `runs/tft_fastf1.ckpt` — an actually-trained `pytorch_forecasting`
  `TemporalFusionTransformer`, loaded and run for every prediction. No mock
  data, no canned predictions.
- `cache/2024`, `cache/2025` — real FastF1 session caches. The app reads
  real laps and real weather for 5 real 2025 races.
- Predictions are seeded with a driver's actual first 8 laps of a session
  (the model's trained encoder length) and rolled forward autoregressively
  for whatever hypothetical stint plan you build in the UI.

See [backend/README.md](backend/README.md) for the modeling details,
including a known limitation in the checkpoint (pooled cross-race
normalization) and how the app corrects for it transparently.

## Stack

- Backend: FastAPI + `pytorch_forecasting` + `fastf1`, `backend/app/`.
- Frontend: React + TypeScript + Vite, `frontend/src/`. No chart library —
  the lap-time chart is a hand-rolled `<canvas>` component
  (`PixelChart`) to match the pixel-art aesthetic. Zustand for UI state,
  TanStack Query for API calls. Sound effects are procedurally generated
  via the Web Audio API — no audio asset files.
