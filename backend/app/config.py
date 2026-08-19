from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
RUNS_DIR = ROOT / "runs"
CACHE_DIR = ROOT / "cache"
CHECKPOINT_PATH = RUNS_DIR / "tft_fastf1.ckpt"

ENCODER_LENGTH = 8
DEFAULT_PIT_LOSS_S = 22.0
VALID_COMPOUNDS = ("SOFT", "MEDIUM", "HARD")

# Sessions with real cached FastF1 telemetry AND a driver/team roster that
# matches the checkpoint's trained embedding vocabulary (the 2025 grid and
# 2025-era team names). The two 2024 races in the cache (Bahrain, Mexico
# City) use drivers (e.g. BOT, RIC, MAG, SAR) and a team name ("RB" instead
# of "Racing Bulls") the model was never trained on, so they're excluded
# rather than fed to the model as unseen categories.
SESSION_REGISTRY = [
    {"id": "2025-japan-r", "year": 2025, "event": "Japan", "session": "R",
     "label": "2025 Japanese Grand Prix"},
    {"id": "2025-azerbaijan-r", "year": 2025, "event": "Azerbaijan", "session": "R",
     "label": "2025 Azerbaijan Grand Prix"},
    {"id": "2025-singapore-r", "year": 2025, "event": "Singapore", "session": "R",
     "label": "2025 Singapore Grand Prix"},
    {"id": "2025-mexico-r", "year": 2025, "event": "Mexico City", "session": "R",
     "label": "2025 Mexico City Grand Prix"},
    {"id": "2025-sao-paulo-r", "year": 2025, "event": "São Paulo", "session": "R",
     "label": "2025 São Paulo Grand Prix"},
]

SESSION_BY_ID = {s["id"]: s for s in SESSION_REGISTRY}
