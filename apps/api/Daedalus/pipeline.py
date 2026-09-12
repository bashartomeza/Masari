from __future__ import annotations # helps the code handle data types and clean up how it reads your code structures without breaking
from pydantic import ValidationError # if the incoming data does not fit your backend format, this catches the mistake so the system does not crash
from .lexicons import (apply_safety_layer,detect_immediate_time,detect_vehicle_class,extract_capacity,extract_clock_time,) # search the text directly for urgent words, times, or vehicle types to double-check and correct the AI's answers
from .llm_extractor import call_llm_extract # sends the raw text and asks the AI to extract the info
from .schema import DispatchRequest #  imports the final blueprint or shape that your data must match before it can safely go into your backend
#  50% accuracy. If the AI is less than 50% sure about its answer, the system will automatically flag it and say: "Hey, a human needs to double-check this!" 
CONFIDENCE_REVIEW_THRESHOLD = 0.5


def parse_dispatch_request(raw_text: str) -> DispatchRequest: #  takes user text (raw_text) and promises to return a clean, correct data structure (DispatchRequest)
    # Ask the AI
    llm_result = call_llm_extract(raw_text) #  sends the raw text to the AI (LLM) and gets back a dictionary of extracted information
    # Safety Check
    final_urgency = apply_safety_layer(raw_text, llm_result.get("urgency_profile", "Low")) # checks the text for danger words. If the AI missed an emergency but our local rules found it, our local rule wins
    # Check Vehicle Class
    vehicle_class = detect_vehicle_class(raw_text)  # uses local rules to see if the user mentioned a specific vehicle (like "Truck" or "Ambulance")
    if vehicle_class == "Unspecified": # If our local rules did not find a vehicle type...
        vehicle_class = llm_result.get("vehicle_class", "Unspecified") # then we use whatever vehicle the AI guessed. If the AI doesn't know either, we label it "Unspecified"
    # Check Time
    temporal_element = "Immediate" if detect_immediate_time(raw_text) else llm_result.get("temporal_element", "Unspecified") # If local rules see words like "now" or "ASAP", we set the time to "Immediate". Otherwise, we use what the AI found
    if temporal_element == "Unspecified": # If we still don't know the time...
        clock_time = extract_clock_time(raw_text) # we search the text for a specific clock time (like "4:30 PM") 
        if clock_time: #  If we successfully find a clock time...
            temporal_element = clock_time # we save that clock time as our time setting
    # Check Capacity & Human Review Rules
    capacity = extract_capacity(raw_text) # extracts numbers for size or people requirements (like "5 tons" or "4 passengers") 
    confidence = float(llm_result.get("confidence", 0.5)) # gets the AI's confidence score (how sure it is) and turns it into a decimal number 
    needs_review = confidence < CONFIDENCE_REVIEW_THRESHOLD #  AI's confidence is too low (below 0.5), we set needs_review to True. A human must look at it
    if final_urgency == "Emergency": #  If this is a critical emergency situation... 
        needs_review = True # we force a human review immediately, no matter how confident the AI was 
    payload = {"pickup_location": llm_result.get("pickup_location", "Unspecified"),"destination_location": llm_result.get("destination_location", "Unspecified"),"vehicle_class": vehicle_class,"temporal_element": temporal_element,"capacity_requirements": capacity,"urgency_profile": final_urgency,"confidence": confidence,"raw_text": raw_text,"needs_review": needs_review,} # groups all our clean data together into a neat package (dictionary) to send to our schema
    try: # attempt to run the next line safely 
        return DispatchRequest(**payload) # If everything matches the backend rules perfectly, create the final object and send it 
    except ValidationError: # But, if the data has bad formatting and fails the backend validation... 
        return DispatchRequest(pickup_location=payload.get("pickup_location") or "Unspecified",destination_location=payload.get("destination_location") or "Unspecified",vehicle_class="Unspecified",temporal_element="Unspecified",capacity_requirements=1,urgency_profile=final_urgency,confidence=0.0,raw_text=raw_text,needs_review=True,) # don't let the system crash! Instead, create a safe "backup" response with default values ("Unspecified", 0.0 confidence, etc.) and flag it as needs_review=True so a human fixes it manually 
