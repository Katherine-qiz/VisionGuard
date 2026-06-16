import type { EyeMetrics, ScoreLevel } from "../types/metrics";
import type { Reminder } from "../types/reminder";
import type { RiskItem } from "./riskEngine";

const METRIC_SAMPLES_KEY = "visionguard_metric_samples";
const MAX_SAMPLES = 1000;

export type MetricSample = {
    id: string;
    userId: string;
    timestamp: number;
    date: string;
    blinkRate: number;
    rawBlinkRate?: number;
    smoothedBlinkRate?: number;
    blinkCount: number;
    blinkEventsInWindow?: number;
    blinkWindowSeconds?: number;
    distanceCm: number;
    brightnessLux: number;
    useTimeSeconds: number;
    sessionUseTimeSeconds: number;
    activeScreenTimeSeconds: number;
    continuousUseTimeSeconds: number;
    breakDurationSeconds: number;
    useTimeStatus?: EyeMetrics["useTimeStatus"];
    eyeHealthScore: number;
    scoreLevel: ScoreLevel;
    faceDetected: boolean;
    risks: RiskItem[];
    reminders: Reminder[];
};

export function dateKey(timestamp = Date.now()) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function metricSampleDate(sample: MetricSample) {
    return dateKey(sample.timestamp);
}

export function readMetricSamples(): MetricSample[] {
    try {
        const rawValue = localStorage.getItem(METRIC_SAMPLES_KEY);
        return rawValue ? JSON.parse(rawValue) as MetricSample[] : [];
    } catch {
        return [];
    }
}

export function saveMetricSample(
    userId: string,
    metrics: EyeMetrics,
    risks: RiskItem[],
    reminders: Reminder[],
    timestamp = Date.now(),
) {
    const sample: MetricSample = {
        id: `metric-${timestamp}`,
        userId,
        timestamp,
        date: dateKey(timestamp),
        blinkRate: metrics.blinkRate,
        rawBlinkRate: metrics.rawBlinkRate,
        smoothedBlinkRate: metrics.smoothedBlinkRate,
        blinkCount: metrics.blinkCount,
        blinkEventsInWindow: metrics.blinkEventsInWindow,
        blinkWindowSeconds: metrics.blinkWindowSeconds,
        distanceCm: metrics.distanceCm,
        brightnessLux: metrics.brightnessLux,
        useTimeSeconds: metrics.useTimeSeconds,
        sessionUseTimeSeconds: metrics.sessionUseTimeSeconds ?? metrics.useTimeSeconds,
        activeScreenTimeSeconds: metrics.activeScreenTimeSeconds ?? metrics.useTimeSeconds,
        continuousUseTimeSeconds: metrics.continuousUseTimeSeconds ?? metrics.useTimeSeconds,
        breakDurationSeconds: metrics.breakDurationSeconds ?? 0,
        useTimeStatus: metrics.useTimeStatus,
        eyeHealthScore: metrics.eyeHealthScore,
        scoreLevel: metrics.scoreLevel,
        faceDetected: metrics.faceDetected,
        risks,
        reminders,
    };

    try {
        const samples = readMetricSamples();
        localStorage.setItem(
            METRIC_SAMPLES_KEY,
            JSON.stringify([sample, ...samples].slice(0, MAX_SAMPLES)),
        );
        window.dispatchEvent(new Event("visionguard-storage-updated"));
    } catch {
        // Ignore storage failures for the local MVP.
    }

    return sample;
}

export function samplesForDate(date: string) {
    return readMetricSamples().filter((sample) => metricSampleDate(sample) === date);
}
