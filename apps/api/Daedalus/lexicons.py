"""
lexicons.py

Deterministic, auditable keyword lexicons and rule functions.

These decide the safety-critical fields (emergency detection in particular)
and reinforce vehicle/time/capacity extraction. Deliberately kept as plain
Python data + regex -- not ML -- so any ops/linguist can review, extend, or
unit-test this file without touching the LLM integration at all.

In a larger deployment, move EMERGENCY_KEYWORDS / IMMEDIATE_TIME_KEYWORDS /
VEHICLE_KEYWORDS into a versioned YAML/JSON config so non-engineers can
maintain them; kept as constants here for a self-contained package.
"""

from __future__ import annotations

import re

from .schema import VehicleClass

EMERGENCY_KEYWORDS = [
    "مجروح", "مصيبة", "حالة طارئة", "بنزف", "مستشفى قوام", "في خطر",
    "اسعاف", "إسعاف", "خطر على حياته", "طوارئ",
]

IMMEDIATE_TIME_KEYWORDS = [
    "هسا", "قوام", "طير", "بسرعة", "قوام قوام", "هلقيت", "الوضع مستعجل",
]

VEHICLE_KEYWORDS: dict[VehicleClass, list[str]] = {
    "Logistics": ["تكتك", "شاحنة", "باص شحن", "سيارة نقل", "غراض المحل", "بضاعة", "طرد"],
    "Private": ["خصوصي", "طلب", "تكسي طلبا", "ملاكي"],
    "Public": ["عمومي", "سيرفيس", "باص خط"],
}

# Small Arabic dual/number heuristic for capacity extraction.
# Replace with a proper Arabic numeral parser for production-grade coverage.
ARABIC_DIGIT_MAP = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
DUAL_SUFFIX_PATTERN = re.compile(r"\b\w*(?:ين|تين)\b")  # e.g. كرتونتين -> dual (~2)
CLOCK_TIME_PATTERN = re.compile(r"\b([01]?\d|2[0-3]):([0-5]\d)\b")


def detect_emergency(text: str) -> bool:
    """Return True if any hard emergency keyword is present. Deterministic and testable."""
    return any(keyword in text for keyword in EMERGENCY_KEYWORDS)


def detect_immediate_time(text: str) -> bool:
    """Return True if the text signals 'do this now' urgency language."""
    return any(keyword in text for keyword in IMMEDIATE_TIME_KEYWORDS)


def detect_vehicle_class(text: str) -> VehicleClass:
    """Deterministic keyword match against the vehicle lexicon. First match wins."""
    for vehicle_class, keywords in VEHICLE_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            return vehicle_class
    return "Unspecified"


def extract_capacity(text: str) -> int:
    """
    Best-effort deterministic capacity extraction:
    1. Strip out any HH:MM clock time first, so e.g. "16:00" is never
       misread as a capacity of 16.
    2. Look for an explicit remaining digit (Arabic-Indic or Western).
    3. Fall back to a dual-form heuristic (~2) for words like "كرتونتين".
    4. Default to 1.
    """
    normalized = text.translate(ARABIC_DIGIT_MAP)
    normalized_no_time = CLOCK_TIME_PATTERN.sub(" ", normalized)
    digit_match = re.search(r"\b(\d{1,3})\b", normalized_no_time)
    if digit_match:
        return int(digit_match.group(1))
    if DUAL_SUFFIX_PATTERN.search(text):
        return 2
    return 1


def extract_clock_time(text: str) -> str | None:
    """Look for an explicit HH:MM style time in the text."""
    match = CLOCK_TIME_PATTERN.search(text)
    if match:
        return f"{int(match.group(1)):02d}:{match.group(2)}"
    return None


def apply_safety_layer(text: str, llm_urgency: str) -> str:
    """
    The deterministic layer can only ever RAISE urgency relative to the LLM,
    never lower it. This prevents a language-model misread from silently
    downgrading a genuine emergency signal.
    """
    if detect_emergency(text):
        return "Emergency"
    return llm_urgency
