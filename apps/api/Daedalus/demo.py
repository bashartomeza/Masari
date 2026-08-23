"""
demo.py

Runnable demo entry point.

    python -m ai_services.demo

Set OPENAI_API_KEY beforehand to exercise the real LLM path instead of the
offline heuristic fallback.
"""

from __future__ import annotations

import json
import os

from .pipeline import parse_dispatch_request

SAMPLE_INPUTS = [
    "بدنا تكتك قوام يسحب كرتونتين كبار من عند دوار المناررة وننزلهم بمكتب البريد المركزي والوضع مستعجل",
    "في واحد مجروح عند الشفاا بدنا اسعاف قوام",
    "بدي سيرفيس من بيت لحم للخليل الساعة 16:00",
]


def main() -> None:
    mock_notice = "" if os.environ.get("OPENAI_API_KEY") else " (MOCK_MODE: no OPENAI_API_KEY set, using local heuristic extractor)"
    print(f"Masari dispatch NLP engine -- demo run{mock_notice}\n")

    for text in SAMPLE_INPUTS:
        result = parse_dispatch_request(text)
        print(f"INPUT: {text}")
        print(json.dumps(result.model_dump(), ensure_ascii=False, indent=2))
        print("-" * 60)


if __name__ == "__main__":
    main()
