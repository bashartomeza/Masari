from __future__ import annotations # Helps Python handle data types cleanly without breaking the code

MINISTRY_BASE_FARES: dict[str, float] = {"ramallah_to_nablus": 25.0,"hebron_to_bethlehem": 15.0,"jenin_to_ramallah": 40.0,} # Maps the official fixed baseline price list in local currency set by the Ministry for specific travel routes
COMPENSATION_PER_MINUTE_MULTIPLIER = 0.50 # Sets the financial payout rate to 0.50 cash units added to the driver for every single minute of trip delay
MAX_COMPENSATION_CAP = 30.0 # Sets the absolute maximum limit for extra delay money payouts to not exceed 30.0 cash units

def enforce_route_based_fare(route_name: str, live_checkpoint_delay_mins: float) -> dict:
    normalized_route_name = route_name.strip().lower().replace(" ", "_")
    base_fare = MINISTRY_BASE_FARES.get(normalized_route_name)
    if base_fare is None:
        return {"route_status": "REJECTED_INVALID_ROUTE","error_log": f"Route '{route_name}' is not a registered Ministry route.",}
    safe_delay_mins = max(live_checkpoint_delay_mins, 0.0)
    if live_checkpoint_delay_mins < 0:
        delay_anomaly_note = (f"live_checkpoint_delay_mins was negative ({live_checkpoint_delay_mins}); ""reset to 0.0 before calculation.")
    else:
        delay_anomaly_note = None
    raw_delay_premium = safe_delay_mins * COMPENSATION_PER_MINUTE_MULTIPLIER
    calculated_delay_premium = round(min(raw_delay_premium, MAX_COMPENSATION_CAP), 2)
    compensation_cap_triggered = raw_delay_premium > MAX_COMPENSATION_CAP
    final_ticket_fare = round(base_fare + calculated_delay_premium, 2)
    result = {"route_status": "FARE_LOCKED","route_name_verified": normalized_route_name,"ministry_standard_base_fare": base_fare,"external_api_delay_minutes": live_checkpoint_delay_mins,"automated_checkpoint_premium_added": calculated_delay_premium,"final_non_negotiable_fare_simulation": final_ticket_fare,"billing_interface_mode": "FIXED_NON_NEGOTIABLE","compensation_cap_triggered": compensation_cap_triggered,"max_compensation_cap": MAX_COMPENSATION_CAP,}
    if delay_anomaly_note:
        result["delay_anomaly_note"] = delay_anomaly_note
    return result

if __name__ == "__main__":  # Standard Python rule to automatically execute the block when opening this file directly
    import json  # Imports the json utility module to cleanly format text reports output on our panel
    print("Valid route, normal delay:")  # Prints a descriptive title label for our first test scenario on the terminal screen
    print(json.dumps(enforce_route_based_fare("Ramallah_To_Nablus", live_checkpoint_delay_mins=12.0), indent=2, ensure_ascii=False))  # Calls the function for a registered path with a standard 12-minute delay and prints the formatted dictionary result
    print("\nUnregistered route:")  # Prints a descriptive title label for our second test scenario showing a missing path setup
    print(json.dumps(enforce_route_based_fare("Gaza_To_Jerusalem", live_checkpoint_delay_mins=5.0), indent=2, ensure_ascii=False))  # Calls the function for an unregistered route test case to see how the system handles missing price records
    print("\nExtreme delay -> compensation cap should trigger:")  # Prints a descriptive title label for a massive roadblock layout test scenario
    print(json.dumps(enforce_route_based_fare("Ramallah_To_Nablus", live_checkpoint_delay_mins=500.0), indent=2, ensure_ascii=False))  # Calls the function with an extreme 500-minute waiting delay to test if the 30.0 cash compensation roof triggers perfectly
    print("\nNegative delay (malfunctioning API) -> should reset to 0:")  # Prints a descriptive title label for a broken input text parameter test scenario
    print(json.dumps(enforce_route_based_fare("Ramallah_To_Nablus", live_checkpoint_delay_mins=-15.0), indent=2, ensure_ascii=False))  # Calls the function with an impossible negative delay number to confirm the safety filter overrides it to zero
