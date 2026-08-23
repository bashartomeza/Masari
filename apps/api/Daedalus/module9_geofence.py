"""
module9_geofence.py — Evaluate Geofence Milestones (Zero-Knowledge Privacy)

Bans continuous raw-GPS streaming to the cloud. Spatial proximity is
computed locally (edge); the cloud only ever receives one of 4 discrete
milestone signals. `secret_driver_gps` must be treated as local-only in any
real deployment -- this function receiving it as a parameter is a
prototype convenience, not a statement that it should cross a network
boundary raw.

SECURITY NOTE ON THE "VERIFICATION TOKEN" BELOW: the emitted token string
(`VERIFIED_HASH_SALT_{milestone}`) is a PLACEHOLDER for the demo, not a
real cryptographic signature. It is a fixed, publicly-derivable string --
anyone who knows the milestone name can reproduce it, so it provides zero
actual protection against GPS spoofing or payload tampering. It exists
here only to show WHERE a real verification token would go in the
response shape. A real implementation needs:
  - A secret key issued per-device by the server at session start (never
    the milestone name itself, which is guessable).
  - An HMAC (e.g. HMAC-SHA256) computed client-side over
    (device_secret, milestone_id, timestamp, a server-issued nonce).
  - Server-side verification of that HMAC before trusting the milestone,
    with nonce reuse rejected to prevent replay attacks.
Ship this as-is to a real Ministry system and it will look secure while
providing none of the protection its name implies.

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

# See module docstring: this is an illustrative placeholder, NOT real crypto.
_PLACEHOLDER_TOKEN_PREFIX = "VERIFIED_HASH_SALT"


def _coordinates_are_structurally_valid(coord: Coordinate) -> bool:
    """Basic sanity bounds for a (lat, lon) pair -- catches obviously corrupted/tampered input."""
    lat, lon = coord
    return -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0


def haversine_meters(coord1: Coordinate, coord2: Coordinate) -> float:
    """Great-circle distance in meters between two (lat, lon) points. Always >= 0 for valid coordinates."""
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

    Fails safe (SECURITY_TAMPERING_BLOCKED) if either coordinate is
    structurally invalid (out of lat/lon range) or if the computed
    distance is somehow negative -- both indicate corrupted or tampered
    input, since a correct haversine calculation on valid coordinates can
    never itself produce a negative value.
    """
    if current_milestone_id not in MILESTONES_MANIFEST:
        return {
            "privacy_protocol": "RAW_GPS_STREAMING_BANNED",
            "system_integrity": "INVALID_MILESTONE_ID",
            "cloud_database_update_allowed": False,
            "emitted_milestone_signal": None,
        }

    if not (_coordinates_are_structurally_valid(secret_driver_gps) and _coordinates_are_structurally_valid(geofence_center_gps)):
        return {
            "privacy_protocol": "RAW_GPS_STREAMING_BANNED",
            "system_integrity": "SECURITY_TAMPERING_BLOCKED",
            "cloud_database_update_allowed": False,
            "emitted_milestone_signal": "SECURITY_TAMPERING_BLOCKED",
            "tampering_reason": "One or more GPS coordinates were outside valid lat/lon range.",
        }

    local_computed_distance_meters = round(haversine_meters(secret_driver_gps, geofence_center_gps), 2)

    # Defense in depth: haversine on valid coordinates can't mathematically
    # go negative, but if a future refactor swaps in a different distance
    # function (or corrupted memory produces a bad value), fail safe rather
    # than silently trusting it.
    if local_computed_distance_meters < 0:
        return {
            "privacy_protocol": "RAW_GPS_STREAMING_BANNED",
            "system_integrity": "SECURITY_TAMPERING_BLOCKED",
            "cloud_database_update_allowed": False,
            "emitted_milestone_signal": "SECURITY_TAMPERING_BLOCKED",
            "tampering_reason": "Computed distance was negative, indicating corrupted device coordinates.",
        }

    is_inside_geofence_zone = local_computed_distance_meters <= GEOFENCE_RADIUS_METERS
    milestone_name = MILESTONES_MANIFEST[current_milestone_id]

    if current_milestone_id in _GEOFENCE_DEPENDENT_MILESTONES:
        # Milestones 2 and 4: only allow the cloud update if physically inside the radius.
        if is_inside_geofence_zone:
            cloud_database_update_allowed = True
            emitted_milestone_signal = f"{milestone_name}::{_PLACEHOLDER_TOKEN_PREFIX}_{milestone_name}"
        else:
            cloud_database_update_allowed = False
            emitted_milestone_signal = "SILENT_HOLD"
    else:
        # Milestones 1 and 3: time/state-based, not geofence-dependent -- allow directly.
        cloud_database_update_allowed = True
        emitted_milestone_signal = f"{milestone_name}::{_PLACEHOLDER_TOKEN_PREFIX}_{milestone_name}"

    return {
        "privacy_protocol": "RAW_GPS_STREAMING_BANNED",
        "local_computed_distance_meters": local_computed_distance_meters,
        "geofence_perimeter_limit_meters": GEOFENCE_RADIUS_METERS,
        "is_inside_geofence_zone": is_inside_geofence_zone,
        "cloud_database_update_allowed": cloud_database_update_allowed,
        "emitted_milestone_signal": emitted_milestone_signal,
        "system_integrity": "OK",
        "verification_token_is_placeholder": True,
        "verification_token_security_note": (
            "The token appended to emitted_milestone_signal is a demo placeholder, not a real "
            "cryptographic signature -- see module docstring for what production HMAC-based "
            "verification actually requires."
        ),
    }


if __name__ == "__main__":
    import json

    geofence_center: Coordinate = (31.9038, 35.2034)
    driver_inside: Coordinate = (31.90385, 35.20345)   # a few meters away -> inside 100m radius
    driver_outside: Coordinate = (31.9200, 35.2200)     # far away -> outside radius
    driver_tampered: Coordinate = (999.0, 35.2034)      # invalid latitude -> tampering

    for milestone_id in (1, 2, 3, 4):
        driver_position = driver_inside if milestone_id in (2, 4) else driver_outside
        result = evaluate_geofence_milestones(driver_position, geofence_center, milestone_id)
        print(f"Milestone {milestone_id}:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        print()

    print("Milestone 2, driver still far away (SILENT_HOLD expected):")
    print(json.dumps(evaluate_geofence_milestones(driver_outside, geofence_center, 2), indent=2, ensure_ascii=False))
    print()

    print("Milestone 2, tampered/invalid coordinates (SECURITY_TAMPERING_BLOCKED expected):")
    print(json.dumps(evaluate_geofence_milestones(driver_tampered, geofence_center, 2), indent=2, ensure_ascii=False))
