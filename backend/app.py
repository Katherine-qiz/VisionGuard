from flask import Flask, jsonify, request
from flask_cors import CORS
import base64
import random
import time

app = Flask(__name__)
CORS(app)

# Simple in-memory session state for MVP demo
SESSION_START_TIME = time.time()


def calculate_eye_health_score(
    blink_rate: int,
    distance_cm: int,
    brightness_lux: int,
    use_time_seconds: int
) -> int:
    """
    Simple rule-based score for MVP.
    Later this can be replaced by a more robust scoring model.
    """
    score = 100

    if blink_rate < 8:
        score -= 15

    if distance_cm < 40:
        score -= 15

    if brightness_lux < 200:
        score -= 10

    if use_time_seconds > 20 * 60:
        score -= 10

    return max(0, min(100, score))


def build_alerts(
    blink_rate: int,
    distance_cm: int,
    brightness_lux: int,
    use_time_seconds: int
):
    alerts = []

    if blink_rate < 8:
        alerts.append({
            "type": "blink",
            "level": "warning",
            "message": "Blink rate is low. Try to blink more often."
        })

    if distance_cm < 40:
        alerts.append({
            "type": "distance",
            "level": "attention",
            "message": "You are too close to the screen. Keep distance above 40 cm."
        })

    if brightness_lux < 200:
        alerts.append({
            "type": "brightness",
            "level": "attention",
            "message": "Ambient brightness is low. Try to improve lighting."
        })

    if use_time_seconds > 20 * 60:
        alerts.append({
            "type": "use_time",
            "level": "attention",
            "message": "You have used the screen for over 20 minutes. Take a short break."
        })

    return alerts


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "message": "VisionGuard backend is running"
    })


@app.route("/api/stats", methods=["GET"])
def get_stats():
    return jsonify({
        "blinkRate": 12,
        "distanceCm": 45,
        "brightnessLux": 300,
        "useTimeSeconds": 1200,
        "eyeHealthScore": 88
    })


@app.route("/api/analyze", methods=["POST"])
def analyze_frame():
    """
    Phase 2.1: Mock analyze API.

    Receives a base64 image frame from the React frontend.
    For now, it validates that an image/frame exists and returns mock metrics.

    Later:
    - Decode base64 image
    - Use OpenCV / MediaPipe
    - Calculate blink rate, distance, brightness, processed frame
    """
    data = request.get_json(silent=True) or {}

    # Compatible with both new frontend field "image"
    # and old project field "frame".
    image_base64 = data.get("image") or data.get("frame")

    if not image_base64:
        return jsonify({
            "success": False,
            "error": "No image provided"
        }), 400

    # Basic validation: check whether base64 image looks valid.
    # This does not perform computer vision yet.
    try:
        if "," in image_base64:
            image_payload = image_base64.split(",", 1)[1]
        else:
            image_payload = image_base64

        # Validate base64 payload can be decoded
        base64.b64decode(image_payload, validate=False)
    except Exception as error:
        return jsonify({
            "success": False,
            "error": f"Invalid base64 image: {str(error)}"
        }), 400

    use_time_seconds = int(time.time() - SESSION_START_TIME)

    # Mock values with slight variation, so the frontend can show that data updates.
    blink_rate = random.randint(10, 16)
    distance_cm = random.randint(42, 52)
    brightness_lux = random.randint(260, 360)

    eye_health_score = calculate_eye_health_score(
        blink_rate=blink_rate,
        distance_cm=distance_cm,
        brightness_lux=brightness_lux,
        use_time_seconds=use_time_seconds
    )

    alerts = build_alerts(
        blink_rate=blink_rate,
        distance_cm=distance_cm,
        brightness_lux=brightness_lux,
        use_time_seconds=use_time_seconds
    )

    return jsonify({
        "success": True,
        "blinkRate": blink_rate,
        "distanceCm": distance_cm,
        "brightnessLux": brightness_lux,
        "useTimeSeconds": use_time_seconds,
        "eyeHealthScore": eye_health_score,
        "alerts": alerts,
        "processedFrame": None
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)