"""
module3_batching.py — Smart Cargo Batching Algorithm

Groups pending merchant parcels heading to the same geofenced zone into a
single vehicle route, filling available driver capacity.

Uses an EXACT multi-dimensional 0/1 knapsack solved via dynamic programming
(maximizing order count, constrained by both weight and volume capacity)
when the scaled state space is small enough to solve in reasonable time.
Falls back to the original greedy first-fit heuristic otherwise, so the
function never hangs on a pathologically large order pool -- which
algorithm ran is reported in the output (`batching_algorithm_used`) for
transparency.

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

# --- DP knapsack tuning -----------------------------------------------------
# Weight (kg) and volume (m3) are scaled to integers before indexing the DP
# table. 20 units/kg-or-m3 (0.05 precision) keeps the state space small
# enough for realistic order-pool sizes while still being precise enough
# for real-world parcel weights. Raise for more precision, at the cost of
# a larger DP table (and correspondingly raise _MAX_DP_STATE_SPACE).
_CAPACITY_SCALE = 20

# Safety guard: if the exact DP's state space (items x weight_units x
# volume_units) would exceed this, we fall back to the greedy heuristic
# instead of risking a slow/hanging exact solve in production. Tune this
# based on real observed order-pool sizes per zone.
_MAX_DP_STATE_SPACE = 1_000_000


def _greedy_first_fit(zone_orders: list[ParcelOrder], vehicle: VehicleSpec) -> list[ParcelOrder]:
    """Greedy heuristic fallback: first-fit by pool order. Not optimal, but O(n) and always safe to run."""
    remaining_weight = vehicle["max_weight_capacity"]
    remaining_volume = vehicle["max_volume_capacity"]
    batched: list[ParcelOrder] = []
    for order in zone_orders:
        if order["weight_kg"] <= remaining_weight and order["volume_m3"] <= remaining_volume:
            batched.append(order)
            remaining_weight -= order["weight_kg"]
            remaining_volume -= order["volume_m3"]
    return batched


def _solve_knapsack_dp(zone_orders: list[ParcelOrder], vehicle: VehicleSpec) -> list[ParcelOrder] | None:
    """
    Exact multi-dimensional 0/1 knapsack: choose the subset of zone_orders
    that maximizes the COUNT of orders selected, subject to both weight and
    volume capacity constraints simultaneously.

    Returns None (signaling the caller to use the greedy fallback) if the
    scaled state space would be too large to solve exactly in reasonable
    time/memory, or if capacities are non-positive.
    """
    n = len(zone_orders)
    weight_cap = int(round(vehicle["max_weight_capacity"] * _CAPACITY_SCALE))
    volume_cap = int(round(vehicle["max_volume_capacity"] * _CAPACITY_SCALE))

    if weight_cap < 0 or volume_cap < 0 or n == 0:
        return None

    state_space = (n + 1) * (weight_cap + 1) * (volume_cap + 1)
    if state_space > _MAX_DP_STATE_SPACE:
        return None

    weights = [int(round(o["weight_kg"] * _CAPACITY_SCALE)) for o in zone_orders]
    volumes = [int(round(o["volume_m3"] * _CAPACITY_SCALE)) for o in zone_orders]

    # dp[w][v] = max number of orders selectable (from items processed so far)
    # using at most w weight-units and v volume-units. Mutated in place,
    # rolling across items (standard 0/1 knapsack space optimization).
    dp = [[0] * (volume_cap + 1) for _ in range(weight_cap + 1)]
    # keep[i][w][v] = True if item i was newly taken to reach dp[w][v] while
    # processing item i. Needed for backtracking the actual selected orders.
    keep = [[[False] * (volume_cap + 1) for _ in range(weight_cap + 1)] for _ in range(n)]

    for i in range(n):
        w_i, v_i = weights[i], volumes[i]
        if w_i > weight_cap or v_i > volume_cap:
            continue  # this single order can never fit, regardless of what else is picked
        # Iterate capacities downward so each item is only considered once (0/1, not unbounded).
        for w in range(weight_cap, w_i - 1, -1):
            for v in range(volume_cap, v_i - 1, -1):
                candidate = dp[w - w_i][v - v_i] + 1
                if candidate > dp[w][v]:
                    dp[w][v] = candidate
                    keep[i][w][v] = True

    # Backtrack from the full-capacity corner to recover which orders were selected.
    selected: list[ParcelOrder] = []
    w, v = weight_cap, volume_cap
    for i in range(n - 1, -1, -1):
        if keep[i][w][v]:
            selected.append(zone_orders[i])
            w -= weights[i]
            v -= volumes[i]
    selected.reverse()
    return selected


def smart_cargo_batching(orders_pool: list[ParcelOrder], vehicle: VehicleSpec, target_zone: str) -> dict:
    """
    Select the subset of orders_pool (targeting target_zone) that maximizes
    the number of parcels loaded onto `vehicle` without exceeding its
    weight or volume capacity.

    Tries an exact DP knapsack first; falls back to a greedy first-fit
    heuristic if the problem is too large to solve exactly in bounded time.
    Which one ran is reported in `batching_algorithm_used`.
    """
    zone_orders = [o for o in orders_pool if o["target_zone"] == target_zone]

    batched = _solve_knapsack_dp(zone_orders, vehicle)
    if batched is not None:
        algorithm_used = "EXACT_DP_KNAPSACK"
    else:
        batched = _greedy_first_fit(zone_orders, vehicle)
        algorithm_used = "GREEDY_FALLBACK_STATE_SPACE_TOO_LARGE"

    used_weight = sum(o["weight_kg"] for o in batched)
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
        "batching_algorithm_used": algorithm_used,
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
