"""
module4_deviation.py — Calculate Route Deviation Matrix

Rejects naive "nearest available taxi" assignment. Computes the marginal
detour distance a mid-route driver would need to travel to intercept a new
pickup, and enforces a strict 5 km design-target constraint.

Uses the driver's actual route waypoints (primary_route_matrix) by finding
the closest waypoint to the pickup and measuring detour relative to that
point on the route, rather than a flat straight-line multiplier. Falls
back to the straight-line x factor model only when no route matrix is
available (e.g. driver has no active route yet).

Owner: Fatima (spatial math), Bashar (GPS pipeline), Sarah (tool-binds to
Module 6's ReAct agent).
"""

from __future__ import annotations

import math
from typing import Tuple

Coordinate = Tuple[float, float]  # (latitude, longitude)

DEVIATION_THRESHOLD_KM = 5.0

# Fallback-only approximation multiplier, used solely when the driver has
# no primary_route_matrix to compare against. A real production version
# would still prefer an actual routing-API polyline over this.
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

    When primary_route_matrix is non-empty:
      1. Find the closest waypoint on the active route to pickup_gps.
      2. total_detour_km = dist(driver, pickup) + dist(pickup, closest_waypoint)
      3. marginal_deviation_km = total_detour_km - dist(driver, closest_waypoint)
         (i.e. how much FARTHER this detour is than the driver simply
          continuing straight to that same waypoint on their existing route)

    When primary_route_matrix is empty, falls back to the simplified
    straight-line x 1.3 factor model.

    This is still a simplified planar approximation (not a true routing-
    engine polyline distance-to-route calculation, which would need actual
    road-network data) -- but it now actually uses the driver's route
    instead of ignoring it.
    """
    distance_to_new_pickup_km = haversine_km(driver_gps, pickup_gps)

    if not primary_route_matrix:
        calculated_deviation_km = round(distance_to_new_pickup_km * _DETOUR_APPROXIMATION_FACTOR, 3)
        algorithm_used = "FALLBACK_STRAIGHT_LINE_FACTOR"
    else:
        closest_waypoint = min(primary_route_matrix, key=lambda wp: haversine_km(pickup_gps, wp))
        distance_pickup_to_waypoint_km = haversine_km(pickup_gps, closest_waypoint)
        distance_driver_to_waypoint_km = haversine_km(driver_gps, closest_waypoint)

        total_detour_distance_km = distance_to_new_pickup_km + distance_pickup_to_waypoint_km
        marginal_deviation_km = total_detour_distance_km - distance_driver_to_waypoint_km

        # Floor at 0: if the pickup is essentially already on the driver's
        # route, the marginal detour shouldn't go negative due to geometry
        # rounding.
        calculated_deviation_km = round(max(marginal_deviation_km, 0.0), 3)
        algorithm_used = "POLYLINE_CLOSEST_WAYPOINT"

    is_within_allowed_limit = calculated_deviation_km <= DEVIATION_THRESHOLD_KM
    dispatch_status = "APPROVED_FOR_DISPATCH" if is_within_allowed_limit else "REJECTED_DEVIATION_TOO_HIGH"

    return {
        "calculated_deviation_km": calculated_deviation_km,
        "distance_to_new_pickup_km": round(distance_to_new_pickup_km, 3),
        "target_threshold_limit_km": DEVIATION_THRESHOLD_KM,
        "is_within_allowed_limit": is_within_allowed_limit,
        "dispatch_status": dispatch_status,
        "route_points_considered": len(primary_route_matrix),
        "deviation_algorithm_used": algorithm_used,
        "approximation_caveat": (
            "This is a simplified planar/waypoint approximation, not a true routing-"
            "engine road-network polyline distance. A production version should use "
            "an actual routing provider's route geometry."
        ),
    }


if __name__ == "__main__":
    driver_position: Coordinate = (31.9038, 35.2034)  # Ramallah area
    driver_route: list[Coordinate] = [(31.9038, 35.2034), (31.9200, 35.2100), (31.9400, 35.2250)]

    # Scenario A: nearby pickup close to the route -> should pass
    nearby_pickup: Coordinate = (31.9100, 35.2080)
    result_pass = calculate_route_deviation(driver_position, nearby_pickup, driver_route)

    # Scenario B: far pickup, well off the route -> should be rejected
    far_pickup: Coordinate = (32.2211, 35.2544)  # Nablus area, ~35km away
    result_fail = calculate_route_deviation(driver_position, far_pickup, driver_route)

    # Scenario C: no active route yet -> falls back to straight-line factor
    result_no_route = calculate_route_deviation(driver_position, nearby_pickup, [])

    import json
    print("Scenario A (nearby pickup, has route):")
    print(json.dumps(result_pass, indent=2, ensure_ascii=False))
    print("\nScenario B (far pickup, has route):")
    print(json.dumps(result_fail, indent=2, ensure_ascii=False))
    print("\nScenario C (no active route -> fallback model):")
    print(json.dumps(result_no_route, indent=2, ensure_ascii=False))
