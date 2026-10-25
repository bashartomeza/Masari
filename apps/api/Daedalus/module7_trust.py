from __future__ import annotations  # Helps Python handle data types cleanly without breaking the code
from typing import Optional, TypedDict  # Imports tools to create dictionaries and handle fields that can be empty or None

class DriverTelemetryMetrics(TypedDict):  # Creates a strict structure blueprint for driver telemetry tracking data
    driver_id: str  # Stores the unique identification text code tracking the specific delivery driver
    delay_rate: Optional[float]  # Stores the driver's lateness percentage as a decimal, which can be None if new
    cancellation_rate: Optional[float]  # Stores the driver's trip cancellation rate as a decimal, which can be None if new
    historical_stars: Optional[float]  # Stores the driver's average rating stars out of 5, which can be None if new

WEIGHT_STARS = 0.40  # Sets the importance math weight of the customer rating stars to 40% of the total score
WEIGHT_DELAY = 0.30  # Sets the importance math weight of the driver's delay rate to 30% of the total score
WEIGHT_CANCEL = 0.30  # Sets the importance math weight of the driver's trip cancellation rate to 30% of the total score
assert abs((WEIGHT_STARS + WEIGHT_DELAY + WEIGHT_CANCEL) - 1.0) < 1e-9, "Trust weights must sum to 1.0"  # A safety system check to make absolutely sure all 3 weights add up to exactly 100%
_NEW_DRIVER_DEFAULT_STARS = 5.0  # Gives a clean starting baseline score of 5.0 rating stars to completely new drivers
_NEW_DRIVER_DEFAULT_RATE = 0.0  # Gives a clean starting baseline score of 0% delay and cancellation to new drivers

def _sanitize_metrics(metrics: DriverTelemetryMetrics) -> tuple[float, float, float]:  # Starts the helper function to clean and fix empty driver data values
    delay_rate = metrics.get("delay_rate")  # Grabs the raw delay rate percentage value from the incoming driver metrics dict
    cancellation_rate = metrics.get("cancellation_rate")  # Grabs the raw trip cancellation rate percentage value from the incoming metrics dict
    historical_stars = metrics.get("historical_stars")  # Grabs the raw customer evaluation rating stars value from the incoming metrics dict
    delay_rate = _NEW_DRIVER_DEFAULT_RATE if delay_rate is None else delay_rate  # Sets delay to 0.0 if the field is empty, otherwise keeps the found number
    cancellation_rate = _NEW_DRIVER_DEFAULT_RATE if cancellation_rate is None else cancellation_rate  # Sets cancellation to 0.0 if the field is empty, otherwise keeps the found number
    historical_stars = _NEW_DRIVER_DEFAULT_STARS if historical_stars is None else historical_stars  # Sets rating stars to a perfect 5.0 if the field is empty for new drivers
    delay_rate = max(0.0, min(1.0, delay_rate))  # Bound check: Keeps the delay score strictly trapped inside a valid range between 0.0 and 1.0
    cancellation_rate = max(0.0, min(1.0, cancellation_rate))  # Bound check: Keeps the cancellation score strictly trapped inside a valid range between 0.0 and 1.0
    historical_stars = max(0.0, min(5.0, historical_stars))  # Bound check: Keeps the rating stars score strictly trapped inside a valid range between 0.0 and 5.0
    return delay_rate, cancellation_rate, historical_stars  # Returns the three perfectly cleaned and bounded math numbers together as a grouped tuple package

def calculate_composite_trust(metrics: DriverTelemetryMetrics) -> dict:  # Starts the main function to evaluate and compute a driver's total reliability score
    delay_rate, cancellation_rate, historical_stars = _sanitize_metrics(metrics)  # Calls our data cleaning helper tool to fix any empty values and set strict boundaries
    stars_score_0_100 = (historical_stars / 5.0) * 100  # Converts the star rating out of 5 into a standard score scale between 0 and 100
    delay_compliance_0_100 = (1 - delay_rate) * 100  # Inverts the delay percentage to create a positive compliance rating score out of 100
    cancel_compliance_0_100 = (1 - cancellation_rate) * 100  # Inverts the cancellation percentage to create a positive compliance rating score out of 100
    composite = (stars_score_0_100 * WEIGHT_STARS + delay_compliance_0_100 * WEIGHT_DELAY + cancel_compliance_0_100 * WEIGHT_CANCEL)  # Multiplies each compliance score by its specific importance weight percentage and adds them up
    composite_trust_score = round(max(0.0, min(100.0, composite)), 2)  # Limits the final total math score between 0.00 and 100.00 and rounds to 2 decimal places
    if composite_trust_score >= 85:  # Condition check: Runs if the driver's total combined trust score is 85 or higher
        operational_safety_tier = "ELITE_TRUST"  # Assigns the high prestige Elite Trust label to the top performing driver
        dispatch_priority = "HIGHEST"  # Sets the system dispatch queue priority to highest so this driver gets orders first
    elif composite_trust_score >= 60:  # Condition check: Runs if the driver's total combined score is between 60 and 84
        operational_safety_tier = "STANDARD_TRUST"  # Assigns the normal safe Standard Trust label to the reliable driver
        dispatch_priority = "NORMAL"  # Sets the system dispatch queue priority to standard normal order distribution
    else:  # Fallback choice: Runs if the driver's total combined score drops anywhere below 60
        operational_safety_tier = "SUSPENDED_RISK"  # Assigns the critical Suspended Risk alert label because the driver's metrics are dangerous
        dispatch_priority = "HOLD_FOR_REVIEW"  # Blocks the driver and holds all upcoming tasks for manual administrative overview check
    return {"driver_id": metrics["driver_id"],"composite_trust_score": composite_trust_score,"operational_safety_tier": operational_safety_tier,"dispatch_priority": dispatch_priority,"system_status": "SCORE_COMPUTED",}  # Bundles and returns all computed evaluation ranks cleanly inside a dictionary package

if __name__ == "__main__":  # Standard Python rule to automatically execute the block when opening this file directly
    sample_drivers: list[DriverTelemetryMetrics] = [  # Creates a testing array containing 5 different mock driver telemetry metrics records
        {"driver_id": "D-01", "delay_rate": 0.02, "cancellation_rate": 0.01, "historical_stars": 4.9},  # Test case 1: An elite driver with minimal errors and a near-perfect rating score
        {"driver_id": "D-02", "delay_rate": 0.20, "cancellation_rate": 0.15, "historical_stars": 3.6},  # Test case 2: A standard driver with average performance ratings and moderate error delays
        {"driver_id": "D-03", "delay_rate": 0.55, "cancellation_rate": 0.40, "historical_stars": 2.1},  # Test case 3: A high-risk underperforming driver with poor ratings and heavy delays
        {"driver_id": "D-04-NEW", "delay_rate": None, "cancellation_rate": None, "historical_stars": None},  # Test case 4: A completely fresh new driver containing empty/None tracking parameters
        {"driver_id": "D-05-DIRTY", "delay_rate": -0.10, "cancellation_rate": 0.05, "historical_stars": 7.2},  # Test case 5: An invalid dirty data scenario with negative delays and out-of-bounds stars
    ]
    import json  # Imports the json utility module to cleanly format text reports output on our panel
    for driver_metrics in sample_drivers:  # Starts looping through each mock driver record in our testing array one by one
        print(json.dumps(calculate_composite_trust(driver_metrics), indent=2, ensure_ascii=False))  # Computes the composite reliability score and prints the spaced analytical block
