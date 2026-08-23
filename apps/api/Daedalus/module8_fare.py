"""
module8_fare.py — Enforce Route-Based Fare Control

Locks in a fixed, state-regulated fare per route (no informal "Fesal"
bargaining), while adding a transparent, automated per-minute compensation
premium based on live checkpoint-delay telemetry -- capped to prevent
exploitative premium spikes from a malfunctioning or malicious upstream
delay feed.

SECURITY NOTE (per README disclaimer): this module touches payments.
Review and security-harden before any real deployment -- in particular,
route/fare data should come from an authenticated Ministry-controlled
source, not client input, in production.

Owner: Bashar (external API integration + base-fare lookups), Hiba (secure
server-side combination logic), Sarah (tunes the compensation multiplier).
"""

from __future__ import annotations

# Ministry-approved fixed base fares per registered route. Add new routes
# here as lowercase, underscore-normalized keys.
MINISTRY_BASE_FARES: dict[str, float] = {
    "ramallah_to_nablus": 25.0,
    "hebron_to_bethlehem": 15.0,
    "jenin_to_ramallah": 40.0,
}

# Tunable, ministry-approved rate: shekels (or local currency unit) added
# per minute of live checkpoint delay. Keep this fair and non-exploitable --
# it should reflect real driver cost/time, not be used to inflate fares.
COMPENSATION_PER_MINUTE_MULTIPLIER = 0.50

# Hard ceiling on the delay-compensation premium, regardless of how many
# delay-minutes the external checkpoint API reports. Protects both riders
# (from unbounded fare spikes) and the system (from a malfunctioning or
# spoofed upstream delay feed being used to inflate fares indefinitely).
MAX_COMPENSATION_CAP = 30.0


def enforce_route_based_fare(route_name: str, live_checkpoint_delay_mins: float) -> dict:
    """
    Look up the fixed base fare for `route_name` and add a transparent,
    automated delay-compensation premium, capped at MAX_COMPENSATION_CAP.
    No manual price negotiation path exists in this function by design.
    """
    normalized_route_name = route_name.strip().lower().replace(" ", "_")

    base_fare = MINISTRY_BASE_FARES.get(normalized_route_name)
    if base_fare is None:
        return {
            "route_status": "REJECTED_INVALID_ROUTE",
            "error_log": f"Route '{route_name}' is not a registered Ministry route.",
        }

    # Anti-negative safeguard: a malfunctioning external API should never
    # be able to push a negative delay value that reduces the fare below
    # the fixed base rate.
    safe_delay_mins = max(live_checkpoint_delay_mins, 0.0)
    if live_checkpoint_delay_mins < 0:
        delay_anomaly_note = (
            f"live_checkpoint_delay_mins was negative ({live_checkpoint_delay_mins}); "
            "reset to 0.0 before calculation."
        )
    else:
        delay_anomaly_note = None

    raw_delay_premium = safe_delay_mins * COMPENSATION_PER_MINUTE_MULTIPLIER
    calculated_delay_premium = round(min(raw_delay_premium, MAX_COMPENSATION_CAP), 2)
    compensation_cap_triggered = raw_delay_premium > MAX_COMPENSATION_CAP

    final_ticket_fare = round(base_fare + calculated_delay_premium, 2)

    result = {
        "route_status": "FARE_LOCKED",
        "route_name_verified": normalized_route_name,
        "ministry_standard_base_fare": base_fare,
        "external_api_delay_minutes": live_checkpoint_delay_mins,
        "automated_checkpoint_premium_added": calculated_delay_premium,
        "final_non_negotiable_fare_simulation": final_ticket_fare,
        "billing_interface_mode": "FIXED_NON_NEGOTIABLE",
        "compensation_cap_triggered": compensation_cap_triggered,
        "max_compensation_cap": MAX_COMPENSATION_CAP,
    }
    if delay_anomaly_note:
        result["delay_anomaly_note"] = delay_anomaly_note
    return result


if __name__ == "__main__":
    import json

    print("Valid route, normal delay:")
    print(json.dumps(enforce_route_based_fare("Ramallah_To_Nablus", live_checkpoint_delay_mins=12.0), indent=2, ensure_ascii=False))

    print("\nUnregistered route:")
    print(json.dumps(enforce_route_based_fare("Gaza_To_Jerusalem", live_checkpoint_delay_mins=5.0), indent=2, ensure_ascii=False))

    print("\nExtreme delay -> compensation cap should trigger:")
    print(json.dumps(enforce_route_based_fare("Ramallah_To_Nablus", live_checkpoint_delay_mins=500.0), indent=2, ensure_ascii=False))

    print("\nNegative delay (malfunctioning API) -> should reset to 0:")
    print(json.dumps(enforce_route_based_fare("Ramallah_To_Nablus", live_checkpoint_delay_mins=-15.0), indent=2, ensure_ascii=False))
