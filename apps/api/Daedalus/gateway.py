"""
gateway.py

Module 2: Confidence-based routing gateway.

Takes the output of the Module 1 extraction pipeline (DispatchRequest) and
decides whether it's safe to route straight into the autonomous dispatch
pipeline, or whether it must be interrupted and handed to a human
dispatcher.

Deliberately implemented as plain deterministic Python -- NOT an LLM call.
Comparing a float against a fixed threshold and picking one of two routes
has no ambiguity to resolve and no language to understand; running an LLM
for it would add latency, cost, and a new failure mode for zero benefit.
Determinism here comes from ordinary arithmetic, not from a temperature
setting.

Design notes:
- The threshold is a module-level constant so it's trivially testable and
  reviewable (and easy to promote to an env-configurable value later).
- Anything that isn't a well-formed DispatchRequest is fail-safe: it is
  routed to the human queue rather than assumed autonomous-safe. There is
  no scenario in which malformed input should exercise the GREEN path.
- An "Emergency" urgency_profile forces the human queue regardless of
  numeric confidence. High confidence in an extraction does not make an
  emergency dispatch decision one the system should make unsupervised;
  this mirrors the safety-override philosophy already used in the
  extraction pipeline's `apply_safety_layer`.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from .schema import DispatchRequest

CONFIDENCE_THRESHOLD_TARGET = 0.85

GatewayVerdict = Literal[
    "CONFIDENCE_PASSED", "CONFIDENCE_BREACHED_WARNING", "STRUCTURAL_FAULT_TRIGGERED"
]
RoutingTarget = Literal["AUTONOMOUS_DISPATCH_PIPELINE", "HUMAN_DISPATCHER_QUEUE_INTERFACE"]


class GatewayDecision(BaseModel):
    """Validated output of the routing gateway."""

    gateway_verdict: GatewayVerdict
    routing_target: RoutingTarget
    current_confidence_percentage: str = Field(
        ..., description='Confidence formatted as a percentage string, e.g. "92.00%".'
    )
    system_integrity_action: str = Field(
        ..., description="Human-readable description of the routing action taken."
    )


def _format_percentage(score: float) -> str:
    return f"{score * 100:.2f}%"


def evaluate_gateway(dispatch_request: DispatchRequest) -> GatewayDecision:
    """
    Apply the routing verdict logic to an already-validated DispatchRequest.

    Because this takes a DispatchRequest (not a raw dict), the "structural
    fault" path for genuinely malformed data is handled upstream by Pydantic
    validation in pipeline.parse_dispatch_request, which fails safe into a
    needs_review=True record rather than raising. See
    evaluate_gateway_from_raw() below for the entry point that accepts
    untrusted raw payloads directly and can hit STRUCTURAL_FAULT_TRIGGERED.
    """
    score = dispatch_request.confidence
    percentage = _format_percentage(score)

    if dispatch_request.urgency_profile == "Emergency":
        return GatewayDecision(
            gateway_verdict="CONFIDENCE_BREACHED_WARNING",
            routing_target="HUMAN_DISPATCHER_QUEUE_INTERFACE",
            current_confidence_percentage=percentage,
            system_integrity_action=(
                "Automation loop halted regardless of confidence score: emergency "
                "urgency_profile requires human dispatcher confirmation."
            ),
        )

    if score >= CONFIDENCE_THRESHOLD_TARGET:
        return GatewayDecision(
            gateway_verdict="CONFIDENCE_PASSED",
            routing_target="AUTONOMOUS_DISPATCH_PIPELINE",
            current_confidence_percentage=percentage,
            system_integrity_action="Bypassing verification desk. Triggering autonomous routing agent loop.",
        )

    return GatewayDecision(
        gateway_verdict="CONFIDENCE_BREACHED_WARNING",
        routing_target="HUMAN_DISPATCHER_QUEUE_INTERFACE",
        current_confidence_percentage=percentage,
        system_integrity_action=(
            "Automation loop halted. Forwarding unstructured metadata to Ministry manual verification desk."
        ),
    )


def evaluate_gateway_from_raw(raw_payload: dict) -> GatewayDecision:
    """
    Entry point for untrusted/raw input (e.g. straight off a queue or HTTP
    body) that has NOT already been validated as a DispatchRequest.

    Any schema violation -- missing confidence_score, wrong type, an
    out-of-range value, an unexpected extra/missing field in
    initial_payload -- is caught here and forces the structural-fault path.
    This is the only place STRUCTURAL_FAULT_TRIGGERED can be produced.
    """
    try:
        confidence_score = raw_payload["confidence_score"]
        if not isinstance(confidence_score, (int, float)) or isinstance(confidence_score, bool):
            raise TypeError("confidence_score must be a number")
        if not (0.0 <= float(confidence_score) <= 1.0):
            raise ValueError("confidence_score out of range [0.0, 1.0]")

        initial_payload = raw_payload["initial_payload"]
        dispatch_request = DispatchRequest(
            **initial_payload,
            confidence=float(confidence_score),
            raw_text=initial_payload.get("raw_text", ""),
        )
    except Exception as exc:  # noqa: BLE001 - intentionally broad: any failure here is a structural fault
        return GatewayDecision(
            gateway_verdict="STRUCTURAL_FAULT_TRIGGERED",
            routing_target="HUMAN_DISPATCHER_QUEUE_INTERFACE",
            current_confidence_percentage="0.00%",
            system_integrity_action=(
                f"Malformed or invalid input payload ({type(exc).__name__}: {exc}). "
                "Routing bypassed entirely; forwarding raw payload to human dispatcher queue."
            ),
        )

    return evaluate_gateway(dispatch_request)
