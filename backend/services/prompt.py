import json


def build_report_prompt(trend_data: dict) -> str:
    """
    Build a strict JSON-only prompt from frontend trend/metric data.
    Expected input may contain blinkRate, useTime/useTimeSeconds, distance/distanceCm,
    brightness/brightnessLux, and eyeHealthScore.
    """
    normalized_data = {
        "blinkRate": trend_data.get("blinkRate"),
        "session_use_time": trend_data.get("session_use_time", trend_data.get("sessionUseTimeSeconds", trend_data.get("useTimeSeconds"))),
        "total_use_time": trend_data.get("total_use_time", trend_data.get("totalUseTimeSeconds", trend_data.get("useTime"))),
        "avg_session_use_time": trend_data.get("avg_session_use_time", trend_data.get("avgSessionUseTimeSeconds")),
        "distanceCm": trend_data.get("distanceCm", trend_data.get("distance")),
        "brightnessLux": trend_data.get("brightnessLux", trend_data.get("brightness")),
        "eyeHealthScore": trend_data.get("eyeHealthScore"),
        "recentSamples": trend_data.get("recentSamples", []),
        "todayReminderSummary": trend_data.get("todayReminderSummary", {}),
        "currentReminders": trend_data.get("currentReminders", []),
        "reminderCountByType": trend_data.get("reminderCountByType", {}),
        "recurringIssues": trend_data.get("recurringIssues", []),
        "improvedSignals": trend_data.get("improvedSignals", []),
    }

    return f"""
You are generating an AI eye-care report for VisionGuard.

Use the following recent eye activity metrics:
{json.dumps(normalized_data, ensure_ascii=False, indent=2)}

VisionGuard score standards:
- 85-100: Good
- 70-84: Attention
- 50-69: Warning
- 0-49: High Risk

Metric standards:
- Blink Rate: Good >=12/min; Attention 8-11/min; Warning <8/min
- Viewing Distance: Good 50-100cm; Attention 40-49cm or 101-120cm; Warning <40cm or >120cm
- Brightness: Good 300-750 lux; Attention 200-299 lux or 751-1000 lux; Warning <200 lux or >1000 lux
- Session Time: Good <=20min; Attention 20-40min; Warning >40min

Analyze the user's screen-use habits using these rules:
- session_use_time is the current active session duration in seconds.
- total_use_time is the daily accumulated active monitoring time in seconds.
- avg_session_use_time is the user's average active session duration in seconds.
- blinkRate, distanceCm, brightnessLux, session_use_time, and eyeHealthScore are the current snapshot.
- recentSamples, todayReminderSummary, currentReminders, reminderCountByType, recurringIssues, and improvedSignals describe today's behavior history.
- Do not only analyze the current snapshot. Combine current values with today's reminder history.
- If current metrics are Good but today's reminders show earlier issues, explain improvement and the remaining pattern to watch.
- mainIssue must be the dominant recurring behavior or main pattern today.
- needsAttention must be practical next focus areas or cautions, not a copy of mainIssue.
- If there is no urgent warning now, do not exaggerate risk.
- Avoid repeating the same distance/blink/brightness sentence in summary, mainIssue, and needsAttention.
- Eye health score is a behavioral guidance score, not a medical diagnosis score.
- Explain what the score means in friendly language.
- Mention both good metrics and metrics that need attention.
- Use the concrete values in the input.
- Do not say distance or brightness is bad if it is in the Good range.
- Do not exaggerate risk. If only one metric is poor, explain that clearly.
- Give prevention and improvement advice.

Return ONLY a valid JSON object. No extra text.
Do not include markdown.
Do not include explanations outside JSON.
Do not include code fences.
Do not include ```json or ```.

The JSON must match exactly this schema:
{{
  "summary": "string",
  "scoreMeaning": "string",
  "mainIssue": "string",
  "whatIsGood": ["string"],
  "needsAttention": ["string"],
  "metricExplanations": [
    {{
      "metric": "blinkRate | distance | brightness | sessionTime",
      "currentValue": "string",
      "recommendedRange": "string",
      "status": "Good | Attention | Warning | High Risk",
      "meaning": "string"
    }}
  ],
  "actionPlan": {{
    "doNow": ["string"],
    "improveToday": ["string"],
    "longTermHabits": ["string"]
  }},
  "preventionTips": ["string"],
  "disclaimer": "string",
  "riskLevel": "Good | Attention | Warning | High Risk",
  "score": 0,
  "trendInsight": "string",
  "keyFindings": ["string"],
  "riskFactors": ["string"],
  "recommendations": ["string"],
  "session_use_time": 0,
  "total_use_time": 0
}}

Rules:
- riskLevel must be one of "Good", "Attention", "Warning", or "High Risk".
- score must be a number from 0 to 100.
- recommendations must be an array of practical, actionable eye-care advice.
- trendInsight must summarize today's reminder history and recent sample direction.
- disclaimer must say this is not a medical diagnosis.
- summary and scoreMeaning must be plain user-facing text.
""".strip()
