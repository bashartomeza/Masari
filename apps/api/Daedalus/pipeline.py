"""
pipeline.py

Orchestrates the full dispatch-text-to-schema pipeline:

    1. Ask the LLM (or offline heuristic fallback) for the free-text fields.
    2. Reinforce/override urgency, vehicle class, time, and capacity with the
       deterministic lexicon layer (lexicons.py) -- this layer wins on
       safety-critical fields (see apply_safety_layer).
    3. Validate everything through the DispatchRequest schema.
    4. Flag low-confidence or safety-relevant results for human review
       instead of silently trusting the output.
"""

from __future__ import annotations

from pydantic import ValidationError

from .lexicons import (
    apply_safety_layer,
    detect_immediate_time,
    detect_vehicle_class,
    extract_capacity,
    extract_clock_time,
)
from .llm_extractor import call_llm_extract
from .schema import DispatchRequest

CONFIDENCE_REVIEW_THRESHOLD = 0.5


def parse_dispatch_request(raw_text: str) -> DispatchRequest:
    """Run the full extraction pipeline and return a validated DispatchRequest."""
    llm_result = call_llm_extract(raw_text)

    final_urgency = apply_safety_layer(raw_text, llm_result.get("urgency_profile", "Low"))

    vehicle_class = detect_vehicle_class(raw_text)
    if vehicle_class == "Unspecified":
        vehicle_class = llm_result.get("vehicle_class", "Unspecified")

    temporal_element = "Immediate" if detect_immediate_time(raw_text) else llm_result.get("temporal_element", "Unspecified")
    if temporal_element == "Unspecified":
        clock_time = extract_clock_time(raw_text)
        if clock_time:
            temporal_element = clock_time

    capacity = extract_capacity(raw_text)
    confidence = float(llm_result.get("confidence", 0.5))
    needs_review = confidence < CONFIDENCE_REVIEW_THRESHOLD

    # An emergency detected by the deterministic layer always forces review,
    # regardless of confidence -- a human should be looking at this either way.
    if final_urgency == "Emergency":
        needs_review = True

    payload = {
        "pickup_location": llm_result.get("pickup_location", "Unspecified"),
        "destination_location": llm_result.get("destination_location", "Unspecified"),
        "vehicle_class": vehicle_class,
        "temporal_element": temporal_element,
        "capacity_requirements": capacity,
        "urgency_profile": final_urgency,
        "confidence": confidence,
        "raw_text": raw_text,
        "needs_review": needs_review,
    }

    try:
        return DispatchRequest(**payload)
    except ValidationError:
        # Fail safe: never crash the pipeline on a bad extraction. Return a
        # minimal, clearly-flagged record instead so it routes to a human.
        return DispatchRequest(
            pickup_location=payload.get("pickup_location") or "Unspecified",
            destination_location=payload.get("destination_location") or "Unspecified",
            vehicle_class="Unspecified",
            temporal_element="Unspecified",
            capacity_requirements=1,
            urgency_profile=final_urgency,  # keep any detected emergency even on validation failure
            confidence=0.0,
            raw_text=raw_text,
            needs_review=True,
        )
