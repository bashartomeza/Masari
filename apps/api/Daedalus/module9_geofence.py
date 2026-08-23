"""
module9_geofence.py — Evaluate Geofence Milestones (Zero-Knowledge Privacy)

Bans continuous raw-GPS streaming to the cloud. Spatial proximity is
computed locally (edge); the cloud only ever receives one of 4 discrete
milestone signals. `secret_driver_gps` must be treated as local-only in any
real deployment -- this function receiving it as a parameter is a
prototype convenience, not a statement that it should cross a network
boundary raw.

Owner: Hiba (server-side milestone listener), Fatima (geofence-radius
math), Sarah (integration with Module 6 agent + Module 8 fare engine
without leaking raw coordinates).
"""

from __future__ import annotations

import math
from typing import Tuple

Coordinate = Tuple[float, float]  # (latitude, longitude)

GEOFENCE_RADIUS_METERS = 100.0

MILESTONES_MANIFEST: dict[int, str] = {
    1: "DISPATCH_INITIATED",
    2: "PICKUP_GEOFENCE_TRIGGERED",
    3: "TRANSIT_IN_PROGRESS",
    4: "DESTINATION_GEOFENCE_TRIGGERED",
}

# Milestone IDs that require the driver to physically be inside the
# geofence radius before a cloud update is allowed. 1 and 3 are
# time/state-based and do not depend on geofence proximity.
_GEOFENCE_DEPENDENT_MILESTONES = {2, 4}


def haversine_meters(coord1: Coordinate, coord2: Coordinate) -> float:
    """Great-circle distance in meters between two (lat, lon) points."""
    earth_radius_m = 6_371_000.0
    lat1, lon1 = coord1
    lat2, lon2 = coord2

    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius_m * c


def evaluate_geofence_milestones(
    secret_driver_gps: Coordinate,
    geofence_center_gps: Coordinate,
    current_milestone_id: int,
) -> dict:
    """
    Decide whether milestone `current_milestone_id` should be emitted to
    the cloud, WITHOUT ever transmitting raw continuous coordinates -- only
    the boolean/enum result of this local computation should cross the
    network boundary in a real deployment.
    """
    if current_milestone_id not in MILESTONES_MANIFEST:
        return {
            "privacy_protocol": "RAW_GPS_STREAMING_BANNED",
            "system_integrity": "INVALID_MILESTONE_ID",
            "cloud_database_update_allowed": False,
            "emitted_milestone_signal": None,
        }

    local_computed_distance_meters = round(haversine_meters(secret_driver_gps, geofence_center_gps), 2)
    is_inside_geofence_zone = local_computed_distance_meters <= GEOFENCE_RADIUS_METERS

    milestone_name = MILESTONES_MANIFEST[current_milestone_id]

    if current_milestone_id in _GEOFENCE_DEPENDENT_MILESTONES:
        # Milestones 2 and 4: only allow the cloud update if physically inside the radius.
        if is_inside_geofence_zone:
            cloud_database_update_allowed = True
            emitted_milestone_signal = milestone_name
        else:
            cloud_database_update_allowed = False
            emitted_milestone_signal = "SILENT_HOLD"
    else:
        # Milestones 1 and 3: time/state-based, not geofence-dependent -- allow directly.
        cloud_database_update_allowed = True
        emitted_milestone_signal = milestone_name

    return {
        "privacy_protocol": "RAW_GPS_STREAMING_BANNED",
        "local_computed_distance_meters": local_computed_distance_meters,
        "geofence_perimeter_limit_meters": GEOFENCE_RADIUS_METERS,
        "is_inside_geofence_zone": is_inside_geofence_zone,
        "cloud_database_update_allowed": cloud_database_update_allowed,
        "emitted_milestone_signal": emitted_milestone_signal,
        "system_integrity": "OK",
    }


if __name__ == "__main__":
    import json

    geofence_center: Coordinate = (31.9038, 35.2034)
    driver_inside: Coordinate = (31.90385, 35.20345)   # a few meters away -> inside 100m radius
    driver_outside: Coordinate = (31.9200, 35.2200)     # far away -> outside radius

    for milestone_id in (1, 2, 3, 4):
        driver_position = driver_inside if milestone_id in (2, 4) else driver_outside
        result = evaluate_geofence_milestones(driver_position, geofence_center, milestone_id)
        print(f"Milestone {milestone_id}:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        print()

    # Also demonstrate the SILENT_HOLD case: driver still far from the pickup geofence.
    print("Milestone 2, driver still far away (SILENT_HOLD expected):")
    print(json.dumps(evaluate_geofence_milestones(driver_outside, geofence_center, 2), indent=2, ensure_ascii=False))
