from __future__ import annotations  # Helps Python handle data types cleanly without breaking the code
import os  # Imports the operating system tool to check server files or environment key values
from typing import Callable  # Imports a helper tool to handle function types passed as variables into code

AGENT_SYSTEM_INSTRUCTION = ("You are a silent backend dispatch agent. You do NOT converse with the user. ""Given a verified intent string, select and trigger the one or more backend ""tools required to fulfill it. Do not produce conversational text -- only ""invoke tools.")  # Defines the strict system instructions telling the AI to act only as a silent tool-triggering tool without chatting
_LIVE_MODEL_NAME = "gpt-4o-mini"  # Sets the official live AI engine model name string used to execute this intelligent agent task

def trigger_cargo_batching_api(zone_id: str) -> str:  # Starts the helper function simulating a cargo bundle grouping request
    return f"cargo_batching_triggered:zone={zone_id}"  # Returns a formatted status string indicating that batching was started for this zone

def verify_route_deviation_api(driver_id: str, pickup_location: str) -> str:  # Starts the helper function simulating a path detour check request
    return f"route_deviation_checked:driver={driver_id},pickup={pickup_location}"  # Returns a formatted status string showing that the detour was checked for this driver and pickup spot

def _get_api_key_pool() -> list[str]:  # Starts the helper function to look for multiple backup api keys
    raw = os.environ.get("OPENAI_API_KEY", "")  # Grabs the raw text from environment variable which might contain split keys
    return [key.strip() for key in raw.split(",") if key.strip()]  # Splits the text by commas, cleans up extra spaces, and returns a clean list of keys

def _bind_tools_live(tools: list[Callable], api_key: str):  # Starts the function to link python tools directly into the AI model setup
    from langchain_core.tools import tool as lc_tool   # Imports LangChain's special tool decorator wrapper inside this specific function safely
    from langchain_openai import ChatOpenAI  # Imports LangChain's OpenAI connector engine class to handle intelligent communication
    bound_tools = [lc_tool(t) for t in tools]  # Loops through our standard python functions and converts them into smart LangChain tool packages
    model = ChatOpenAI(model=_LIVE_MODEL_NAME, temperature=0, api_key=api_key)  # Initializes the AI chat engine with a strict 0 temperature for absolute accuracy
    return model.bind_tools(bound_tools)  # Tells the AI model about these available tools so it knows when and how to invoke them

def _is_rate_limit_error(exc: Exception) -> bool:  # Starts the detector function to check if the error is due to hitting system speed limits
    try:  # Tells the server to run the next lines carefully without crashing if an import is missing
        from openai import RateLimitError  # Attempts to import the official OpenAI error type for traffic limit blockages
        if isinstance(exc, RateLimitError):  # Checks if the caught error matches the official OpenAI limit block type precisely
            return True  # Returns True immediately because this is confirmed to be a server traffic overload error
    except ImportError:  # Safely passes if the openai library is not found or installed on this system setup
        pass  # Continues to the fallback check below without stopping the function
    message = str(exc).lower()  # Converts the entire error text message into lowercase letters for easier text pattern searching
    return "rate limit" in message or "resourceexhausted" in message or "429" in message  # Returns True if any standard over-limit words or the 429 code are in the error text

def _fallback_keyword_selector(user_intent_text: str, registered_tools: list[Callable]) -> list[str]:  # Starts the backup keyword selector function when the AI is blocked
    text_lower = user_intent_text.lower()  # Converts the user's intent text into lowercase letters for easy matching
    selected: list[str] = []  # Creates an empty list package to store the names of matched tools
    for tool_fn in registered_tools:  # Loops through every single functional python tool registered in our system
        tool_name = tool_fn.__name__  # Grabs the actual text name of the current python function being checked
        keyword = tool_name.split("_")[1] if "_" in tool_name else tool_name  # Extracts a clean short keyword like 'cargo' or 'route' from the second part of the name
        if keyword in text_lower or tool_name.replace("_api", "").replace("trigger_", "").replace("verify_", "") in text_lower:  # Checks if our keyword or stripped function name is typed inside the user's message
            selected.append(tool_name)  # Adds the matching function name into our chosen tool results list package
    return selected  # Returns the final list containing all the tool names matched via text keywords

def execute_react_agent_loop(user_intent_text: str, registered_tools: list[Callable]) -> dict:  # Starts the core function to run the smart agent selection routine loop
    api_keys = _get_api_key_pool()  # Grabs the list containing all our active and backup secret api keys
    for key_index, api_key in enumerate(api_keys):  # Loops through each available api key in the list along with its current tracking index number
        try:  # Tells the system to run the next block of code safely without crashing if an error occurs
            agent = _bind_tools_live(registered_tools, api_key)  # Links our system python functions directly to the active OpenAI chat model configuration
            response = agent.invoke([{"role": "system", "content": AGENT_SYSTEM_INSTRUCTION},{"role": "user", "content": user_intent_text},])  # Sends our strict instructions and the user text to the AI engine to get a response
            tool_calls = getattr(response, "tool_calls", []) or []  # Extracts the specific list of function tools the AI decided we need to trigger
            executed_backend_tools = [call["name"] for call in tool_calls]  # Loops through the AI choice results to extract only the text names of the tools
            return {"agent_state": "LIVE_LLM_TOOL_SELECTION","input_intent_processed": user_intent_text,"triggered_functions_count": len(executed_backend_tools),"executed_backend_tools": executed_backend_tools,"system_interface_mode": "SILENT_FUNCTION_CALLING","api_key_pool_index_used": key_index,}  # Bundles and returns the successful live AI tool invocation results inside a dictionary package
        except ImportError:  # Catches the error if required LangChain packages are missing from the current server installation setup
            print("[module6_agent] langchain-core / langchain-openai not installed. ""Run: pip install langchain-core langchain-openai. Falling back to ""the deterministic keyword selector for this call.")  # Prints a descriptive warning message explaining the missing code dependencies on the server
            break  # Stops the loop immediately because without these core libraries we cannot make any AI calls anyway
        except Exception as exc:  # Catches any general failure or API errors that happen during the live connection attempt
            if _is_rate_limit_error(exc) and key_index < len(api_keys) - 1:  # Checks if the error was due to speed limits and confirms we have backup keys left
                print(f"[module6_agent] Key #{key_index} hit a rate limit. "f"Trying next key in the pool ({key_index + 1}/{len(api_keys)}).")  # Prints a logging notification indicating the system is jumping to the next available backup key
                continue  # Jumps immediately to the next iteration of the loop to try the request again with the fresh key
            print(f"[module6_agent] Live agent call failed ({type(exc).__name__}: {exc}). Falling back.")  # Prints a general logging message detailing the exact technical failure encountered by the system
            break  # Exits the loop safely because the failure cannot be resolved by swapping keys
    if not api_keys:  # Checks if the api key pool array is completely empty from the very beginning of the run
        print("[module6_agent] No OPENAI_API_KEY configured. Set the OPENAI_API_KEY ""environment variable (comma-separate multiple keys for rate-limit ""fallback) to enable real LLM-driven tool selection. Falling back to ""the deterministic keyword selector for this call.")  # Prints a setup warning reminding the developer to set the required server environmental keys
    executed_backend_tools = _fallback_keyword_selector(user_intent_text, registered_tools)  # Runs our backup keyword-matching function because all live AI attempts were blocked or failed
    return {"agent_state": "FALLBACK_KEYWORD_TOOL_SELECTION","input_intent_processed": user_intent_text,"triggered_functions_count": len(executed_backend_tools),"executed_backend_tools": executed_backend_tools,"system_interface_mode": "SILENT_FUNCTION_CALLING","api_key_pool_index_used": None,}  # Returns the fallback keyword result dictionary package to ensure the system keeps running safely

if __name__ == "__main__":  # Standard Python rule to automatically execute the block when opening this file directly
    registered = [trigger_cargo_batching_api, verify_route_deviation_api]  # Creates a testing array containing our two simulated background system API functions
    sample_intent = "Batch the pending cargo orders for the Ramallah zone and also verify route deviation for driver D-42."  # Sets a sample user instruction sentence to test the intelligence of our routine loop
    result = execute_react_agent_loop(sample_intent, registered)  # Triggers the core function using the sample intent sentence and the registered tools array
    import json
    print(json.dumps(result, indent=2, ensure_ascii=False))
