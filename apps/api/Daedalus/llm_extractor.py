"""
llm_extractor.py

Free-text field extraction (locations, and a first-pass at vehicle/time/
urgency) via LLM structured output. Falls back to a local, dependency-free
heuristic when no API key is configured, so the package stays importable
and testable without network access or a paid key.

The LLM's urgency output is NOT trusted as final -- see pipeline.py and
lexicons.apply_safety_layer for why.
"""

from __future__ import annotations

import json
import os
import re

from .lexicons import detect_immediate_time, detect_vehicle_class, extract_capacity, extract_clock_time

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

_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "pickup_location": {"type": "string"},
        "destination_location": {"type": "string"},
        "vehicle_class": {"type": "string", "enum": ["Private", "Public", "Logistics", "Unspecified"]},
        "temporal_element": {"type": "string"},
        "capacity_requirements": {"type": "integer"},
        "urgency_profile": {"type": "string", "enum": ["Low", "Medium", "High", "Emergency"]},
        "confidence": {"type": "number"},
    },
    "required": [
        "pickup_location", "destination_location", "vehicle_class",
        "temporal_element", "capacity_requirements", "urgency_profile", "confidence",
    ],
    "additionalProperties": False,
}


def _openai_client():
    """Lazily construct an OpenAI client. Returns None if unavailable/unconfigured."""
    try:
        from openai import OpenAI  # type: ignore
    except ImportError:
        return None
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None
    return OpenAI(api_key=api_key)


def call_llm_extract(text: str, model: str = "gpt-4.1-mini") -> dict:
    """
    Real integration path: OpenAI structured output (JSON schema) call.
    Falls back to a local heuristic extractor when no API key is configured.
    """
    client = _openai_client()
    if client is None:
        return heuristic_extract(text)

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {"name": "dispatch_extraction", "schema": _RESPONSE_SCHEMA, "strict": True},
        },
    )
    return json.loads(response.choices[0].message.content)


# ---------------------------------------------------------------------------
# Offline heuristic fallback (MOCK_MODE)
# ---------------------------------------------------------------------------

# Stop markers used to end a pickup/destination capture early. Deliberately
# conservative: dialect delivery verbs ("ننزلهم" = "we'll drop them off") and
# attached-preposition location markers ("بمكتب" = "at the office") both
# signal that the location phrase has ended. NOT exhaustive -- this is
# exactly the gap the real LLM path closes; heuristic mode trades recall
# for being fully offline and free.
_LOCATION_STOP_MARKERS = (
    r"الى\b|إلى\b|لل\S|"
    r"ب(?:مكتب|محطة|مستشفى|دوار|بيت|شركة)|"
    r"ننزل\S*|نوصل\S*|نودي\S*|و\b"
)


def _extract_pickup(text: str) -> str:
    match = re.search(
        rf"\bمن\s+(?:عند\s+)?(.+?)(?=\s+(?:{_LOCATION_STOP_MARKERS})|$)", text
    )
    if match:
        return match.group(1).strip()
    # Fallback: "عند X" alone (e.g. an emergency pickup point with no stated destination).
    match = re.search(rf"\bعند\s+(.+?)(?=\s+(?:{_LOCATION_STOP_MARKERS}|بدنا)|$)", text)
    if match:
        return match.group(1).strip()
    return "Unspecified"


def _extract_destination(text: str) -> str:
    match = re.search(r"\b(?:الى|إلى)\s+(.+?)(?=\s+(?:و\b|والوضع)|$)", text)
    if match:
        return match.group(1).strip()
    match = re.search(r"\bلل(\S+)", text)  # attached "لل..." = "to the ..."
    if match:
        return match.group(1).strip()
    match = re.search(
        r"\bب(مكتب|محطة|مستشفى|دوار|بيت|شركة)\s+(.+?)(?=\s+(?:و\b|والوضع)|$)", text
    )
    if match:
        return f"{match.group(1)} {match.group(2)}".strip()
    return "Unspecified"


def heuristic_extract(text: str) -> dict:
    """
    Local, dependency-free stand-in for the LLM call, used in MOCK_MODE.
    Good enough for demos/tests on simple "from X to Y" phrasing; NOT a
    replacement for real NLU on longer or multi-clause dialect sentences.
    """
    pickup = _extract_pickup(text)
    destination = _extract_destination(text)

    vehicle_class = detect_vehicle_class(text)
    temporal_element = "Immediate" if detect_immediate_time(text) else (extract_clock_time(text) or "Unspecified")
    urgency = "High" if "مستعجل" in text else "Low"
    capacity = extract_capacity(text)

    confidence = 0.55  # heuristic mode is intentionally marked lower-confidence than a real LLM call
    if pickup == "Unspecified" or destination == "Unspecified":
        confidence = 0.3

    return {
        "pickup_location": pickup,
        "destination_location": destination,
        "vehicle_class": vehicle_class,
        "temporal_element": temporal_element,
        "capacity_requirements": capacity,
        "urgency_profile": urgency,
        "confidence": confidence,
    }
