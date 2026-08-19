"""Loads the trained TFT checkpoint once and exposes fast single-step
quantile prediction via a direct forward pass (bypassing pytorch_forecasting's
high-level .predict(), which spins up a full Lightning Trainer per call and is
far too slow/noisy for an autoregressive per-lap simulation loop)."""
from __future__ import annotations

import pandas as pd
import torch
from pytorch_forecasting import TemporalFusionTransformer, TimeSeriesDataSet

from .config import CHECKPOINT_PATH

_model: TemporalFusionTransformer | None = None
_device: str | None = None


def load_model() -> TemporalFusionTransformer:
    global _model, _device
    if _model is None:
        model = TemporalFusionTransformer.load_from_checkpoint(
            str(CHECKPOINT_PATH), map_location="cpu"
        )
        model.eval()
        _device = "cuda" if torch.cuda.is_available() else "cpu"
        model.to(_device)
        _model = model
    return _model


def device() -> str:
    load_model()
    return _device


def quantile_labels() -> list[float]:
    model = load_model()
    return list(model.loss.quantiles)


def known_drivers() -> set[str]:
    model = load_model()
    return set(model.hparams.embedding_labels["Driver"].keys())


def known_teams() -> set[str]:
    model = load_model()
    return set(model.hparams.embedding_labels["Team"].keys())


def predict_next_lap(history_df: pd.DataFrame, next_row: pd.DataFrame) -> list[float]:
    """history_df: last ENCODER_LENGTH real/simulated rows (encoder window).
    next_row: single-row DataFrame describing the lap to predict (known
    inputs only; lap_time_s is a placeholder, ignored by the model).
    Returns quantile predictions sorted ascending (fixes minor quantile
    crossing inherent to the trained quantile head)."""
    model = load_model()
    combined = pd.concat([history_df, next_row], ignore_index=True)
    for col in ("Driver", "Team", "Compound", "series_id"):
        combined[col] = combined[col].astype(str)

    dataset = TimeSeriesDataSet.from_parameters(
        model.dataset_parameters, combined, predict=True, stop_randomization=True
    )
    dataloader = dataset.to_dataloader(train=False, batch_size=1, num_workers=0)
    x, _ = next(iter(dataloader))
    x = {k: (v.to(_device) if torch.is_tensor(v) else v) for k, v in x.items()}

    with torch.no_grad():
        out = model(x)
    prediction = out["prediction"] if isinstance(out, dict) else out.prediction
    values = prediction[0, 0].tolist()
    return sorted(values)
