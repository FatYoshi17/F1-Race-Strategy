# Pit Wall backend

FastAPI service that loads the real trained `runs/tft_fastf1.ckpt`
(pytorch_forecasting `TemporalFusionTransformer`) once at startup and serves
live, autoregressive lap-by-lap race-strategy simulations against real
FastF1 telemetry cached in `../cache`.

## Run it

Use the existing `tire-telemetry` conda environment — it already has
`torch`, `pytorch_forecasting`, `lightning`, `fastf1`, `fastapi`, `uvicorn`.

```bash
conda activate tire-telemetry
cd backend
uvicorn app.main:app --reload --port 8000
```

`GET /api/health` should return `{"status": "ok", "device": "cuda"}` (or
`"cpu"` without a GPU).

## Notable design choices

- **Session registry is limited to 5 real 2025 races** (`app/config.py`).
  The checkpoint's driver/team embeddings were trained on the 2025 grid and
  2025-era team names only; the two 2024 races present in the FastF1 cache
  use drivers and a team name ("RB") the model never saw, so they're
  excluded rather than fed in as unseen categories. Any one-off stand-in
  driver in a session (e.g. a reserve driver) is filtered out the same way
  (`sessions.py`, via `tft_model.known_drivers()/known_teams()`).
- **Calibration offset** (`rollout.py`): the checkpoint was trained and
  evaluated on a single race (Singapore 2025 — `runs/tft_preds_SAI_S1.csv`
  matches that session lap-for-lap), and its target normalizer is fitted to
  that circuit's pace level. On another circuit the raw output keeps the
  learned tyre-degradation shape but sits at the wrong absolute level
  (~97s predicted vs ~93s real at Suzuka). Each rollout anchors itself with
  one transparent offset (raw first prediction vs. this race's recent real
  pace) applied to displayed quantiles. The offset is returned in the API
  response (`calibration_offset_s`) rather than hidden. The proper fix is
  retraining on multi-circuit data with a circuit-aware series id.
- **Direct forward pass, not `.predict()`**: `TemporalFusionTransformer.predict()`
  spins up a full Lightning `Trainer` per call, which is far too slow for a
  ~20-lap autoregressive loop. `tft_model.py` builds the `TimeSeriesDataSet`
  window once per lap and calls `model(x)` directly (~20ms/lap on GPU).
