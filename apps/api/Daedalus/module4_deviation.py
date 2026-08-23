"""
module4_deviation.py — Calculate Route Deviation Matrix

Rejects naive "nearest available taxi" assignment. Computes the marginal
detour distance a mid-route driver would need to travel to intercept a new
pickup, and enforces a strict 5 km design-target constraint.

Owner: Fatima (spatial math), Bashar (GPS pipeline), Sarah (tool-binds to
Module 6's ReAct agent).
"""

from __future__ import annotations

import math
from typing import Tuple

Coordinate = Tuple[float, float]  # (latitude, longitude)

DEVIATION_THRESHOLD_KM = 5.0

# Simplified approximation multiplier: a real production version would
# compare against the driver's actual route polyline (e.g. via a routing
# provider) rather than scaling straight-line distance. Kept simple here
# so the prototype has no external routing-API dependency.
_DETOUR_APPROXIMATION_FACTOR = 1.3


def haversine_km(coord1: Coordinate, coord2: Coordinate) -> float:
    """
    Great-circle distance in kilometers between two (lat, lon) points,
    using the haversine formula. Standard-library only (math).
    """
    earth_radius_km = 6371.0
    lat1, lon1 = coord1
    lat2, lon2 = coord2

    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius_km * c


def calculate_route_deviation(
    driver_gps: Coordinate,
    pickup_gps: Coordinate,
    primary_route_matrix: list[Coordinate],
) -> dict:
    """
    Estimate the marginal detour distance for a driver to intercept a new
    pickup, and check it against DEVIATION_THRESHOLD_KM.

    `primary_route_matrix` (the driver's active route) is accepted for API
    completeness / future use (e.g. real polyline comparison) but the
    current estimate uses a simplified direct-distance x factor model --
    this is intentionally NOT a real routing-engine calculation.
    """
    distance_to_new_pickup_km = haversine_km(driver_gps, pickup_gps)

    # Simplified approximation: NOT a real route-polyline detour calculation.
    calculated_deviation_km = round(distance_to_new_pickup_km * _DETOUR_APPROXIMATION_FACTOR, 3)

    is_within_allowed_limit = calculated_deviation_km <= DEVIATION_THRESHOLD_KM
    dispatch_status = "APPROVED_FOR_DISPATCH" if is_within_allowed_limit else "REJECTED_DEVIATION_TOO_HIGH"

    return {
        "calculated_deviation_km": calculated_deviation_km,
        "distance_to_new_pickup_km": round(distance_to_new_pickup_km, 3),
        "target_threshold_limit_km": DEVIATION_THRESHOLD_KM,
        "is_within_allowed_limit": is_within_allowed_limit,
        "dispatch_status": dispatch_status,
        "route_points_considered": len(primary_route_matrix),
        "approximation_caveat": (
            "calculated_deviation_km is a simplified straight-line approximation; "
            "a production version should compare against the actual route polyline."
        ),
    }


if __name__ == "__main__":
    driver_position: Coordinate = (31.9038, 35.2034)  # Ramallah area
    driver_route: list[Coordinate] = [(31.9038, 35.2034), (31.9200, 35.2100), (31.9400, 35.2250)]

    # Scenario A: nearby pickup -> should pass
    nearby_pickup: Coordinate = (31.9100, 35.2080)
    result_pass = calculate_route_deviation(driver_position, nearby_pickup, driver_route)

    # Scenario B: far pickup -> should be rejected
    far_pickup: Coordinate = (32.2211, 35.2544)  # Nablus area, ~35km away
    result_fail = calculate_route_deviation(driver_position, far_pickup, driver_route)

    import json
    print("Scenario A (nearby pickup):")
    print(json.dumps(result_pass, indent=2, ensure_ascii=False))
    print("\nScenario B (far pickup):")
    print(json.dumps(result_fail, indent=2, ensure_ascii=False))
