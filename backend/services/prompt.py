import json


def build_report_prompt(trend_data: dict) -> str:
    """
    Build a strict JSON-only prompt from frontend trend/metric data.
    Expected input may contain blinkRate, useTime/useTimeSeconds, distance/distanceCm,
    brightness/brightnessLux, and eyeHealthScore.
    """
    normalized_data = {
        "blinkRate": trend_data.get("blinkRate"),
        "useTimeSeconds": trend_data.get("useTimeSeconds", trend_data.get("useTime")),
        "distanceCm": trend_data.get("distanceCm", trend_data.get("distance")),
        "brightnessLux": trend_data.get("brightnessLux", trend_data.get("brightness")),
        "eyeHealthScore": trend_data.get("eyeHealthScore"),
    }

    return f"""
You are generating an AI eye-care report for VisionGuard.

Use the following recent eye activity metrics:
{json.dumps(normalized_data, ensure_ascii=False, indent=2)}

Analyze the user's screen-use habits using these guidelines:
- Blink rate below 8/min is high risk; 8-12/min is medium risk; 12+/min is usually comfortable.
- Viewing distance below 40 cm is high risk; 40-50 cm is medium risk; 50-100 cm is recommended.
- Brightness below 200 lux or above 750 lux can be uncomfortable.
- Continuous use time above 20 minutes should trigger a break recommendation.
- Eye health score is 0-100, where higher is better.

Return ONLY a valid JSON object. No extra text.
Do not include markdown.
Do not include explanations outside JSON.
Do not include code fences.
Do not include ```json or ```.

The JSON must match exactly this schema:
{{
  "summary": "string",
  "risk_level": "low | medium | high",
  "score": 0,
  "issues": ["string"],
  "recommendations": ["string"],
  "score_explanation": "string"
}}

Rules:
- risk_level must be one of "low", "medium", or "high".
- score must be a number from 0 to 100.
- issues must be an array of concise user-facing findings.
- recommendations must be an array of practical, actionable eye-care advice.
- summary and score_explanation must be plain user-facing text.
""".strip()
