"""
module3_batching.py — Smart Cargo Batching Algorithm

Groups pending merchant parcels heading to the same geofenced zone into a
single vehicle route, filling available driver capacity. Greedy heuristic,
NOT a guaranteed-optimal knapsack solver -- see note in smart_cargo_batching.
A more exact DP-based 0/1 knapsack could be substituted later if batch sizes
stay small enough to be tractable.

Owner: Fatima (spatial/capacity logic), Bashar (DB input), Sarah (tuning).
"""

from __future__ import annotations

from typing import TypedDict


class ParcelOrder(TypedDict):
    order_id: str
    weight_kg: float
    volume_m3: float
    target_zone: str


class VehicleSpec(TypedDict):
    driver_id: str
    max_weight_capacity: float
    max_volume_capacity: float


# Simulation-only tuning constant: how much projected savings grows per
# batched order. This is an illustrative placeholder for the hackathon
# demo, not a measured cost model -- see README disclaimer.
_SAVINGS_PERCENT_PER_ORDER = 6.0
_SAVINGS_PERCENT_CAP = 40.0


def smart_cargo_batching(orders_pool: list[ParcelOrder], vehicle: VehicleSpec, target_zone: str) -> dict:
    """
    Greedily fill `vehicle`'s remaining weight/volume capacity with orders
    from `orders_pool` that target `target_zone`.

    This is a greedy heuristic (first-fit by pool order), not a guaranteed-
    optimal knapsack solution. For larger batches where optimality matters,
    swap this loop for a proper DP-based 0/1 knapsack over weight_kg (and a
    secondary volume_m3 constraint).
    """
    zone_orders = [o for o in orders_pool if o["target_zone"] == target_zone]

    remaining_weight = vehicle["max_weight_capacity"]
    remaining_volume = vehicle["max_volume_capacity"]

    batched: list[ParcelOrder] = []
    for order in zone_orders:
        if order["weight_kg"] <= remaining_weight and order["volume_m3"] <= remaining_volume:
            batched.append(order)
            remaining_weight -= order["weight_kg"]
            remaining_volume -= order["volume_m3"]

    used_weight = vehicle["max_weight_capacity"] - remaining_weight
    weight_efficiency_percentage = (
        round((used_weight / vehicle["max_weight_capacity"]) * 100, 2)
        if vehicle["max_weight_capacity"] > 0
        else 0.0
    )

    # Simulation estimate only -- scales with batch size, capped at a
    # plausible ceiling. Not derived from real cost data.
    projected_savings_percentage = min(
        len(batched) * _SAVINGS_PERCENT_PER_ORDER, _SAVINGS_PERCENT_CAP
    )

    return {
        "status": "BATCH_COMPUTED" if batched else "NO_MATCHING_ORDERS",
        "assigned_driver": vehicle["driver_id"],
        "target_zone": target_zone,
        "total_batched_orders": len(batched),
        "weight_efficiency_percentage": weight_efficiency_percentage,
        "projected_savings_percentage": round(projected_savings_percentage, 2),
        "batched_order_ids": [o["order_id"] for o in batched],
        "simulation_caveat": (
            "projected_savings_percentage is a hackathon simulation estimate, "
            "not a measured production cost figure."
        ),
    }


if __name__ == "__main__":
    sample_orders: list[ParcelOrder] = [
        {"order_id": "P001", "weight_kg": 4.0, "volume_m3": 0.10, "target_zone": "Ramallah_Center"},
        {"order_id": "P002", "weight_kg": 6.5, "volume_m3": 0.20, "target_zone": "Ramallah_Center"},
        {"order_id": "P003", "weight_kg": 3.0, "volume_m3": 0.05, "target_zone": "Nablus_Center"},
        {"order_id": "P004", "weight_kg": 8.0, "volume_m3": 0.25, "target_zone": "Ramallah_Center"},
        {"order_id": "P005", "weight_kg": 2.5, "volume_m3": 0.08, "target_zone": "Ramallah_Center"},
        {"order_id": "P006", "weight_kg": 15.0, "volume_m3": 0.50, "target_zone": "Ramallah_Center"},
    ]
    sample_vehicle: VehicleSpec = {
        "driver_id": "D-42",
        "max_weight_capacity": 20.0,
        "max_volume_capacity": 0.6,
    }

    result = smart_cargo_batching(sample_orders, sample_vehicle, "Ramallah_Center")
    import json
    print(json.dumps(result, indent=2, ensure_ascii=False))
