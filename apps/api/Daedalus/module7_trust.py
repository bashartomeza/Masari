"""
module7_trust.py — Calculate Composite Trust Score

Fuses delay rate, cancellation rate, and historical star ratings into a
single 0-100 driver trust score for dispatch prioritization, instead of
relying on raw star ratings alone.

Defends against real-world database anomalies: newly registered drivers
with no historical data yet (None/Null fields from Hiba's SQL queries),
and out-of-range values from data noise -- both are handled before scoring
so a bad row can't corrupt the composite score.

Owner: Sarah (weighted formula design), Hiba (live SQL queries),
Bashar (syncs score into driver ranking tables).
"""

from __future__ import annotations

from typing import Optional, TypedDict


class DriverTelemetryMetrics(TypedDict):
    driver_id: str
    delay_rate: Optional[float]          # 0.0-1.0, or None for a new driver with no history
    cancellation_rate: Optional[float]   # 0.0-1.0, or None for a new driver with no history
    historical_stars: Optional[float]    # 0.0-5.0, or None for a new driver with no history


# Tunable design-choice weights, NOT empirically derived. They must sum to
# 1.0 -- adjust together if you change one.
WEIGHT_STARS = 0.40
WEIGHT_DELAY = 0.30
WEIGHT_CANCEL = 0.30

assert abs((WEIGHT_STARS + WEIGHT_DELAY + WEIGHT_CANCEL) - 1.0) < 1e-9, "Trust weights must sum to 1.0"

# Government fallback baseline for brand-new drivers with no trip history
# yet: give them a perfect starting score rather than penalizing them for
# data that simply doesn't exist. They earn/lose trust as real trips accrue.
_NEW_DRIVER_DEFAULT_STARS = 5.0
_NEW_DRIVER_DEFAULT_RATE = 0.0


def _sanitize_metrics(metrics: DriverTelemetryMetrics) -> tuple[float, float, float]:
    """
    Resolve None values to the new-driver baseline, then clip everything
    to its valid structural range so corrupted/out-of-bounds database rows
    (e.g. a negative rate, or stars > 5.0) can never distort the score.
    """
    delay_rate = metrics.get("delay_rate")
    cancellation_rate = metrics.get("cancellation_rate")
    historical_stars = metrics.get("historical_stars")

    delay_rate = _NEW_DRIVER_DEFAULT_RATE if delay_rate is None else delay_rate
    cancellation_rate = _NEW_DRIVER_DEFAULT_RATE if cancellation_rate is None else cancellation_rate
    historical_stars = _NEW_DRIVER_DEFAULT_STARS if historical_stars is None else historical_stars

    delay_rate = max(0.0, min(1.0, delay_rate))
    cancellation_rate = max(0.0, min(1.0, cancellation_rate))
    historical_stars = max(0.0, min(5.0, historical_stars))

    return delay_rate, cancellation_rate, historical_stars


def calculate_composite_trust(metrics: DriverTelemetryMetrics) -> dict:
    """Combine star rating, delay compliance, and cancellation compliance into one 0-100 score."""
    delay_rate, cancellation_rate, historical_stars = _sanitize_metrics(metrics)

    stars_score_0_100 = (historical_stars / 5.0) * 100
    delay_compliance_0_100 = (1 - delay_rate) * 100
    cancel_compliance_0_100 = (1 - cancellation_rate) * 100

    composite = (
        stars_score_0_100 * WEIGHT_STARS
        + delay_compliance_0_100 * WEIGHT_DELAY
        + cancel_compliance_0_100 * WEIGHT_CANCEL
    )
    composite_trust_score = round(max(0.0, min(100.0, composite)), 2)

    if composite_trust_score >= 85:
        operational_safety_tier = "ELITE_TRUST"
        dispatch_priority = "HIGHEST"
    elif composite_trust_score >= 60:
        operational_safety_tier = "STANDARD_TRUST"
        dispatch_priority = "NORMAL"
    else:
        operational_safety_tier = "SUSPENDED_RISK"
        dispatch_priority = "HOLD_FOR_REVIEW"

    return {
        "driver_id": metrics["driver_id"],
        "composite_trust_score": composite_trust_score,
        "operational_safety_tier": operational_safety_tier,
        "dispatch_priority": dispatch_priority,
        "system_status": "SCORE_COMPUTED",
    }


if __name__ == "__main__":
    sample_drivers: list[DriverTelemetryMetrics] = [
        {"driver_id": "D-01", "delay_rate": 0.02, "cancellation_rate": 0.01, "historical_stars": 4.9},
        {"driver_id": "D-02", "delay_rate": 0.20, "cancellation_rate": 0.15, "historical_stars": 3.6},
        {"driver_id": "D-03", "delay_rate": 0.55, "cancellation_rate": 0.40, "historical_stars": 2.1},
        # New driver, no history yet -- SQL returned Nulls for everything.
        {"driver_id": "D-04-NEW", "delay_rate": None, "cancellation_rate": None, "historical_stars": None},
        # Corrupted row: negative rate and out-of-range stars from bad data.
        {"driver_id": "D-05-DIRTY", "delay_rate": -0.10, "cancellation_rate": 0.05, "historical_stars": 7.2},
    ]

    import json
    for driver_metrics in sample_drivers:
        print(json.dumps(calculate_composite_trust(driver_metrics), indent=2, ensure_ascii=False))
