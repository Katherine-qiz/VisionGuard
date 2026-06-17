import json
import os
import urllib.request
import urllib.error
from pathlib import Path
from dotenv import load_dotenv


# =========================================================
# 1. ENV LOADING (🔥 绝对稳定版本)
# =========================================================

# backend/services/openrouter.py
BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH, override=True)

API_KEY = os.getenv("OPENROUTER_API_KEY")


print("\n========== OPENROUTER INIT ==========")
print("ENV PATH:", ENV_PATH)
print("API KEY LOADED:", bool(API_KEY))
print("=====================================\n")


# =========================================================
# 2. CONFIG
# =========================================================

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "deepseek/deepseek-chat"  # 免费模型（OpenRouter routing）


# =========================================================
# 3. CORE FUNCTION
# =========================================================

def call_llm(prompt: str, timeout: int = 30) -> str:
    """
    Call OpenRouter LLM and return assistant message content.
    """

    if not API_KEY:
        print("\n❌ REQUEST NOT SENT: OPENROUTER_API_KEY is not configured")
        raise RuntimeError("OPENROUTER_API_KEY is not configured")

    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are VisionGuard AI report engine. "
                    "Return ONLY valid JSON. No markdown, no explanation."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        "temperature": 0.2,
    }

    request = urllib.request.Request(
        OPENROUTER_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",

            # 🔥 OpenRouter 必须 header（很多人漏）
            "HTTP-Referer": "http://localhost",
            "X-Title": "VisionGuard",
        },
        method="POST",
    )

    print("\nCALLING OPENROUTER API...")
    print("MODEL:", MODEL)
    print("PROMPT:", prompt)

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")

            print("\n========== RAW OPENROUTER RESPONSE ==========")
            print(raw)
            print("=============================================")

            data = json.loads(raw)

            print("\n========== PARSED OPENROUTER JSON ==========")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            print("============================================\n")

    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="ignore")
        print("\n❌ HTTP ERROR CODE:", e.code)
        print("❌ ERROR BODY:", err)
        raise RuntimeError(f"OpenRouter HTTP error {e.code}: {err}") from e

    except urllib.error.URLError as e:
        print("\n❌ NETWORK ERROR:", e.reason)
        raise RuntimeError(f"OpenRouter network error: {e.reason}") from e

    except json.JSONDecodeError as e:
        print("\n❌ REQUEST SUCCESS BUT BAD JSON:", str(e))
        raise RuntimeError("Invalid JSON response from OpenRouter") from e

    # =====================================================
    # 4. SAFE PARSING
    # =====================================================

    try:
        content = data["choices"][0]["message"]["content"]

        print("\n========== MODEL OUTPUT ==========")
        print(content)
        print("==================================\n")

        return content

    except Exception as e:
        raise RuntimeError("Invalid LLM response structure") from e
