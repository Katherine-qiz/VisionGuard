from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


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


if __name__ == "__main__":
    app.run(debug=True, port=5000)