"""FastF1-backed session/lap loading with an in-process cache so repeated
requests don't re-parse timing data every time."""
from __future__ import annotations

import fastf1
import pandas as pd

from . import tft_model
from .config import CACHE_DIR, SESSION_BY_ID

fastf1.Cache.enable_cache(str(CACHE_DIR))

_session_cache: dict[str, pd.DataFrame] = {}

FEATURE_COLS = [
    "Driver", "Team", "LapNumber", "Stint", "Compound", "tire_age", "lap_time_s",
    "TrackTemp", "AirTemp", "Humidity", "WindSpeed", "Pressure",
    "series_id", "time_idx",
]


class SessionNotFoundError(Exception):
    pass


def _load_session_frame(session_id: str) -> pd.DataFrame:
    if session_id in _session_cache:
        return _session_cache[session_id]

    meta = SESSION_BY_ID.get(session_id)
    if meta is None:
        raise SessionNotFoundError(session_id)

    session = fastf1.get_session(meta["year"], meta["event"], meta["session"])
    session.load(laps=True, weather=True, telemetry=False, messages=False)

    laps = session.laps
    laps = laps[laps["PitInTime"].isna() & laps["PitOutTime"].isna()].copy()
    laps = laps[laps["LapTime"].notna()].copy()
    laps = laps.sort_values(["Driver", "LapNumber"]).reset_index(drop=True)

    weather = laps.get_weather_data().reset_index(drop=True)
    laps = laps.reset_index(drop=True)
    for col in ("TrackTemp", "AirTemp", "Humidity", "WindSpeed", "Pressure"):
        laps[col] = weather[col].values

    laps["lap_time_s"] = laps["LapTime"].dt.total_seconds()

    # Drop any driver/team the checkpoint was never trained on (e.g. a
    # one-off stand-in driver) so we never hand the model an unseen category.
    known_drivers = tft_model.known_drivers()
    known_teams = tft_model.known_teams()
    laps = laps[laps["Driver"].isin(known_drivers) & laps["Team"].isin(known_teams)].copy()

    frame_rows = []
    for (driver, stint), group in laps.groupby(["Driver", "Stint"], sort=False):
        group = group.sort_values("LapNumber").reset_index(drop=True)
        group["tire_age"] = range(len(group))
        group["series_id"] = f"{driver}_S{int(stint)}"
        group["time_idx"] = range(len(group))
        frame_rows.append(group)

    full = pd.concat(frame_rows, ignore_index=True)
    full = full[FEATURE_COLS].copy()
    _session_cache[session_id] = full
    return full


def get_drivers(session_id: str) -> list[dict]:
    df = _load_session_frame(session_id)
    out = []
    seen = set()
    for _, row in df.sort_values(["Driver", "Stint"]).iterrows():
        if row["Driver"] in seen:
            continue
        seen.add(row["Driver"])
        out.append({"driver": row["Driver"], "team": row["Team"]})
    return out


def get_driver_stints(session_id: str, driver: str) -> list[int]:
    df = _load_session_frame(session_id)
    d = df[df["Driver"] == driver]
    return sorted(int(s) for s in d["Stint"].unique())


def get_driver_laps(session_id: str, driver: str) -> pd.DataFrame:
    df = _load_session_frame(session_id)
    d = df[df["Driver"] == driver].copy()
    if d.empty:
        raise SessionNotFoundError(f"no laps for driver {driver} in {session_id}")
    return d.sort_values(["Stint", "LapNumber"]).reset_index(drop=True)
