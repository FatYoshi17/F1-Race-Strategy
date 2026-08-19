"""Autoregressive lap-by-lap race simulation for an arbitrary hypothetical
tyre strategy, seeded with a driver's real opening laps and driven forward by
the live TFT model."""
from __future__ import annotations

import pandas as pd

from . import sessions, tft_model
from .config import ENCODER_LENGTH, DEFAULT_PIT_LOSS_S
from .sessions import FEATURE_COLS

QUANTILE_LABELS = ["p02", "p10", "p25", "p50", "p75", "p90", "p98"]
P50_INDEX = QUANTILE_LABELS.index("p50")


class PlanTooShortError(Exception):
    pass


def _build_plan_schedule(plan: list[dict]) -> list[dict]:
    schedule = []
    for stint_idx, stint in enumerate(plan):
        for tire_age in range(int(stint["laps"])):
            schedule.append({
                "compound": stint["compound"],
                "tire_age": tire_age,
                "is_pit_lap": tire_age == 0 and stint_idx > 0,
            })
    return schedule


def simulate(session_id: str, driver: str, plan: list[dict],
             pit_loss_s: float = DEFAULT_PIT_LOSS_S) -> dict:
    schedule = _build_plan_schedule(plan)
    if len(schedule) <= ENCODER_LENGTH:
        raise PlanTooShortError(
            f"Strategy needs more than {ENCODER_LENGTH} total laps to produce "
            f"any predicted laps (got {len(schedule)})."
        )

    driver_laps = sessions.get_driver_laps(session_id, driver)
    first_stint = int(driver_laps["Stint"].iloc[0])
    context = driver_laps[driver_laps["Stint"] == first_stint].head(ENCODER_LENGTH).copy()
    if len(context) < ENCODER_LENGTH:
        raise PlanTooShortError(
            f"Driver {driver}'s first stint in this session only has "
            f"{len(context)} real laps, need {ENCODER_LENGTH} for warm-start context."
        )

    mean_weather = {
        c: float(driver_laps[c].mean())
        for c in ("TrackTemp", "AirTemp", "Humidity", "WindSpeed", "Pressure")
    }

    window = context.reset_index(drop=True).copy()
    team = window["Team"].iloc[0]
    series_id = window["series_id"].iloc[0]

    laps_out = []
    cumulative = 0.0
    for i in range(ENCODER_LENGTH):
        lap_time = float(window["lap_time_s"].iloc[i])
        cumulative += lap_time
        laps_out.append({
            "lap": i + 1,
            "compound": window["Compound"].iloc[i],
            "tire_age": int(window["tire_age"].iloc[i]),
            "is_actual": True,
            "is_pit_lap": False,
            "quantiles": {q: lap_time for q in QUANTILE_LABELS},
            "cumulative_time_s": cumulative,
        })

    next_time_idx = int(window["time_idx"].iloc[-1]) + 1
    pit_loss_total = 0.0

    # The checkpoint's series_id is only "{DRIVER}_S{stint}" with no
    # race/track identity, so its group-normalizer stats are pooled across
    # every race that driver ran and raw continuations drift toward that
    # driver's season-wide average pace rather than this circuit's actual
    # pace level. We anchor the model back to reality with a single
    # transparent bias correction: compare its very first post-context
    # prediction against this race's own recent real pace, and apply that
    # constant offset to every displayed (but not re-fed) prediction. The
    # model's learned degradation *shape* is trusted; only the absolute
    # level is recalibrated.
    calibration_offset = None

    for idx in range(ENCODER_LENGTH, len(schedule)):
        entry = schedule[idx]
        lap_no = idx + 1

        if entry["is_pit_lap"]:
            cumulative += pit_loss_s
            pit_loss_total += pit_loss_s

        next_row = window.iloc[[-1]].copy().reset_index(drop=True)
        next_row.loc[0, "time_idx"] = next_time_idx
        next_row.loc[0, "LapNumber"] = float(lap_no)
        next_row.loc[0, "Compound"] = entry["compound"]
        next_row.loc[0, "tire_age"] = entry["tire_age"]
        next_row.loc[0, "series_id"] = series_id
        next_row.loc[0, "Team"] = team
        for c, v in mean_weather.items():
            next_row.loc[0, c] = v

        quantiles_sorted = tft_model.predict_next_lap(
            window[FEATURE_COLS], next_row[FEATURE_COLS]
        )
        raw_p50 = quantiles_sorted[P50_INDEX]

        if calibration_offset is None:
            recent_actual = context["lap_time_s"].tail(3).mean()
            calibration_offset = float(recent_actual) - raw_p50

        quantiles = {
            label: value + calibration_offset
            for label, value in zip(QUANTILE_LABELS, quantiles_sorted)
        }
        p50_calibrated = quantiles["p50"]
        cumulative += p50_calibrated

        laps_out.append({
            "lap": lap_no,
            "compound": entry["compound"],
            "tire_age": entry["tire_age"],
            "is_actual": False,
            "is_pit_lap": entry["is_pit_lap"],
            "quantiles": quantiles,
            "cumulative_time_s": cumulative,
        })

        # Feed the raw (uncalibrated) prediction back into the encoder
        # window so it stays in the same normalized scale the model itself
        # was trained on; calibration is purely a display-layer correction.
        next_row.loc[0, "lap_time_s"] = raw_p50
        window = pd.concat([window.iloc[1:], next_row], ignore_index=True)
        next_time_idx += 1

    return {
        "driver": driver,
        "team": team,
        "session_id": session_id,
        "context_laps": ENCODER_LENGTH,
        "pit_loss_s": pit_loss_s,
        "pit_loss_total_s": pit_loss_total,
        "total_time_s": cumulative,
        "calibration_offset_s": calibration_offset,
        "laps": laps_out,
    }
