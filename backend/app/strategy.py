"""Compares a strategy against an optional rival strategy: runs both rollouts
and computes the cumulative-time delta lap by lap (undercut/overcut view)."""
from __future__ import annotations

import json
from collections import OrderedDict
from threading import Lock

from . import rollout
from .config import DEFAULT_PIT_LOSS_S

# Rollouts are deterministic for a given (session, driver, plans, pit loss), so
# repeat requests (re-running a plan, loading a saved run) can skip the model.
# Small in-process LRU; it resets on restart, which is fine for a cache.
_CACHE_MAX = 128
_cache: "OrderedDict[str, dict]" = OrderedDict()
_cache_lock = Lock()


def compare(session_id: str, driver: str, plan: list[dict],
            rival_plan: list[dict] | None = None,
            pit_loss_s: float = DEFAULT_PIT_LOSS_S) -> dict:
    key = json.dumps([session_id, driver, plan, rival_plan, pit_loss_s], sort_keys=True)
    with _cache_lock:
        if key in _cache:
            _cache.move_to_end(key)
            return _cache[key]

    result = _compare(session_id, driver, plan, rival_plan, pit_loss_s)

    with _cache_lock:
        _cache[key] = result
        while len(_cache) > _CACHE_MAX:
            _cache.popitem(last=False)
    return result


def _compare(session_id: str, driver: str, plan: list[dict],
             rival_plan: list[dict] | None, pit_loss_s: float) -> dict:
    primary = rollout.simulate(session_id, driver, plan, pit_loss_s)
    result = {"primary": primary, "rival": None, "delta": None}

    if rival_plan:
        rival = rollout.simulate(session_id, driver, rival_plan, pit_loss_s)
        result["rival"] = rival

        primary_by_lap = {row["lap"]: row["cumulative_time_s"] for row in primary["laps"]}
        rival_by_lap = {row["lap"]: row["cumulative_time_s"] for row in rival["laps"]}
        common_laps = sorted(set(primary_by_lap) & set(rival_by_lap))

        delta_series = [
            {"lap": lap, "delta_s": primary_by_lap[lap] - rival_by_lap[lap]}
            for lap in common_laps
        ]

        crossover_lap = None
        for i in range(1, len(delta_series)):
            prev_sign = delta_series[i - 1]["delta_s"] >= 0
            cur_sign = delta_series[i]["delta_s"] >= 0
            if prev_sign != cur_sign:
                crossover_lap = delta_series[i]["lap"]
                break

        result["delta"] = {
            "series": delta_series,
            "final_delta_s": delta_series[-1]["delta_s"] if delta_series else None,
            "crossover_lap": crossover_lap,
        }

    return result
