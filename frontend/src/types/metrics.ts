// src/types/metrics.ts
export type ScoreLevel = "Healthy" | "Good" | "Attention" | "Risk";

export type EyeAlert = {
    type: string;
    level: string;
    message: string;
};

export interface EyeMetrics {
    blinkRate: number;
    rawBlinkRate?: number;
    smoothedBlinkRate?: number;
    blinkCount: number;
    distanceCm: number;
    brightnessLux: number;
    useTimeSeconds: number;
    sessionUseTimeSeconds?: number;
    activeScreenTimeSeconds?: number;
    continuousUseTimeSeconds?: number;
    breakDurationSeconds?: number;
    eyeHealthScore: number;
    scoreLevel: ScoreLevel;
    useTimeStatus?: "normal" | "break_due" | "overdue" | "long_session";
    scoreIssue?: string;
    debugBackendScore?: number;
    fps: number;
    ear: number;
    earBaseline: number;
    blinkThreshold: number;
    isBlinking: boolean;
    blinkEventsInWindow?: number;
    blinkWindowSeconds?: number;
    faceDetected: boolean;
    alerts: EyeAlert[];
}
