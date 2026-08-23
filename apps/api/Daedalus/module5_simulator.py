"""
module5_simulator.py — Run Simulator Benchmark Sandbox

Stress-tests a standard batch of 10 requests / 5 drivers in a closed
simulation, comparing a simulated Average Pickup ETA against a fixed
12.0-minute traditional WhatsApp-coordination baseline. All numbers here
are simulation estimates for the hackathon demo, not measured production
results -- see README disclaimer.

The simulated system ETA now scales with the density of high-urgency
orders in the batch (more High-urgency orders -> a lower/faster simulated
ETA, representing automated priority dispatch), rather than a fixed value.

Owner: Fatima (simulation math), Ghaydaa (dashboard), Sarah (sandbox rigor).
"""

from __future__ import annotations

from typing import TypedDict


class MockOrder(TypedDict):
    order_id: str
    urgency: str


class MockDriver(TypedDict):
    driver_id: str
    current_zone: str


WHATSAPP_BASELINE_MINS = 12.0

# Dynamic ETA scaling constants -- all illustrative hackathon simulation
# assumptions, not measured/calibrated production values.
_BASE_SYSTEM_ETA_MINS = 8.0
_ETA_REDUCTION_PER_HIGH_URGENCY_ORDER_MINS = 0.3
_ETA_EFFICIENCY_FLOOR_MINS = 4.5


def _compute_dynamic_eta(orders: list[MockOrder]) -> float:
    """
    Start at a base ETA and reduce it per High-urgency order in the batch,
    simulating the effect of automated priority dispatch allocating faster
    assets to urgent requests. Never drops below the efficiency floor.
    """
    high_urgency_count = sum(1 for o in orders if o.get("urgency") == "High")
    eta = _BASE_SYSTEM_ETA_MINS - (high_urgency_count * _ETA_REDUCTION_PER_HIGH_URGENCY_ORDER_MINS)
    return max(eta, _ETA_EFFICIENCY_FLOOR_MINS)


def run_simulator_benchmark(
    orders: list[MockOrder],
    drivers: list[MockDriver],
    simulated_system_eta: float | None = None,
) -> dict:
    """
    Compare a simulated AI-system ETA against the fixed WhatsApp baseline.

    `simulated_system_eta` remains an optional override parameter (for
    plugging in a real measured value once an actual routing engine
    exists). If omitted, it is now computed dynamically from the batch's
    high-urgency order density via _compute_dynamic_eta, instead of a
    hardcoded constant.
    """
    high_urgency_count = sum(1 for o in orders if o.get("urgency") == "High")

    if simulated_system_eta is None:
        simulated_system_eta = _compute_dynamic_eta(orders)

    time_saved_mins = round(WHATSAPP_BASELINE_MINS - simulated_system_eta, 3)
    efficiency_gain_percentage = (
        round((time_saved_mins / WHATSAPP_BASELINE_MINS) * 100, 2)
        if WHATSAPP_BASELINE_MINS > 0
        else 0.0
    )

    return {
        "simulation_status": "BENCHMARK_COMPLETE",
        "processed_orders_count": len(orders),
        "processed_drivers_count": len(drivers),
        "high_urgency_orders_detected": high_urgency_count,
        "whatsapp_traditional_baseline_eta_mins": WHATSAPP_BASELINE_MINS,
        "ai_system_simulated_target_eta_mins": round(simulated_system_eta, 3),
        "projected_time_saved_mins": time_saved_mins,
        "simulated_efficiency_gain_percentage": efficiency_gain_percentage,
        "caveat": (
            "All ETA and efficiency figures here are hackathon simulation estimates "
            "using an illustrative dynamic scaling formula, not measured production results."
        ),
    }


if __name__ == "__main__":
    mock_orders: list[MockOrder] = [
        {"order_id": f"O{i:03d}", "urgency": "High" if i % 3 == 0 else "Low"} for i in range(1, 11)
    ]
    mock_drivers: list[MockDriver] = [
        {"driver_id": f"D{i:02d}", "current_zone": f"Zone_{i % 3}"} for i in range(1, 6)
    ]

    result = run_simulator_benchmark(mock_orders, mock_drivers)
    import json
    print(json.dumps(result, indent=2, ensure_ascii=False))

    # Demonstrate the floor: a batch entirely High-urgency should clamp at 4.5.
    all_high_orders: list[MockOrder] = [{"order_id": f"O{i}", "urgency": "High"} for i in range(20)]
    print("\nAll-high-urgency batch (should hit the 4.5-min floor):")
    print(json.dumps(run_simulator_benchmark(all_high_orders, mock_drivers), indent=2, ensure_ascii=False))
