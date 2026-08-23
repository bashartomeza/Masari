"""
module7_trust.py — Calculate Composite Trust Score

Fuses delay rate, cancellation rate, and historical star ratings into a
single 0-100 driver trust score for dispatch prioritization, instead of
relying on raw star ratings alone.

Owner: Sarah (weighted formula design), Hiba (live SQL queries),
Bashar (syncs score into driver ranking tables).
"""

from __future__ import annotations

from typing import TypedDict


class DriverTelemetryMetrics(TypedDict):
    driver_id: str
    delay_rate: float          # 0.0-1.0
    cancellation_rate: float   # 0.0-1.0
    historical_stars: float    # 0.0-5.0


# Tunable design-choice weights, NOT empirically derived. They must sum to
# 1.0 -- adjust together if you change one.
WEIGHT_STARS = 0.40
WEIGHT_DELAY = 0.30
WEIGHT_CANCEL = 0.30

assert abs((WEIGHT_STARS + WEIGHT_DELAY + WEIGHT_CANCEL) - 1.0) < 1e-9, "Trust weights must sum to 1.0"


def calculate_composite_trust(metrics: DriverTelemetryMetrics) -> dict:
    """Combine star rating, delay compliance, and cancellation compliance into one 0-100 score."""
    stars_score_0_100 = (metrics["historical_stars"] / 5.0) * 100
    delay_compliance_0_100 = (1 - metrics["delay_rate"]) * 100
    cancel_compliance_0_100 = (1 - metrics["cancellation_rate"]) * 100

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
    ]

    import json
    for driver_metrics in sample_drivers:
        print(json.dumps(calculate_composite_trust(driver_metrics), indent=2, ensure_ascii=False))
