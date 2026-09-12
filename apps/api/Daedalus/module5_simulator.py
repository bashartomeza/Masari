from __future__ import annotations  # Helps Python handle data types cleanly without breaking the code
from typing import TypedDict  # Imports a tool to create dict structures with strict key-value data types

class MockOrder(TypedDict):  # Creates a strict structure blueprint for simulated order dictionary items
    order_id: str  # Stores the unique identifier text tracking the package order
    urgency: str  # Stores the urgency level text of the order like Low or High

class MockDriver(TypedDict):  # Creates a strict structure blueprint for simulated driver dictionary items
    driver_id: str  # Stores the unique identifier text tracking the delivery driver
    current_zone: str  # Stores the text name of the driver's current operation area

WHATSAPP_BASELINE_MINS = 12.0  # Sets the average manual dispatch waiting time limit on WhatsApp to 12 minutes
_BASE_SYSTEM_ETA_MINS = 8.0  # Sets the starting baseline automated system waiting time to 8 minutes
_ETA_REDUCTION_PER_HIGH_URGENCY_ORDER_MINS = 0.3  # Time in minutes subtracted from wait time for every high urgency task bundle
_ETA_EFFICIENCY_FLOOR_MINS = 4.5  # The absolute minimum allowed waiting time limit which cannot drop below 4.5 minutes

def _compute_dynamic_eta(orders: list[MockOrder]) -> float:  # Starts the helper function to calculate the waiting time in minutes
    high_urgency_count = sum(1 for o in orders if o.get("urgency") == "High")  # Counts how many orders inside the bundle are marked as High urgency
    eta = _BASE_SYSTEM_ETA_MINS - (high_urgency_count * _ETA_REDUCTION_PER_HIGH_URGENCY_ORDER_MINS)  # Deducts 0.3 minutes from the 8-minute base time for each high urgency order found
    return max(eta, _ETA_EFFICIENCY_FLOOR_MINS)  # Returns the calculated time but ensures it never drops below the 4.5 minutes safety floor limit

def run_simulator_benchmark(orders: list[MockOrder],drivers: list[MockDriver],simulated_system_eta: float | None = None,) -> dict:  # Starts the core benchmark evaluation function
    high_urgency_count = sum(1 for o in orders if o.get("urgency") == "High")  # Counts how many high urgency items exist in this test batch
    if simulated_system_eta is None:  # Checks if a custom input waiting time was omitted by the caller
        simulated_system_eta = _compute_dynamic_eta(orders)  # Runs our automatic calculation function to get the current dynamic waiting time
    time_saved_mins = round(WHATSAPP_BASELINE_MINS - simulated_system_eta, 3)  # Calculates total minutes saved compared to traditional WhatsApp groups, rounded to 3 decimals
    efficiency_gain_percentage = (round((time_saved_mins / WHATSAPP_BASELINE_MINS) * 100, 2)if WHATSAPP_BASELINE_MINS > 0else 0.0)  # Computes the speed improvement percentage score rounded cleanly
    return {  # Bundles and returns all analytical simulation data inside a dictionary package
        "simulation_status": "BENCHMARK_COMPLETE",  # Stores the system flag string marking the evaluation process as successfully complete
        "processed_orders_count": len(orders),  # Stores the total number integer of mock package orders processed in this run
        "processed_drivers_count": len(drivers),  # Stores the total number integer of available drivers checked inside this simulator session
        "high_urgency_orders_detected": high_urgency_count,  # Stores the count integer of critical high priority tasks found in the pipeline
        "whatsapp_traditional_baseline_eta_mins": WHATSAPP_BASELINE_MINS,  # Stores our reference constant number (12.0 minutes) representing manual operations time
        "ai_system_simulated_target_eta_mins": round(simulated_system_eta, 3),  # Stores our new automated system arrival time estimate rounded to 3 decimal spots
        "projected_time_saved_mins": time_saved_mins,  # Stores the net duration value showing how many minutes were trimmed off the wait time
        "simulated_efficiency_gain_percentage": efficiency_gain_percentage,  # Stores the finalized calculation percentage displaying the efficiency performance boost
        "caveat": ("All ETA and efficiency figures here are hackathon simulation estimates "
                   "using an illustrative dynamic scaling formula, not measured production results."),  # Appends an explicit data notice stating this is just an experimental test formula
    }

if __name__ == "__main__":  # Standard Python rule to automatically execute the block when opening this file directly
    mock_orders: list[MockOrder] = [{"order_id": f"O{i:03d}", "urgency": "High" if i % 3 == 0 else "Low"} for i in range(1, 11)]  # Loops to auto-generate 10 sample orders mixed with High and Low urgency types
    mock_drivers: list[MockDriver] = [{"driver_id": f"D{i:02d}", "current_zone": f"Zone_{i % 3}"} for i in range(1, 6)]  # Loops to auto-generate 5 sample driver records spread across 3 local zones
    result = run_simulator_benchmark(mock_orders, mock_drivers)  # Triggers our simulator function using the 10 mixed orders and 5 drivers
    import json  # Imports the json module to organize text output printed onto our screen terminal panel
    print(json.dumps(result, indent=2, ensure_ascii=False))  # Converts our benchmark result dictionary into beautiful spaced text and prints it
    all_high_orders: list[MockOrder] = [{"order_id": f"O{i}", "urgency": "High"} for i in range(20)]  # Generates a maximum priority extreme scenario using 20 purely high urgency tasks
    print("\nAll-high-urgency batch (should hit the 4.5-min floor):")  # Prints a descriptive contextual text title to label the upcoming test run result
    print(json.dumps(run_simulator_benchmark(all_high_orders, mock_drivers), indent=2, ensure_ascii=False))  # Runs the extreme scenario benchmark and prints it to confirm it hits the 4.5 safety floor
