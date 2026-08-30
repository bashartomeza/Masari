from __future__ import annotations # Helps Python handle data types cleanly without breaking the code
from typing import TypedDict # Imports a tool to create dict structures with strict key-value data types

class ParcelOrder(TypedDict): # Creates a strict structure blueprint for parcel order dictionary items
    order_id: str # Stores the unique identifier text tracking the parcel order
    weight_kg: float # Stores the physical weight of the parcel as a decimal number in kilograms
    volume_m3: float # Stores the physical space size of the parcel as a decimal number in cubic meters
    target_zone: str # Stores the text name of the destination delivery area or sector

class VehicleSpec(TypedDict): # Creates a strict structure blueprint for vehicle specification dictionary items
    driver_id: str # Stores the unique identifier text tracking the assigned delivery driver
    max_weight_capacity: float # Stores the maximum weight the vehicle can safely carry in kilograms
    max_volume_capacity: float  # Stores the maximum physical space volume capacity available in cubic meters

_SAVINGS_PERCENT_PER_ORDER = 6.0 # Sets the initial baseline percentage discount saved for every order we bundle together
_SAVINGS_PERCENT_CAP = 40.0 # Sets the maximum limit for total bundled discount percentage to not exceed 40.0%
_CAPACITY_SCALE = 20 # Scale factor to convert fractional sizes into whole numbers for calculation matrix
_MAX_DP_STATE_SPACE = 1_000_000 # Safety roof limit to prevent the background optimization calculation from overloading


def _greedy_first_fit(zone_orders: list[ParcelOrder], vehicle: VehicleSpec) -> list[ParcelOrder]: # Starts the backup greedy algorithm function to pack items into the first open vehicle slot
    remaining_weight = vehicle["max_weight_capacity"] # Tracks the available weight limit left in the vehicle starting with max capacity
    remaining_volume = vehicle["max_volume_capacity"] # Tracks the available physical space left in the vehicle starting with max capacity
    batched: list[ParcelOrder] = []  # Creates an empty list package to hold the successfully packed parcel orders
    for order in zone_orders: # Loops through every single available parcel order assigned to this specific sector
        if order["weight_kg"] <= remaining_weight and order["volume_m3"] <= remaining_volume: # Check: Fits into vehicle if its weight and size are below remaining limits
            batched.append(order)  # Adds the current parcel order into our vehicle bundle package list
            remaining_weight -= order["weight_kg"] # Deducts the current parcel weight from the vehicle's remaining weight capacity
            remaining_volume -= order["volume_m3"] # Deducts the current parcel physical size from the vehicle's remaining space capacity
    return batched # Returns the final list containing all the successfully packed parcel orders


def _solve_knapsack_dp(zone_orders: list[ParcelOrder], vehicle: VehicleSpec) -> list[ParcelOrder] | None: # Starts the advanced mathematical calculation function to find the maximum possible packed items
    n = len(zone_orders) # Counts the total number of parcel orders available for processing
    weight_cap = int(round(vehicle["max_weight_capacity"] * _CAPACITY_SCALE)) # Converts vehicle maximum weight capacity into a scaled whole number integer 
    volume_cap = int(round(vehicle["max_volume_capacity"] * _CAPACITY_SCALE)) # Converts vehicle maximum volume capacity into a scaled whole number integer
    if weight_cap < 0 or volume_cap < 0 or n == 0:  # Validation Check: Returns nothing if limits are negative or no orders exist
        return None
    state_space = (n + 1) * (weight_cap + 1) * (volume_cap + 1) # Calculates the total memory state size needed for this matrix calculation
    if state_space > _MAX_DP_STATE_SPACE:  # Memory Guard: Returns nothing if the calculation matrix is too heavy for the server
        return None
    weights = [int(round(o["weight_kg"] * _CAPACITY_SCALE)) for o in zone_orders]  # Builds a scaled list of integer weights for all parcel orders in the list
    volumes = [int(round(o["volume_m3"] * _CAPACITY_SCALE)) for o in zone_orders] # Builds a scaled list of integer volumes for all parcel orders in the list
    dp = [[0] * (volume_cap + 1) for _ in range(weight_cap + 1)] # Creates a 2D matrix table filled with zeros to track tracking scores
    keep = [[[False] * (volume_cap + 1) for _ in range(weight_cap + 1)] for _ in range(n)]  # Creates a 3D decision table filled with False checkboxes to remember winning choices
    for i in range(n):  # Starts looping through every available parcel order one by one
        w_i, v_i = weights[i], volumes[i] # Grabs the specific scaled weight and volume values for the current parcel
        if w_i > weight_cap or v_i > volume_cap: # Skip Check: Ignores the current parcel if it is single-handedly bigger than the vehicle
            continue  
        for w in range(weight_cap, w_i - 1, -1): # Loops backward through the weight capacity matrix table slots
            for v in range(volume_cap, v_i - 1, -1): # Loops backward through the volume capacity matrix table slots
                candidate = dp[w - w_i][v - v_i] + 1 # Computes the value score if we decide to include this current parcel
                if candidate > dp[w][v]: # Checks if adding this parcel yields a better optimization score
                    dp[w][v] = candidate # Updates the matrix slot with the new higher winning score
                    keep[i][w][v] = True # Checks the internal decision box to remember this parcel won this slot
    selected: list[ParcelOrder] = []  # Creates an empty list package to hold the optimized parcel orders chosen
    w, v = weight_cap, volume_cap # Resets trackers to the full weight and volume capacities of the vehicle
    for i in range(n - 1, -1, -1): # Loops backward through all parcel orders to trace back our winning choices
        if keep[i][w][v]:  # Checks our 3D decision table if this specific parcel was flagged as a winner
            selected.append(zone_orders[i]) # Adds the winning parcel order to our final selected package list
            w -= weights[i]  # Deducts the parcel weight to shift to the next previous matrix slot
            v -= volumes[i]  # Deducts the parcel volume to shift to the next previous matrix slot
    selected.reverse() # Reverses the list back to its original chronological order for correct sequence
    return selected # Returns the finalized optimal list of parcel orders to be loaded inside the vehicle

def smart_cargo_batching(orders_pool: list[ParcelOrder], vehicle: VehicleSpec, target_zone: str) -> dict: # Starts the main coordinator function to filter, optimize, and calculate savings for a batch
    zone_orders = [o for o in orders_pool if o["target_zone"] == target_zone]  # Filters out and collects only the parcel orders that match the requested delivery area
    batched = _solve_knapsack_dp(zone_orders, vehicle) # Attempts to find the mathematically perfect loading layout using the advanced matrix function
    if batched is not None:  # Checks if the advanced matrix calculation was completed successfully without memory overloads
        algorithm_used = "EXACT_DP_KNAPSACK"  # Logs that the system successfully used the perfect mathematical knapsack algorithm
    else:  # Fallback option: Runs if the memory space was too large or complex for the matrix
        batched = _greedy_first_fit(zone_orders, vehicle) # Falls back to using the quick greedy approach to pack items into available slots
        algorithm_used = "GREEDY_FALLBACK_STATE_SPACE_TOO_LARGE" # Logs that the system had to use the backup greedy option due to complexity limits
    used_weight = sum(o["weight_kg"] for o in batched) # Calculates the total combined weight of all successfully packed parcel orders
    weight_efficiency_percentage = (round((used_weight / vehicle["max_weight_capacity"]) * 100, 2)if vehicle["max_weight_capacity"] > 0else 0.0) # Calculates the percentage of the vehicle's weight limit utilized, keeping 2 decimal points
    projected_savings_percentage = min(len(batched) * _SAVINGS_PERCENT_PER_ORDER, _SAVINGS_PERCENT_CAP)  # Calculates the initial discount savings score based on the count of combined orders
    return {"status": "BATCH_COMPUTED" if batched else "NO_MATCHING_ORDERS","assigned_driver": vehicle["driver_id"],"target_zone": target_zone,"total_batched_orders": len(batched),"weight_efficiency_percentage": weight_efficiency_percentage,"projected_savings_percentage": round(projected_savings_percentage, 2),"batched_order_ids": [o["order_id"] for o in batched],"batching_algorithm_used": algorithm_used,"simulation_caveat": ("projected_savings_percentage is a hackathon simulation estimate, ""not a measured production cost figure."),} # Bundles and returns the complete analytical breakdown results inside a dictionary package

if __name__ == "__main__": # Standard Python rule to automatically execute the code when running this file directly
    sample_orders: list[ParcelOrder] = [{"order_id": "P001", "weight_kg": 4.0, "volume_m3": 0.10, "target_zone": "Ramallah_Center"},{"order_id": "P002", "weight_kg": 6.5, "volume_m3": 0.20, "target_zone": "Ramallah_Center"},{"order_id": "P003", "weight_kg": 3.0, "volume_m3": 0.05, "target_zone": "Nablus_Center"},{"order_id": "P004", "weight_kg": 8.0, "volume_m3": 0.25, "target_zone": "Ramallah_Center"},{"order_id": "P005", "weight_kg": 2.5, "volume_m3": 0.08, "target_zone": "Ramallah_Center"},{"order_id": "P006", "weight_kg": 15.0, "volume_m3": 0.50, "target_zone": "Ramallah_Center"},] # Creates a testing list containing sample parcel orders with their weights and sizes
    sample_vehicle: VehicleSpec = {"driver_id": "D-42","max_weight_capacity": 20.0,"max_volume_capacity": 0.6,} # Creates a sample test vehicle with explicit weight capacity and space limit parameters
    result = smart_cargo_batching(sample_orders, sample_vehicle, "Ramallah_Center") # Calls our main batching coordinator function to optimize orders for Ramallah_Center
    import json # Imports the JSON formatting utility module to clean up our terminal screen output
    print(json.dumps(result, indent=2, ensure_ascii=False)) # Formats and prints the final analytical dictionary breakdown inside the console screen
