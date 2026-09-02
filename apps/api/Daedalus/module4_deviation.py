from __future__ import annotations # Helps Python handle data types cleanly without breaking the code
import math # Imports the built-in math module for advanced formulas like square roots
from typing import Tuple # Imports a tool to handle fixed-size pairs of data types like GPS coordinate points

Coordinate = Tuple[float, float] # Creates a strict pair blueprint representing a GPS point with latitude and longitude numbers
DEVIATION_THRESHOLD_KM = 5.0 # Sets the maximum allowed distance limit to 5 kilometers before triggering a detour alert
_DETOUR_APPROXIMATION_FACTOR = 1.3 # Scale factor to estimate real-world road curving distances from a straight line

def haversine_km(coord1: Coordinate, coord2: Coordinate) -> float: # Starts the function to calculate the actual straight-line distance in kilometers between two GPS points
    earth_radius_km = 6371.0 # Sets the official global average radius value of planet Earth to 6371 kilometers
    lat1, lon1 = coord1  # Unpacks the first GPS coordinate pair into separate latitude and longitude numbers
    lat2, lon2 = coord2 # Unpacks the second GPS coordinate pair into separate latitude and longitude numbers
    phi1, phi2 = math.radians(lat1), math.radians(lat2) # Converts both starting and ending latitude degree numbers into math radians format
    d_phi = math.radians(lat2 - lat1) # Calculates the radian difference between the two latitude coordinates
    d_lambda = math.radians(lon2 - lon1) # Calculates the radian difference between the two longitude coordinates
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2  # Computes the square of half the chord length between the points using trigonometry
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)) # Computes the angular distance in radians using the arcsin/atan2 formula parameters
    return earth_radius_km * c # Multiplies the angular arc distance by Earth's radius to get the final kilometer value

def calculate_route_deviation(driver_gps: Coordinate,pickup_gps: Coordinate,primary_route_matrix: list[Coordinate],) -> dict: # Starts the main function to check if adding a new pickup point creates too much of a detour
    distance_to_new_pickup_km = haversine_km(driver_gps, pickup_gps)  # Calculates the direct straight-line distance from the driver's current position to the new pickup point
    if not primary_route_matrix:# Check: Runs if the original planned route coordinates map is completely empty
        calculated_deviation_km = round(distance_to_new_pickup_km * _DETOUR_APPROXIMATION_FACTOR, 3) # Multiplies the distance by our curve scale factor to guess road length and rounds to 3 decimals
        algorithm_used = "FALLBACK_STRAIGHT_LINE_FACTOR" # Logs that the system used the backup straight-line multiplying math option
    else: # Main path: Runs if an actual pre-planned route path map is available
        closest_waypoint = min(primary_route_matrix, key=lambda wp: haversine_km(pickup_gps, wp)) # Finds the specific point on the original path that is geographically closest to the new pickup
        distance_pickup_to_waypoint_km = haversine_km(pickup_gps, closest_waypoint)  # Calculates the distance from the new pickup point back to that closest road point
        distance_driver_to_waypoint_km = haversine_km(driver_gps, closest_waypoint) # Calculates how far the driver currently is from that same closest road point
        total_detour_distance_km = distance_to_new_pickup_km + distance_pickup_to_waypoint_km # Adds the driver-to-pickup and pickup-to-road legs together to find the total extra detour loop
        marginal_deviation_km = total_detour_distance_km - distance_driver_to_waypoint_km # Subtracts the driver's normal road distance from the detour loop to find the clean extra deviation
        calculated_deviation_km = round(max(marginal_deviation_km, 0.0), 3)  # Ensures the deviation result is never negative and rounds the clean answer to 3 decimal points
        algorithm_used = "POLYLINE_CLOSEST_WAYPOINT" # Logs that the system successfully used the precise map path matching algorithm routine
    is_within_allowed_limit = calculated_deviation_km <= DEVIATION_THRESHOLD_KM # Checkbox check: Confirms if the extra detour mileage stays below or equal to our 5 kilometer safety limit
    dispatch_status = "APPROVED_FOR_DISPATCH" if is_within_allowed_limit else "REJECTED_DEVIATION_TOO_HIGH" # Text routing logic: Sets status to approved if within limit, or rejects it if the extra detour is too long
    return {"calculated_deviation_km": calculated_deviation_km,"distance_to_new_pickup_km": round(distance_to_new_pickup_km, 3),"target_threshold_limit_km": DEVIATION_THRESHOLD_KM,"is_within_allowed_limit": is_within_allowed_limit,"dispatch_status": dispatch_status,"route_points_considered": len(primary_route_matrix),"deviation_algorithm_used": algorithm_used,"approximation_caveat": ("This is a simplified planar/waypoint approximation, not a true routing-""engine road-network polyline distance. A production version should use ""an actual routing provider's route geometry."),} # Bundles and returns all the geographical mapping metrics cleanly inside a final dictionary package 

if __name__ == "__main__": # Standard Python rule to automatically execute the code when running this file directly
    driver_position: Coordinate = (31.9038, 35.2034)  # Sets the driver's current position coordinate pair for a testing scenario
    driver_route: list[Coordinate] = [(31.9038, 35.2034), (31.9200, 35.2100), (31.9400, 35.2250)]  # Creates a list of coordinate pairs representing the driver's pre-planned map path
    nearby_pickup: Coordinate = (31.9100, 35.2080) # Sets a nearby pickup location coordinate pair that should be close to the path
    result_pass = calculate_route_deviation(driver_position, nearby_pickup, driver_route)  # Calls our deviation tracking function to test the nearby pickup location scenario
    far_pickup: Coordinate = (32.2211, 35.2544)  # Sets a completely different far away pickup location coordinate pair for a rejection test
    result_fail = calculate_route_deviation(driver_position, far_pickup, driver_route)  # Calls our deviation function to test the far away pickup location scenario
    result_no_route = calculate_route_deviation(driver_position, nearby_pickup, []) # Calls our function to test a scenario where the driver has no pre-planned route map
    import json  # Imports the JSON formatting utility module to clean up our terminal screen output
    print("Scenario A (nearby pickup, has route):") # Prints the heading for Scenario A into the terminal console screen
    print(json.dumps(result_pass, indent=2, ensure_ascii=False)) # Formats and prints the results dictionary for Scenario A inside the console screen
    print("\nScenario B (far pickup, has route):")  # Prints the heading for Scenario B into the terminal console screen
    print(json.dumps(result_fail, indent=2, ensure_ascii=False)) # Formats and prints the results dictionary for Scenario B inside the console screen
    print("\nScenario C (no active route -> fallback model):") # Prints the heading for Scenario C into the terminal console screen
    print(json.dumps(result_no_route, indent=2, ensure_ascii=False)) # Formats and prints the results dictionary for Scenario C inside the console screen
