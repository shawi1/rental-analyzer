"""AVM training pipeline (scikit-learn HistGradientBoosting).

Trains on cached MLS rows appended to data/training_{target}.jsonl by the MLS
sync (Phase 2+). Until enough rows exist, the AVM falls back to comps/baseline.
Features: beds, baths, sqft, year_built, lat, lng. Target: close_price | rent.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from ..config import DATA_DIR

FEATURES = ["beds", "baths", "sqft", "year_built", "lat", "lng"]
MIN_ROWS = 150


def _store(target: str) -> Path:
    return DATA_DIR / f"training_{target}.jsonl"


def _model_path(target: str) -> Path:
    return DATA_DIR / f"model_{target}.joblib"


def append_rows(target: str, rows: list[dict]) -> int:
    """Append training rows (called by the MLS sync). Returns total stored."""
    p = _store(target)
    with open(p, "a") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")
    return sum(1 for _ in open(p)) if p.exists() else 0


def _load(target: str):
    p = _store(target)
    if not p.exists():
        return [], []
    X, y = [], []
    for line in open(p):
        try:
            d = json.loads(line)
        except Exception:
            continue
        t = d.get("target")
        if t is None:
            continue
        X.append([d.get(f) if d.get(f) is not None else float("nan") for f in FEATURES])
        y.append(t)
    return X, y


def train(target: str) -> dict:
    X, y = _load(target)
    if len(y) < MIN_ROWS:
        return {"trained": False, "rows": len(y), "min_rows": MIN_ROWS,
                "message": f"Need >= {MIN_ROWS} rows; have {len(y)}. Falling back to comps/baseline."}
    import joblib
    import numpy as np
    from sklearn.ensemble import HistGradientBoostingRegressor
    from sklearn.model_selection import cross_val_score

    model = HistGradientBoostingRegressor(max_iter=300, learning_rate=0.06)
    Xa, ya = np.array(X, dtype=float), np.array(y, dtype=float)
    mae = -cross_val_score(model, Xa, ya, cv=4, scoring="neg_mean_absolute_error").mean()
    model.fit(Xa, ya)
    joblib.dump(model, _model_path(target))
    return {"trained": True, "rows": len(y), "cv_mae": round(float(mae))}


def predict(target: str, features: dict) -> Optional[float]:
    p = _model_path(target)
    if not p.exists():
        return None
    try:
        import joblib
        import numpy as np

        model = joblib.load(p)
        x = np.array([[features.get(f, float("nan")) for f in FEATURES]], dtype=float)
        return float(model.predict(x)[0])
    except Exception:
        return None


def status() -> dict:
    out = {}
    for target in ("value", "rent"):
        sp = _store(target)
        out[target] = {
            "training_rows": sum(1 for _ in open(sp)) if sp.exists() else 0,
            "model_trained": _model_path(target).exists(),
        }
    return out
