"""
module6_agent.py — Execute Autonomous ReAct Agent Loop

Rejects a conversational chatbot UI in favor of a silent, tool-using agent
loop. Once intent is understood (post Module 1/2), the agent selects and
triggers backend function calls -- no chat turn required from the user.

This module works in three tiers:
  - LIVE mode: if `langchain-core` + `langchain-openai` are installed and
    at least one API key is configured, it binds real tools to a
    temperature=0 model and lets the model select which tool(s) to call.
  - MULTI-KEY FALLBACK: OPENAI_API_KEY may hold a comma-separated pool of
    keys. If a call hits a rate limit on one key, the next key in the pool
    is tried automatically before giving up on the live path entirely.
  - GRACEFUL FALLBACK mode: if dependencies/keys are unavailable, or every
    key in the pool is rate-limited, it does NOT crash -- it prints a clear
    setup message and falls back to a deterministic keyword-based tool
    selector, so the prototype stays demoable without credentials.

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

# Official OpenAI chat-completion model string used for live tool binding.
_LIVE_MODEL_NAME = "gpt-4o-mini"


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


def _get_api_key_pool() -> list[str]:
    """
    Parse a comma-separated pool of API keys from OPENAI_API_KEY, so heavy
    load testing can rotate to a backup key instead of hard-failing when
    one key hits a rate limit. A single key (no commas) works exactly as
    before.
    """
    raw = os.environ.get("OPENAI_API_KEY", "")
    return [key.strip() for key in raw.split(",") if key.strip()]


def _bind_tools_live(tools: list[Callable], api_key: str):
    """Attempt to build a real LangChain tool-calling agent with a specific key. May raise ImportError."""
    from langchain_core.tools import tool as lc_tool  # type: ignore
    from langchain_openai import ChatOpenAI  # type: ignore

    bound_tools = [lc_tool(t) for t in tools]
    model = ChatOpenAI(model=_LIVE_MODEL_NAME, temperature=0, api_key=api_key)
    return model.bind_tools(bound_tools)


def _is_rate_limit_error(exc: Exception) -> bool:
    """
    Best-effort rate-limit detection that doesn't hard-depend on the openai
    SDK being installed (it may not be, if we're already in fallback mode).
    """
    try:
        from openai import RateLimitError  # type: ignore
        if isinstance(exc, RateLimitError):
            return True
    except ImportError:
        pass
    # Fallback heuristic on the exception text, in case of a wrapped/different exception type.
    message = str(exc).lower()
    return "rate limit" in message or "resourceexhausted" in message or "429" in message


def _fallback_keyword_selector(user_intent_text: str, registered_tools: list[Callable]) -> list[str]:
    """
    Deterministic, dependency-free fallback tool selector used when no LLM
    credentials are configured, or every key in the pool is rate-limited.
    Matches simple keywords in the intent text to tool names -- NOT a
    replacement for real function-calling, only a way to keep the demo
    runnable offline / under quota pressure.
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
    Tries each key in the OPENAI_API_KEY pool in turn on rate-limit errors
    before falling back to the deterministic keyword selector.
    """
    api_keys = _get_api_key_pool()

    for key_index, api_key in enumerate(api_keys):
        try:
            agent = _bind_tools_live(registered_tools, api_key)
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
                "api_key_pool_index_used": key_index,
            }
        except ImportError:
            print(
                "[module6_agent] langchain-core / langchain-openai not installed. "
                "Run: pip install langchain-core langchain-openai. Falling back to "
                "the deterministic keyword selector for this call."
            )
            break  # missing deps won't be fixed by trying another key
        except Exception as exc:  # noqa: BLE001 - any live-agent failure should fail soft, not crash
            if _is_rate_limit_error(exc) and key_index < len(api_keys) - 1:
                print(
                    f"[module6_agent] Key #{key_index} hit a rate limit. "
                    f"Trying next key in the pool ({key_index + 1}/{len(api_keys)})."
                )
                continue
            print(f"[module6_agent] Live agent call failed ({type(exc).__name__}: {exc}). Falling back.")
            break

    if not api_keys:
        print(
            "[module6_agent] No OPENAI_API_KEY configured. Set the OPENAI_API_KEY "
            "environment variable (comma-separate multiple keys for rate-limit "
            "fallback) to enable real LLM-driven tool selection. Falling back to "
            "the deterministic keyword selector for this call."
        )

    executed_backend_tools = _fallback_keyword_selector(user_intent_text, registered_tools)
    return {
        "agent_state": "FALLBACK_KEYWORD_TOOL_SELECTION",
        "input_intent_processed": user_intent_text,
        "triggered_functions_count": len(executed_backend_tools),
        "executed_backend_tools": executed_backend_tools,
        "system_interface_mode": "SILENT_FUNCTION_CALLING",
        "api_key_pool_index_used": None,
    }


if __name__ == "__main__":
    registered = [trigger_cargo_batching_api, verify_route_deviation_api]
    sample_intent = "Batch the pending cargo orders for the Ramallah zone and also verify route deviation for driver D-42."

    result = execute_react_agent_loop(sample_intent, registered)
    import json
    print(json.dumps(result, indent=2, ensure_ascii=False))
