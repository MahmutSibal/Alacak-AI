"""Single source of truth for risk score → label/color mapping.

Used by every backend endpoint that surfaces risk to the frontend
(routes/risk.py, routes/invoices.py dashboard stats, ...). Keep these
thresholds in sync with `frontend/lib/risk.ts` — that file mirrors them so
the UI doesn't have to ship a request to label a number.

Buckets:
    >= 70   Kritik   (red)
    50-69   Yüksek   (orange)
    30-49   Orta     (yellow)
    0-29    Düşük    (green)
"""

from __future__ import annotations

from typing import Literal

RiskLabel = Literal["Kritik", "Yüksek", "Orta", "Düşük"]


def risk_label(score: int | float | None) -> RiskLabel:
    if score is None:
        return "Düşük"
    try:
        s = int(score)
    except Exception:
        return "Düşük"
    if s >= 70:
        return "Kritik"
    if s >= 50:
        return "Yüksek"
    if s >= 30:
        return "Orta"
    return "Düşük"


def risk_color(score: int | float | None) -> str:
    """Hex color matching the label. Frontend reuses the same palette."""
    label = risk_label(score)
    return {
        "Kritik": "#EF4444",
        "Yüksek": "#F97316",
        "Orta": "#FBBF24",
        "Düşük": "#22C55E",
    }[label]


def is_risky(score: int | float | None, *, threshold: int = 50) -> bool:
    """Used by Mongo `Riskli Müşteri` count and similar tallies."""
    if score is None:
        return False
    try:
        return int(score) >= threshold
    except Exception:
        return False
