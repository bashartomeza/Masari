"""
schema.py

Structured, validated representation of a parsed dispatch text message.
Kept separate from extraction logic so the contract (what a downstream
service can rely on) is easy to review independently of how it's produced.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

VehicleClass = Literal["Private", "Public", "Logistics", "Unspecified"]
UrgencyProfile = Literal["Low", "Medium", "High", "Emergency"]


class DispatchRequest(BaseModel):
    """Validated, structured representation of a raw dispatch text message."""

    pickup_location: str = Field(
        ..., description="Pickup point exactly as written by the user (no normalization)."
    )
    destination_location: str = Field(
        ..., description="Destination exactly as written by the user (no normalization)."
    )
    vehicle_class: VehicleClass = Field(
        "Unspecified", description="Requested vehicle/asset category."
    )
    temporal_element: str = Field(
        "Unspecified",
        description='Normalized timing: "Immediate", "Standard", an HH:MM clock time, or "Unspecified".',
    )
    capacity_requirements: int = Field(
        1, ge=1, description="Number of passengers or cargo items. Defaults to 1."
    )
    urgency_profile: UrgencyProfile = Field(
        "Low", description="Risk/urgency classification."
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Model+heuristic confidence in this extraction. Low values should trigger human review.",
    )
    raw_text: str = Field(..., description="Original untouched input text, for audit trail.")
    needs_review: bool = Field(
        False,
        description="True when the parse is ambiguous, low-confidence, or safety-relevant and should not be auto-dispatched.",
    )
