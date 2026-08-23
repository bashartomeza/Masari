"""
module6_agent.py — Execute Autonomous ReAct Agent Loop

Rejects a conversational chatbot UI in favor of a silent, tool-using agent
loop. Once intent is understood (post Module 1/2), the agent selects and
triggers backend function calls -- no chat turn required from the user.

This module works in two modes:
  - LIVE mode: if `langchain-core` + `langchain-openai` are installed AND
    OPENAI_API_KEY is set, it binds real tools to a temperature=0 model and
    lets the model select which tool(s) to call via native function calling.
  - GRACEFUL FALLBACK mode: if either dependency or the API key is missing,
    it does NOT crash -- it prints a clear setup message and falls back to
    a simple deterministic keyword-based tool selector, so the prototype
    stays demoable without any credentials configured.

Owner: Sarah (agent architecture), Kawther (mobile API alignment),
Hiba (exposes real backend functions as callable tools).
"""

from __future__ import annotations

import os
from typing import Callable

AGENT_SYSTEM_INSTRUCTION = (
    "You are a silent backend dispatch agent. You do NOT converse with the user. "
    "Given a verified intent string, select and trigger the one or more backend "
    "tools required to fulfill it. Do not produce conversational text -- only "
    "invoke tools."
)


# ---------------------------------------------------------------------------
# Example placeholder tools. In production these would call the real
# Modules 3/4/7/8/9 functions (or their HTTP-exposed equivalents).
# ---------------------------------------------------------------------------

def trigger_cargo_batching_api(zone_id: str) -> str:
    """Triggers Module 3 (Smart Cargo Batching) for the given delivery zone_id."""
    return f"cargo_batching_triggered:zone={zone_id}"


def verify_route_deviation_api(driver_id: str, pickup_location: str) -> str:
    """Triggers Module 4 (Route Deviation Matrix) check for driver_id against pickup_location."""
    return f"route_deviation_checked:driver={driver_id},pickup={pickup_location}"


def _bind_tools_live(tools: list[Callable]):
    """Attempt to build a real LangChain tool-calling agent. May raise ImportError."""
    from langchain_core.tools import tool as lc_tool  # type: ignore
    from langchain_openai import ChatOpenAI  # type: ignore

    bound_tools = [lc_tool(t) for t in tools]
    model = ChatOpenAI(model="gpt-4.1-mini", temperature=0)
    return model.bind_tools(bound_tools)


def _fallback_keyword_selector(user_intent_text: str, registered_tools: list[Callable]) -> list[str]:
    """
    Deterministic, dependency-free fallback tool selector used when no LLM
    credentials are configured. Matches simple keywords in the intent text
    to tool names -- intentionally simple; this is NOT a replacement for
    real function-calling, only a way to keep the demo runnable offline.
    """
    text_lower = user_intent_text.lower()
    selected: list[str] = []
    for tool_fn in registered_tools:
        tool_name = tool_fn.__name__
        keyword = tool_name.split("_")[1] if "_" in tool_name else tool_name  # e.g. "cargo", "route"
        if keyword in text_lower or tool_name.replace("_api", "").replace("trigger_", "").replace("verify_", "") in text_lower:
            selected.append(tool_name)
    return selected


def execute_react_agent_loop(user_intent_text: str, registered_tools: list[Callable]) -> dict:
    """
    Silently decide which registered tool(s) to invoke for a given verified
    intent string, and return a structured execution trace (no chat reply).
    """
    has_api_key = bool(os.environ.get("OPENAI_API_KEY"))

    if has_api_key:
        try:
            agent = _bind_tools_live(registered_tools)
            response = agent.invoke(
                [
                    {"role": "system", "content": AGENT_SYSTEM_INSTRUCTION},
                    {"role": "user", "content": user_intent_text},
                ]
            )
            tool_calls = getattr(response, "tool_calls", []) or []
            executed_backend_tools = [call["name"] for call in tool_calls]
            return {
                "agent_state": "LIVE_LLM_TOOL_SELECTION",
                "input_intent_processed": user_intent_text,
                "triggered_functions_count": len(executed_backend_tools),
                "executed_backend_tools": executed_backend_tools,
                "system_interface_mode": "SILENT_FUNCTION_CALLING",
            }
        except ImportError:
            print(
                "[module6_agent] langchain-core / langchain-openai not installed. "
                "Run: pip install langchain-core langchain-openai. Falling back to "
                "the deterministic keyword selector for this call."
            )
        except Exception as exc:  # noqa: BLE001 - any live-agent failure should fail soft, not crash
            print(f"[module6_agent] Live agent call failed ({type(exc).__name__}: {exc}). Falling back.")
    else:
        print(
            "[module6_agent] No OPENAI_API_KEY configured. Set the OPENAI_API_KEY "
            "environment variable to enable real LLM-driven tool selection. "
            "Falling back to the deterministic keyword selector for this call."
        )

    executed_backend_tools = _fallback_keyword_selector(user_intent_text, registered_tools)
    return {
        "agent_state": "FALLBACK_KEYWORD_TOOL_SELECTION",
        "input_intent_processed": user_intent_text,
        "triggered_functions_count": len(executed_backend_tools),
        "executed_backend_tools": executed_backend_tools,
        "system_interface_mode": "SILENT_FUNCTION_CALLING",
    }


if __name__ == "__main__":
    registered = [trigger_cargo_batching_api, verify_route_deviation_api]
    sample_intent = "Batch the pending cargo orders for the Ramallah zone and also verify route deviation for driver D-42."

    result = execute_react_agent_loop(sample_intent, registered)
    import json
    print(json.dumps(result, indent=2, ensure_ascii=False))
