import type { EyeMetrics, ScoreLevel } from "../types/metrics";

function numberValue(value: unknown, fallback = 0) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanValue(value: unknown, fallback = false) {
    return typeof value === "boolean" ? value : fallback;
}

function scoreLevelValue(value: unknown): ScoreLevel {
    return value === "Attention" || value === "Warning" || value === "High Risk" || value === "Good"
        ? value
        : "Good";
}

export function normalizeMetrics(metrics: Partial<EyeMetrics> | Record<string, unknown> | null | undefined): EyeMetrics {
    const source = (metrics ?? {}) as Partial<EyeMetrics> & Record<string, unknown>;
    const sessionUseTimeSeconds = numberValue(
        source.sessionUseTimeSeconds,
        numberValue(source.useTimeSeconds, numberValue(source.use_time)),
    );
    const useTimeSeconds = numberValue(
        source.useTimeSeconds,
        numberValue(source.sessionUseTimeSeconds, numberValue(source.use_time)),
    );

    return {
        blinkRate: numberValue(source.blinkRate, numberValue(source.blink_frequency)),
        rawBlinkRate: numberValue(source.rawBlinkRate),
        smoothedBlinkRate: numberValue(source.smoothedBlinkRate),
        blinkCount: numberValue(source.blinkCount),
        blinkEventsInWindow: numberValue(source.blinkEventsInWindow),
        blinkWindowSeconds: numberValue(source.blinkWindowSeconds),
        distanceCm: numberValue(source.distanceCm, numberValue(source.distance)),
        brightnessLux: numberValue(source.brightnessLux, numberValue(source.brightness)),
        useTimeSeconds,
        sessionUseTimeSeconds,
        totalUseTimeSeconds: numberValue(source.totalUseTimeSeconds),
        avgSessionUseTimeSeconds: numberValue(source.avgSessionUseTimeSeconds, sessionUseTimeSeconds),
        activeScreenTimeSeconds: numberValue(source.activeScreenTimeSeconds, useTimeSeconds),
        continuousUseTimeSeconds: numberValue(source.continuousUseTimeSeconds, sessionUseTimeSeconds),
        breakDurationSeconds: numberValue(source.breakDurationSeconds),
        isCalibrating: booleanValue(source.isCalibrating),
        eyeHealthScore: numberValue(source.eyeHealthScore),
        scoreLevel: scoreLevelValue(source.scoreLevel),
        useTimeStatus: source.useTimeStatus === "break_due" || source.useTimeStatus === "overdue" || source.useTimeStatus === "long_session"
            ? source.useTimeStatus
            : "normal",
        scoreIssue: typeof source.scoreIssue === "string" ? source.scoreIssue : undefined,
        debugBackendScore: numberValue(source.debugBackendScore, numberValue(source.eyeHealthScore)),
        fps: numberValue(source.fps),
        ear: numberValue(source.ear),
        earBaseline: numberValue(source.earBaseline, 0.25),
        blinkThreshold: numberValue(source.blinkThreshold),
        isBlinking: booleanValue(source.isBlinking),
        faceDetected: booleanValue(source.faceDetected, booleanValue(source.face_detected)),
        alerts: Array.isArray(source.alerts) ? source.alerts as EyeMetrics["alerts"] : [],
    };
}
