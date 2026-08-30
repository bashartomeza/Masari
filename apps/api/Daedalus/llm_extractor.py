from __future__ import annotations # Helps Python handle data types cleanly without breaking the code
import json # Imports the built-in JSON tool to read, parse, and format text data packages
import os # Imports the operating system tool to read server files or environment setup values
import re # Imports the Regular Expressions tool to search text for patterns like numbers or words
from .lexicons import detect_immediate_time, detect_vehicle_class, extract_capacity, extract_clock_time # Imports our local, hard-coded helper tools to extract times, vehicle types, and sizes

# Defines the fixed rules text block that guides the AI on how to process the messages
EXTRACTION_SYSTEM_PROMPT = """\
You extract structured dispatch fields from short Palestinian Arabic dialect \
messages for a transport/logistics app. You are one input to a larger pipeline; \
a separate deterministic safety layer independently checks for emergencies, so \
you do not need to be perfect on urgency -- focus on accurate location and intent extraction.
Rules:
- Do NOT correct, standardize, or guess the spelling of place names. Copy them exactly as written.
- If a field is not present in the text, use "Unspecified" (or 1 for capacity).
- vehicle_class must be exactly one of: Private, Public, Logistics, Unspecified.
- urgency_profile must be exactly one of: Low, Medium, High, Emergency.
- Return a confidence score (0.0-1.0) reflecting how certain you are about pickup \
and destination in particular -- lower it if the text is ambiguous, cut off, or \
mixes multiple requests.
"""

_RESPONSE_SCHEMA = {"type": "object","properties": {"pickup_location": {"type": "string"},"destination_location": {"type": "string"},"vehicle_class": {"type": "string", "enum": ["Private", "Public", "Logistics", "Unspecified"]},"temporal_element": {"type": "string"},"capacity_requirements": {"type": "integer"},"urgency_profile": {"type": "string", "enum": ["Low", "Medium", "High", "Emergency"]},"confidence": {"type": "number"},},"required": ["pickup_location", "destination_location", "vehicle_class","temporal_element", "capacity_requirements", "urgency_profile", "confidence",],"additionalProperties": False,} # Defines the strict layout map that tells the AI exactly how to shape its JSON response , Specifies that the top-level container must be a standard JSON object , Lists all the inside data fields that the AI must look for and extract properties": { 


def _openai_client(): # Starts the helper function to build and configure the OpenAI connection client 
    try: # Tells Python to check safely if the OpenAI library is installed
        from openai import OpenAI   # Attempts to import the OpenAI connection module into this function
    except ImportError: # Catches the error if the OpenAI library is completely missing
        return None # Returns nothing to tell the system that OpenAI is unavailable
    api_key = os.environ.get("OPENAI_API_KEY") # Looks inside the server environment variables for the OpenAI API Key
    if not api_key: # Checks if the API Key is missing or empty
        return None # Returns nothing because we cannot connect without a secret key
    return OpenAI(api_key=api_key) # Initializes and returns the active OpenAI client using our secret key

def call_llm_extract(text: str, model: str = "gpt-4.1-mini") -> dict: # Starts the main extraction function that takes raw text and returns a dictionary package
    client = _openai_client() # Tries to load and wake up the active OpenAI API connection client helper
    if client is None: # Checks if the connection client setup failed or is completely missing
        return heuristic_extract(text) # Falls back to a local, hard-coded rules extractor to avoid system failure
    response = client.chat.completions.create(model=model,messages=[{"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},{"role": "user", "content": text},],response_format={"type": "json_schema","json_schema": {"name": "dispatch_extraction", "schema": _RESPONSE_SCHEMA, "strict": True},},)  # Sends a request to OpenAI to generate a response based on the parameters
    return json.loads(response.choices[0].message.content) # Reads the raw text reply from the AI, parses it into a clean dictionary, and returns it

_LOCATION_STOP_MARKERS = (r"الى\b|إلى\b|لل\S|"r"ب(?:مكتب|محطة|مستشفى|دوار|بيت|شركة)|"r"ننزل\S*|نوصل\S*|نودي\S*|و\b") # Regular expression rules to find words that split the text or show destination changes

def _extract_pickup(text: str) -> str: # Starts the helper function that searches the raw text for the starting pickup location
    match = re.search(rf"\bمن\s+(?:عند\s+)?(.+?)(?=\s+(?:{_LOCATION_STOP_MARKERS})|$)", text) # Searches for location text starting with "from" (من) or "from near" (من عند) until a stop marker
    if match: # Checks if the "from" pattern match was successfully found in the text
        return match.group(1).strip() # Cleans up any extra white spaces around the found location text and returns it
    match = re.search(rf"\bعند\s+(.+?)(?=\s+(?:{_LOCATION_STOP_MARKERS}|بدنا)|$)", text) # Fallback search: Looks for location text starting with "at/near" (عند) until a stop marker
    if match: # Checks if this second "at/near" pattern match was successfully found
        return match.group(1).strip() # Cleans up any extra white spaces around the found location text and returns it
    return "Unspecified" # Returns a default fallback label if no starting location patterns were found


def _extract_destination(text: str) -> str: # Starts the helper function that searches the raw text for the destination target location 
    match = re.search(r"\b(?:الى|إلى)\s+(.+?)(?=\s+(?:و\b|والوضع)|$)", text) # Searches for location text starting with "to" (الى or إلى) until it hits another marker or end of line
    if match: # Checks if the "to" pattern match was successfully found in the text
        return match.group(1).strip() # Cleans up any extra white spaces around the found destination text and returns it
    match = re.search(r"\bلل(\S+)", text) # Second search: Looks for words starting directly with the destination letter prefix "for/to" (لل)
    if match: # Checks if this specific letter prefix match was successfully found
        return match.group(1).strip() # Cleans up any extra white spaces around the found destination text and returns it
    match = re.search(r"\bب(مكتب|محطة|مستشفى|دوار|بيت|شركة)\s+(.+?)(?=\s+(?:و\b|والوضع)|$)", text) # Third search: Looks for combinations like "at the office of" or "at the hospital of" followed by text
    if match:  # Checks if this building/place pattern match was successfully found
        return f"{match.group(1)} {match.group(2)}".strip() # Merges the place type and name together into one clean string and returns it
    return "Unspecified"  # Returns a default fallback label if no destination location patterns were found


def heuristic_extract(text: str) -> dict: # Starts the backup rule-based function to parse fields manually when the LLM is offline
    pickup = _extract_pickup(text) # Uses our local function to search for and extract the starting pickup location
    destination = _extract_destination(text) # Uses our local function to search for and extract the final arrival destination
    vehicle_class = detect_vehicle_class(text) # Runs the vocabulary rule checker to detect the specific vehicle type requested
    temporal_element = "Immediate" if detect_immediate_time(text) else (extract_clock_time(text) or "Unspecified")  # Sets time to 'Immediate' if urgent words are found, else searches for a clock time
    urgency = "High" if "مستعجل" in text else "Low"  # Flags urgency as 'High' if the text contains 'مستعجل' (urgent), otherwise marks it 'Low' 
    capacity = extract_capacity(text)  # Extracts any specific cargo weight or passenger count numbers from the text
    capacity = extract_capacity(text)
    confidence = 0.55 # Sets a standard starting baseline confidence score of 55% for manual rules
    if pickup == "Unspecified" or destination == "Unspecified":  # Checks if either the pickup point or the destination point could not be found
        confidence = 0.3   # Lowers the certainty score down to 30% because key routing info is missing

    return {
        "pickup_location": pickup,
        "destination_location": destination,
        "vehicle_class": vehicle_class,
        "temporal_element": temporal_element,
        "capacity_requirements": capacity,
        "urgency_profile": urgency,
        "confidence": confidence,
    }
