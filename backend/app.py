import base64
import threading
import time
from collections import deque

import cv2
import mediapipe as mp
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

mp_face_mesh = mp.solutions.face_mesh
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]
FRAME_WIDTH = 640
FRAME_HEIGHT = 480
FACE_CONNECTIONS = mp_face_mesh.FACEMESH_TESSELATION

face_mesh = None
face_mesh_error = None
monitor_lock = threading.Lock()


def get_face_mesh():
    """
    Lazily create FaceMesh so the Flask app can still start in environments
    where MediaPipe's native runtime is unavailable.
    """
    global face_mesh, face_mesh_error

    if face_mesh is not None:
        return face_mesh

    if face_mesh_error is not None:
        return None

    try:
        face_mesh = mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        return face_mesh
    except RuntimeError as error:
        face_mesh_error = str(error)
        return None


def calculate_eye_health_score(
    blink_rate: int,
    distance_cm: int,
    brightness_lux: int,
    use_time_seconds: int,
    face_detected: bool,
) -> int:
    penalty = 0

    if distance_cm <= 0 or not face_detected:
        penalty += 10
    elif distance_cm >= 50:
        penalty += 0
    elif distance_cm >= 40:
        penalty += 10
    elif distance_cm >= 30:
        penalty += 18
    else:
        penalty += 25

    if use_time_seconds <= 20 * 60:
        penalty += 0
    elif use_time_seconds <= 40 * 60:
        penalty += 10
    elif use_time_seconds <= 60 * 60:
        penalty += 18
    else:
        penalty += 25

    if blink_rate >= 12:
        penalty += 0
    elif blink_rate >= 8:
        penalty += 10
    elif blink_rate >= 4:
        penalty += 18
    else:
        penalty += 25

    if 200 <= brightness_lux <= 750:
        penalty += 0
    elif 100 <= brightness_lux < 200:
        penalty += 8
    elif brightness_lux < 100:
        penalty += 15
    elif brightness_lux <= 1000:
        penalty += 5
    else:
        penalty += 10

    if not face_detected:
        penalty += 10

    return max(0, min(100, round(100 - penalty)))


def get_score_level(score: int) -> str:
    if score >= 85:
        return "Healthy"
    if score >= 70:
        return "Good"
    if score >= 50:
        return "Attention"
    return "Risk"


def build_alerts(
    blink_rate: int,
    distance_cm: int,
    brightness_lux: int,
    use_time_seconds: int,
    face_detected: bool = True,
    use_time_status: str = "normal",
):
    alerts = []

    if blink_rate < 8:
        alerts.append({
            "type": "blink",
            "level": "warning",
            "message": "Blink rate is low. Try to blink more often.",
        })

    if distance_cm and distance_cm < 40:
        alerts.append({
            "type": "distance",
            "level": "attention",
            "message": "You are too close to the screen. Keep distance above 40 cm.",
        })

    if brightness_lux < 200:
        alerts.append({
            "type": "brightness",
            "level": "attention",
            "message": "Ambient brightness is low. Try to improve lighting.",
        })

    if use_time_status in ("break_due", "overdue", "long_session"):
        alerts.append({
            "type": "use_time",
            "level": "attention",
            "message": "A 20-second eye break is due. Look away from the screen briefly.",
        })

    if not face_detected:
        alerts.append({
            "type": "face",
            "level": "neutral",
            "message": "Face not detected. Adjust your camera angle.",
        })

    return alerts


def get_base64_payload(image_base64: str) -> str:
    if "," in image_base64:
        return image_base64.split(",", 1)[1].strip()

    return image_base64.strip()


class EyeFatigueMonitor:
    def __init__(self):
        self.blink_count = 0
        self.blink_frequency = 0
        self.raw_blink_frequency = 0
        self.smoothed_blink_rate = 0.0
        self.eye_state_history = deque(maxlen=30)
        self.ear_baseline = 0.25
        self.ear_samples = deque(maxlen=100)
        self.is_blinking = False
        self.blink_start_time = None
        self.blink_timestamps = deque(maxlen=300)
        self.last_blink_threshold = 0
        self.monitoring_start_time = None
        self.last_blink_events_in_window = 0
        self.last_blink_window_seconds = 0
        self.session_start_time = None
        self.last_frame_time = None
        self.active_screen_time_seconds = 0.0
        self.continuous_use_time_seconds = 0.0
        self.break_duration_seconds = 0.0
        self.completed_break = False
        self.no_face_since = None
        self.use_time_status = "normal"
        self.frame_count = 0
        self.fps = 0
        self.last_fps_time = time.time()
        self.last_metrics = {
            "blinkRate": 0,
            "rawBlinkRate": 0,
            "smoothedBlinkRate": 0,
            "blinkCount": 0,
            "distanceCm": 0,
            "brightnessLux": 0,
            "useTimeSeconds": 0,
            "sessionUseTimeSeconds": 0,
            "activeScreenTimeSeconds": 0,
            "continuousUseTimeSeconds": 0,
            "breakDurationSeconds": 0,
            "debugBackendScore": 0,
            "eyeHealthScore": 0,
            "scoreLevel": "Good",
            "useTimeStatus": "normal",
            "fps": 0,
            "ear": 0,
            "earBaseline": 0.25,
            "blinkThreshold": 0,
            "isBlinking": False,
            "blinkEventsInWindow": 0,
            "blinkWindowSeconds": 0,
            "faceDetected": False,
            "alerts": [],
        }

    def calculate_ear(self, landmarks, indices):
        points = np.array([[landmarks[i].x, landmarks[i].y] for i in indices])
        v1 = np.linalg.norm(points[1] - points[5])
        v2 = np.linalg.norm(points[2] - points[4])
        h = np.linalg.norm(points[0] - points[3])

        if h < 0.001:
            return 0.25

        return (v1 + v2) / (2.0 * h)

    def calculate_ear_improved(self, landmarks):
        left_ear = self.calculate_ear(landmarks, LEFT_EYE_INDICES)
        right_ear = self.calculate_ear(landmarks, RIGHT_EYE_INDICES)

        left_upper = [159, 160, 161]
        left_lower = [145, 144, 153]
        right_upper = [386, 385, 384]
        right_lower = [374, 373, 380]

        left_upper_y = np.mean([landmarks[i].y for i in left_upper])
        left_lower_y = np.mean([landmarks[i].y for i in left_lower])
        right_upper_y = np.mean([landmarks[i].y for i in right_upper])
        right_lower_y = np.mean([landmarks[i].y for i in right_lower])

        avg_ear = (left_ear + right_ear) / 2.0
        avg_openness = (
            (left_lower_y - left_upper_y) + (right_lower_y - right_upper_y)
        ) / 2.0

        return avg_ear, avg_openness

    def detect_blink(self, ear, openness):
        self.eye_state_history.append((ear, openness))

        self.ear_samples.append(ear)
        if len(self.ear_samples) >= 50:
            sorted_samples = sorted(self.ear_samples)
            self.ear_baseline = sorted_samples[int(len(sorted_samples) * 0.7)]

        close_threshold = self.ear_baseline * 0.82
        open_threshold = self.ear_baseline * 0.92
        self.last_blink_threshold = close_threshold

        if len(self.eye_state_history) < 3:
            return False

        current_ear = self.eye_state_history[-1][0]

        if current_ear < close_threshold and not self.is_blinking:
            self.is_blinking = True
            self.blink_start_time = time.time()
            return False

        if current_ear > open_threshold and self.is_blinking:
            self.is_blinking = False
            if self.blink_start_time:
                blink_duration = time.time() - self.blink_start_time
                self.blink_start_time = None
                return 0.04 <= blink_duration <= 0.8
            return False

        if self.is_blinking and self.blink_start_time:
            if time.time() - self.blink_start_time > 1.0:
                self.is_blinking = False
                self.blink_start_time = None

        return False

    def update_blink_frequency(self):
        current_time = time.time()
        recent_five_minutes = [t for t in self.blink_timestamps if t > current_time - 300]
        self.blink_timestamps = deque(recent_five_minutes, maxlen=300)

        if self.monitoring_start_time is None:
            self.blink_frequency = 0
            self.raw_blink_frequency = 0
            self.last_blink_events_in_window = 0
            self.last_blink_window_seconds = 0
            return self.blink_frequency

        elapsed = max(1.0, current_time - self.monitoring_start_time)
        window_seconds = min(60, elapsed)
        window_start = current_time - window_seconds
        blinks_in_window = [t for t in self.blink_timestamps if t >= window_start]

        self.last_blink_events_in_window = len(blinks_in_window)
        self.last_blink_window_seconds = round(window_seconds, 1)
        self.raw_blink_frequency = round(len(blinks_in_window) / window_seconds * 60)
        self.blink_frequency = self.raw_blink_frequency
        return self.blink_frequency

    def update_smoothed_blink_rate(self, raw_blink_rate, face_detected):
        current_time = time.time()
        no_face_duration = (
            current_time - self.no_face_since
            if self.no_face_since is not None
            else 0
        )

        if not face_detected:
            if no_face_duration < 30:
                return int(round(self.smoothed_blink_rate))
            if no_face_duration >= 120:
                return int(round(self.smoothed_blink_rate))
            self.smoothed_blink_rate *= 0.98
            return int(round(self.smoothed_blink_rate))

        if self.monitoring_start_time is not None:
            elapsed = current_time - self.monitoring_start_time
            if elapsed < 30 and self.smoothed_blink_rate <= 0 and raw_blink_rate == 0:
                return 0

        if raw_blink_rate > 0:
            if self.smoothed_blink_rate <= 0:
                self.smoothed_blink_rate = float(raw_blink_rate)
            else:
                self.smoothed_blink_rate = (self.smoothed_blink_rate * 0.85) + (raw_blink_rate * 0.15)
        else:
            self.smoothed_blink_rate *= 0.98

        return int(round(self.smoothed_blink_rate))

    def get_use_time_status(self, use_time_seconds):
        if use_time_seconds < 20 * 60:
            return "normal"
        if use_time_seconds < 25 * 60:
            return "break_due"
        if use_time_seconds < 40 * 60:
            return "overdue"
        return "long_session"

    def estimate_distance(self, landmarks):
        face_top = landmarks[10]
        face_bottom = landmarks[152]
        face_left = landmarks[234]
        face_right = landmarks[454]

        face_height_px = abs(face_bottom.y - face_top.y) * FRAME_HEIGHT
        face_width_px = abs(face_right.x - face_left.x) * FRAME_WIDTH

        avg_face_width_cm = 14.0
        avg_face_height_cm = 18.0
        focal_length_w = 500
        focal_length_h = 500

        distance_w = (
            (avg_face_width_cm * focal_length_w) / face_width_px
            if face_width_px > 10
            else 100
        )
        distance_h = (
            (avg_face_height_cm * focal_length_h) / face_height_px
            if face_height_px > 10
            else 100
        )

        return max(20, min(200, (distance_w + distance_h) / 2))

    def calculate_brightness(self, frame_rgb):
        gray = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2GRAY)
        return float(np.mean(gray) * 2.5)

    def update_fps(self):
        self.frame_count += 1
        current_time = time.time()
        elapsed = current_time - self.last_fps_time

        if elapsed > 1.0:
            self.fps = self.frame_count / elapsed
            self.frame_count = 0
            self.last_fps_time = current_time

    def check_alerts(self, distance, brightness, ear):
        blink_rate = int(round(self.blink_frequency))
        return build_alerts(
            blink_rate=blink_rate,
            distance_cm=int(round(distance)),
            brightness_lux=int(round(brightness)),
            use_time_seconds=int(round(self.continuous_use_time_seconds)),
            face_detected=True,
            use_time_status=self.use_time_status,
        )

    def draw_face_box(self, frame, landmarks):
        h, w = frame.shape[:2]
        x_coords = [lm.x for lm in landmarks]
        y_coords = [lm.y for lm in landmarks]

        x_min = max(0, int(min(x_coords) * w) - 20)
        x_max = min(w, int(max(x_coords) * w) + 20)
        y_min = max(0, int(min(y_coords) * h) - 30)
        y_max = min(h, int(max(y_coords) * h) + 20)

        cv2.rectangle(frame, (x_min, y_min), (x_max, y_max), (0, 255, 0), 2)

        corner_len = 20
        corners = [
            ((x_min, y_min), (x_min + corner_len, y_min), (x_min, y_min + corner_len)),
            ((x_max, y_min), (x_max - corner_len, y_min), (x_max, y_min + corner_len)),
            ((x_min, y_max), (x_min + corner_len, y_max), (x_min, y_max - corner_len)),
            ((x_max, y_max), (x_max - corner_len, y_max), (x_max, y_max - corner_len)),
        ]

        for origin, horizontal, vertical in corners:
            cv2.line(frame, origin, horizontal, (0, 255, 0), 3)
            cv2.line(frame, origin, vertical, (0, 255, 0), 3)

        return frame

    def draw_eye_contours(self, frame, landmarks):
        h, w = frame.shape[:2]
        left_eye_indices = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
        right_eye_indices = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]

        left_eye_points = np.array(
            [[int(landmarks[idx].x * w), int(landmarks[idx].y * h)] for idx in left_eye_indices],
            dtype=np.int32,
        )
        right_eye_points = np.array(
            [[int(landmarks[idx].x * w), int(landmarks[idx].y * h)] for idx in right_eye_indices],
            dtype=np.int32,
        )

        cv2.polylines(frame, [left_eye_points], True, (255, 0, 255), 2)
        cv2.polylines(frame, [right_eye_points], True, (255, 0, 255), 2)

        for idx in [468, 469, 470, 471, 472, 473, 474, 475, 476, 477]:
            if idx < len(landmarks):
                x = int(landmarks[idx].x * w)
                y = int(landmarks[idx].y * h)
                cv2.circle(frame, (x, y), 2, (0, 255, 255), -1)

        return frame

    def draw_info_overlay(self, frame, ear, distance, brightness, blink_count, blink_rate):
        overlay = frame.copy()
        cv2.rectangle(overlay, (16, 16), (330, 190), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.62, frame, 0.38, 0, frame)

        font = cv2.FONT_HERSHEY_SIMPLEX
        rows = [
            f"EAR: {ear:.3f}",
            f"Baseline: {self.ear_baseline:.3f}",
            f"Distance: {distance:.1f}cm",
            f"Brightness: {brightness:.0f}lux",
            f"Blinks: {blink_count}",
            f"Blink/min: {blink_rate} ({self.raw_blink_frequency} raw)",
            f"FPS: {self.fps:.1f}",
        ]

        for index, row in enumerate(rows):
            cv2.putText(
                frame,
                row,
                (28, 42 + index * 21),
                font,
                0.48,
                (255, 255, 255),
                1,
                cv2.LINE_AA,
            )

        return frame

    def update_use_time(self, face_detected):
        current_time = time.time()
        if self.session_start_time is None:
            self.session_start_time = current_time

        if self.last_frame_time is None:
            self.last_frame_time = current_time
            self.use_time_status = self.get_use_time_status(int(round(self.continuous_use_time_seconds)))
            return

        delta = max(0.0, min(current_time - self.last_frame_time, 2.0))
        self.last_frame_time = current_time

        if face_detected:
            if self.no_face_since is not None:
                self.break_duration_seconds = current_time - self.no_face_since
                if self.break_duration_seconds >= 120:
                    self.continuous_use_time_seconds = 0
                    self.completed_break = True
            self.no_face_since = None
            self.break_duration_seconds = 0
            self.active_screen_time_seconds += delta
            self.continuous_use_time_seconds += delta
        else:
            if self.no_face_since is None:
                self.no_face_since = current_time
            self.break_duration_seconds = current_time - self.no_face_since
            if self.break_duration_seconds >= 120:
                self.continuous_use_time_seconds = 0
                self.completed_break = True

        self.use_time_status = self.get_use_time_status(int(round(self.continuous_use_time_seconds)))

    def get_session_use_time_seconds(self):
        if self.session_start_time is None:
            return 0
        return max(0, int(round(time.time() - self.session_start_time)))

    def reset_session(self):
        self.__init__()

    def encode_processed_frame(self, frame):
        success, buffer = cv2.imencode(
            ".jpg",
            frame,
            [cv2.IMWRITE_JPEG_QUALITY, 85],
        )

        if not success:
            raise ValueError("Failed to encode processed frame")

        frame_base64 = base64.b64encode(buffer).decode("utf-8")
        return f"data:image/jpeg;base64,{frame_base64}"

    def process_frame(self, frame_data):
        payload = get_base64_payload(frame_data)
        image_bytes = base64.b64decode(payload, validate=True)
        frame = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)

        if frame is None:
            raise ValueError("Unable to decode image")

        frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        annotated_frame = frame.copy()

        face_detected = False
        ear = 0.0
        distance = 0.0
        brightness = self.calculate_brightness(frame_rgb)
        alerts = []

        face_mesh_instance = get_face_mesh()
        results = face_mesh_instance.process(frame_rgb) if face_mesh_instance else None

        if results and results.multi_face_landmarks:
            face_detected = True
            if self.monitoring_start_time is None:
                self.monitoring_start_time = time.time()
            face_landmarks = results.multi_face_landmarks[0]
            landmarks = face_landmarks.landmark

            ear, openness = self.calculate_ear_improved(landmarks)
            if self.detect_blink(ear, openness):
                self.blink_count += 1
                self.blink_timestamps.append(time.time())

            distance = self.estimate_distance(landmarks)

            mp_drawing.draw_landmarks(
                image=annotated_frame,
                landmark_list=face_landmarks,
                connections=FACE_CONNECTIONS,
                landmark_drawing_spec=None,
                connection_drawing_spec=mp_drawing_styles.get_default_face_mesh_tesselation_style(),
            )

            for idx in LEFT_EYE_INDICES + RIGHT_EYE_INDICES:
                x = int(landmarks[idx].x * FRAME_WIDTH)
                y = int(landmarks[idx].y * FRAME_HEIGHT)
                cv2.circle(annotated_frame, (x, y), 2, (0, 255, 0), -1)

            annotated_frame = self.draw_face_box(annotated_frame, landmarks)
            annotated_frame = self.draw_eye_contours(annotated_frame, landmarks)

        self.update_use_time(face_detected)
        self.update_fps()

        raw_blink_rate = int(round(self.update_blink_frequency()))
        blink_rate = self.update_smoothed_blink_rate(raw_blink_rate, face_detected)
        distance_cm = round(distance, 1) if face_detected else 0
        brightness_lux = int(round(brightness))
        session_use_time_seconds = self.get_session_use_time_seconds()
        active_screen_time_seconds = int(round(self.active_screen_time_seconds))
        continuous_use_time_seconds = int(round(self.continuous_use_time_seconds))
        break_duration_seconds = int(round(self.break_duration_seconds))
        use_time_seconds = continuous_use_time_seconds
        debug_backend_score = calculate_eye_health_score(
            blink_rate=blink_rate,
            distance_cm=int(round(distance_cm)),
            brightness_lux=brightness_lux,
            use_time_seconds=use_time_seconds,
            face_detected=face_detected,
        )

        if not alerts:
            alerts = build_alerts(
                blink_rate=blink_rate,
                distance_cm=int(round(distance_cm)),
                brightness_lux=brightness_lux,
                use_time_seconds=use_time_seconds,
                face_detected=face_detected,
                use_time_status=self.use_time_status,
            )

        annotated_frame = self.draw_info_overlay(
            annotated_frame,
            ear,
            distance,
            brightness,
            self.blink_count,
            blink_rate,
        )
        processed_frame = self.encode_processed_frame(annotated_frame)

        result = {
            "success": True,
            "blinkRate": blink_rate,
            "rawBlinkRate": raw_blink_rate,
            "smoothedBlinkRate": round(self.smoothed_blink_rate, 1),
            "blinkCount": self.blink_count,
            "distanceCm": distance_cm,
            "brightnessLux": brightness_lux,
            "useTimeSeconds": use_time_seconds,
            "sessionUseTimeSeconds": session_use_time_seconds,
            "activeScreenTimeSeconds": active_screen_time_seconds,
            "continuousUseTimeSeconds": continuous_use_time_seconds,
            "breakDurationSeconds": break_duration_seconds,
            "debugBackendScore": debug_backend_score,
            "eyeHealthScore": debug_backend_score,
            "scoreLevel": get_score_level(debug_backend_score),
            "useTimeStatus": self.use_time_status,
            "scoreIssue": "backend_debug",
            "fps": round(self.fps, 1),
            "ear": round(ear, 3),
            "earBaseline": round(self.ear_baseline, 3),
            "blinkThreshold": round(self.last_blink_threshold, 3),
            "isBlinking": self.is_blinking,
            "blinkEventsInWindow": self.last_blink_events_in_window,
            "blinkWindowSeconds": self.last_blink_window_seconds,
            "faceDetected": face_detected,
            "alerts": alerts,
            "processedFrame": processed_frame,
        }

        self.last_metrics = {
            "blinkRate": result["blinkRate"],
            "rawBlinkRate": result["rawBlinkRate"],
            "smoothedBlinkRate": result["smoothedBlinkRate"],
            "blinkCount": result["blinkCount"],
            "distanceCm": result["distanceCm"],
            "brightnessLux": result["brightnessLux"],
            "useTimeSeconds": result["useTimeSeconds"],
            "sessionUseTimeSeconds": result["sessionUseTimeSeconds"],
            "activeScreenTimeSeconds": result["activeScreenTimeSeconds"],
            "continuousUseTimeSeconds": result["continuousUseTimeSeconds"],
            "breakDurationSeconds": result["breakDurationSeconds"],
            "debugBackendScore": result["debugBackendScore"],
            "eyeHealthScore": result["eyeHealthScore"],
            "scoreLevel": result["scoreLevel"],
            "useTimeStatus": result["useTimeStatus"],
            "scoreIssue": result["scoreIssue"],
            "fps": result["fps"],
            "ear": result["ear"],
            "earBaseline": result["earBaseline"],
            "blinkThreshold": result["blinkThreshold"],
            "isBlinking": result["isBlinking"],
            "blinkEventsInWindow": result["blinkEventsInWindow"],
            "blinkWindowSeconds": result["blinkWindowSeconds"],
            "faceDetected": result["faceDetected"],
            "alerts": result["alerts"],
        }

        return result


monitor = EyeFatigueMonitor()


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "message": "VisionGuard backend is running",
        "mediapipeReady": face_mesh_error is None,
    })


@app.route("/api/stats", methods=["GET"])
def get_stats():
    return jsonify(monitor.last_metrics)


@app.route("/api/reset", methods=["POST"])
def reset_monitor():
    with monitor_lock:
        monitor.reset_session()
    return jsonify({"success": True})


@app.route("/api/analyze", methods=["POST"])
def analyze_frame():
    data = request.get_json(silent=True) or {}
    image_base64 = data.get("image") or data.get("frame")

    if not isinstance(image_base64, str) or not image_base64.strip():
        return jsonify({
            "success": False,
            "error": "No image provided",
        }), 400

    try:
        with monitor_lock:
            result = monitor.process_frame(image_base64)
        return jsonify(result)
    except Exception as error:
        return jsonify({
            "success": False,
            "error": f"Failed to analyze frame: {str(error)}",
        }), 400


if __name__ == "__main__":
    app.run(debug=True, port=5000)
