"""
module5_simulator.py — Run Simulator Benchmark Sandbox

Stress-tests a standard batch of 10 requests / 5 drivers in a closed
simulation, comparing a simulated Average Pickup ETA against a fixed
12.0-minute traditional WhatsApp-coordination baseline. All numbers here
are simulation estimates for the hackathon demo, not measured production
results -- see README disclaimer.

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

# Illustrative placeholder only. Once the real routing/matching engine
# exists, replace this with an actual measured average ETA from that engine
# instead of a hardcoded assumption.
_DEFAULT_SIMULATED_SYSTEM_ETA_MINS = 7.4


def run_simulator_benchmark(
    orders: list[MockOrder],
    drivers: list[MockDriver],
    simulated_system_eta: float = _DEFAULT_SIMULATED_SYSTEM_ETA_MINS,
) -> dict:
    """
    Compare a simulated AI-system ETA against the fixed WhatsApp baseline.

    `simulated_system_eta` is a parameter (with a placeholder default) so
    it can later be swapped for a real measured value from the actual
    dispatch engine -- it is NOT computed from `orders`/`drivers` here.
    """
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
        "whatsapp_traditional_baseline_eta_mins": WHATSAPP_BASELINE_MINS,
        "ai_system_simulated_target_eta_mins": simulated_system_eta,
        "projected_time_saved_mins": time_saved_mins,
        "simulated_efficiency_gain_percentage": efficiency_gain_percentage,
        "caveat": (
            "All ETA and efficiency figures here are hackathon simulation estimates "
            "based on a placeholder ETA value, not measured production results."
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
