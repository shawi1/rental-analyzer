"""Time-series forecasting for rent & value indices, plus market momentum.

Point path via Holt damped-trend exponential smoothing (statsmodels); bands from
historical YoY volatility. Falls back to a transparent blended-CAGR projection on
short/odd series. Every output reports method + CAGRs so it's defensible.
"""
from __future__ import annotations

import math
import warnings
from typing import Optional

import numpy as np

warnings.filterwarnings("ignore")


def _sorted_values(series: dict) -> list[float]:
    return [series[k] for k in sorted(series.keys())]


def _cagr(values: list[float], months: int) -> Optional[float]:
    if len(values) <= months or values[-1 - months] <= 0:
        return None
    start, end = values[-1 - months], values[-1]
    yrs = months / 12.0
    return (end / start) ** (1 / yrs) - 1


def _yoy_vol(values: list[float]) -> float:
    yoy = []
    for i in range(12, len(values)):
        if values[i - 12]:
            yoy.append(values[i] / values[i - 12] - 1)
    return float(np.std(yoy)) if len(yoy) >= 3 else 0.05


def forecast_series(series: dict, horizon_months: int = 24) -> dict:
    values = _sorted_values(series)
    dates = sorted(series.keys())
    if len(values) < 6:
        return {"error": "not enough history"}

    cagr_1y = _cagr(values, 12)
    cagr_3y = _cagr(values, 36)
    vol = _yoy_vol(values)
    last = values[-1]

    # blended annual growth (favor recent, temper with 3y), damped
    g1 = cagr_1y if cagr_1y is not None else 0.0
    g3 = cagr_3y if cagr_3y is not None else g1
    blended = 0.6 * g1 + 0.4 * g3
    blended = max(-0.15, min(0.20, blended))  # sanity clamp

    method = "blended-cagr"
    path = None
    try:
        from statsmodels.tsa.holtwinters import ExponentialSmoothing

        model = ExponentialSmoothing(np.asarray(values, dtype=float), trend="add", damped_trend=True)
        fit = model.fit(optimized=True)
        path = list(map(float, fit.forecast(horizon_months)))
        method = "holt-damped"
    except Exception:
        path = None

    monthly_g = (1 + blended) ** (1 / 12) - 1
    forecast = []
    for h in range(1, horizon_months + 1):
        pt = path[h - 1] if path else last * ((1 + monthly_g) ** h)
        band = last * vol * math.sqrt(h / 12.0)  # widen with horizon
        forecast.append({"month": h, "value": round(pt), "low": round(pt - band), "high": round(pt + band)})

    return {
        "current": round(last),
        "as_of": dates[-1],
        "cagr_1y": round(cagr_1y, 4) if cagr_1y is not None else None,
        "cagr_3y": round(cagr_3y, 4) if cagr_3y is not None else None,
        "yoy_volatility": round(vol, 4),
        "projected_annual_growth": round(blended, 4),
        "horizon_months": horizon_months,
        "method": method,
        "forecast": forecast,
        "forecast_12mo": forecast[11]["value"] if horizon_months >= 12 else forecast[-1]["value"],
    }


def momentum(series: dict) -> dict:
    values = _sorted_values(series)
    if len(values) < 13:
        return {"yoy": None, "mom_3m": None, "trend": "unknown"}
    yoy = values[-1] / values[-13] - 1 if values[-13] else None
    mom3 = values[-1] / values[-4] - 1 if len(values) >= 4 and values[-4] else None
    trend = "flat"
    if yoy is not None:
        trend = "rising" if yoy > 0.02 else ("falling" if yoy < -0.02 else "flat")
    return {
        "current": round(values[-1]),
        "yoy": round(yoy, 4) if yoy is not None else None,
        "mom_3m": round(mom3, 4) if mom3 is not None else None,
        "trend": trend,
    }
