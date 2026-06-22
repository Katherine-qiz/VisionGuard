import { localDateKey } from "./dateUtils";
import type { EyeMetrics, ScoreLevel } from "../types/metrics";
import type { Reminder, ReminderEvent } from "../types/reminder";
import type { RiskItem } from "./riskEngine";

export const STORAGE_KEYS = {
    metricSamples: "visionguard_metric_samples",
    dailySummaries: "visionguard_daily_summaries",
    dailyStats: "visionguard_daily_stats",
    reminderEvents: "visionguard_reminder_events",
    reminders: "visionguard_reminders",
    latestMetrics: "visionguard_latest_metrics",
    latestReport: "visionguard_latest_report",
    reportHistory: "visionguard_report_history",
    settings: "visionguard_settings",
    userId: "visionguard_user_id",
    username: "visionguard_username",
    email: "visionguard_email",
};

export type VisionGuardSettings = {
    appearance: "system" | "light" | "dark";
    language: "en" | "zh";
    reminderMode: "gentle" | "strict";
    startManually: boolean;
    notificationsEnabled: boolean;
    breakReminders: boolean;
    blinkReminders: boolean;
    distanceReminders: boolean;
    brightnessReminders: boolean;
    passwordUpdatedAt?: number;
};

export type UserProfile = {
    userId: string;
    username: string;
    email: string;
};

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
    totalUseTimeSeconds: number;
    avgSessionUseTimeSeconds: number;
    activeScreenTimeSeconds: number;
    continuousUseTimeSeconds: number;
    breakDurationSeconds: number;
    isCalibrating?: boolean;
    useTimeStatus?: EyeMetrics["useTimeStatus"];
    eyeHealthScore: number;
    scoreLevel: ScoreLevel;
    faceDetected: boolean;
    risks: RiskItem[];
    reminders: Reminder[];
};

export type DailySummary = {
    date: string;
    sampleCount: number;
    averageBlinkRate: number;
    averageDistanceCm: number;
    averageBrightnessLux: number;
    averageEyeHealthScore: number;
    totalUseTimeSeconds: number;
    latestSampleAt: number | null;
    reminderCount: number;
};

export type StoredReport<T = unknown> = {
    report: T;
    generatedAt: string;
};

const defaultSettings: VisionGuardSettings = {
    appearance: "system",
    language: "en",
    reminderMode: "gentle",
    startManually: true,
    notificationsEnabled: false,
    breakReminders: true,
    blinkReminders: true,
    distanceReminders: true,
    brightnessReminders: true,
};

function readJsonValue<T>(key: string, fallback: T): T {
    try {
        const rawValue = localStorage.getItem(key);
        return rawValue ? JSON.parse(rawValue) as T : fallback;
    } catch {
        return fallback;
    }
}

function writeJsonValue(key: string, value: unknown) {
    localStorage.setItem(key, JSON.stringify(value));
}

function emitLocalDataUpdate() {
    window.dispatchEvent(new Event("visionguard-storage-updated"));
}

function average(values: number[]) {
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function subscribeLocalData(listener: () => void) {
    window.addEventListener("visionguard-storage-updated", listener);
    window.addEventListener("storage", listener);
    return () => {
        window.removeEventListener("visionguard-storage-updated", listener);
        window.removeEventListener("storage", listener);
    };
}

export function readUserProfile(): UserProfile {
    const username = localStorage.getItem(STORAGE_KEYS.username) || "demo_user";
    return {
        userId: localStorage.getItem(STORAGE_KEYS.userId) || username || "demo-user",
        username,
        email: localStorage.getItem(STORAGE_KEYS.email) || "",
    };
}

export function saveUserProfile(profile: Partial<UserProfile>) {
    const currentProfile = readUserProfile();
    const nextProfile = {
        ...currentProfile,
        ...profile,
    };

    localStorage.setItem(STORAGE_KEYS.userId, nextProfile.userId || nextProfile.username || "demo-user");
    localStorage.setItem(STORAGE_KEYS.username, nextProfile.username || "demo_user");
    if (nextProfile.email) {
        localStorage.setItem(STORAGE_KEYS.email, nextProfile.email);
    } else {
        localStorage.removeItem(STORAGE_KEYS.email);
    }
    emitLocalDataUpdate();
    return readUserProfile();
}

export function readSettings(): VisionGuardSettings {
    return {
        ...defaultSettings,
        ...readJsonValue<Partial<VisionGuardSettings>>(STORAGE_KEYS.settings, {}),
    };
}

export function saveSettings(partialSettings: Partial<VisionGuardSettings>) {
    const nextSettings = {
        ...readSettings(),
        ...partialSettings,
    };

    writeJsonValue(STORAGE_KEYS.settings, nextSettings);
    emitLocalDataUpdate();
    return nextSettings;
}

export function readMetricSamples(): MetricSample[] {
    return readJsonValue<MetricSample[]>(STORAGE_KEYS.metricSamples, []);
}

export function saveLatestMetrics(metrics: EyeMetrics) {
    writeJsonValue(STORAGE_KEYS.latestMetrics, metrics);
    emitLocalDataUpdate();
}

export function readLatestMetrics(): Partial<EyeMetrics> | null {
    return readJsonValue<Partial<EyeMetrics> | null>(STORAGE_KEYS.latestMetrics, null);
}

function writeMetricSamples(samples: MetricSample[]) {
    writeJsonValue(STORAGE_KEYS.metricSamples, samples.slice(0, 1000));
}

function writeDailySummaries(summaries: DailySummary[]) {
    writeJsonValue(STORAGE_KEYS.dailySummaries, summaries);
    writeJsonValue(STORAGE_KEYS.dailyStats, summaries);
}

export function readDailySummaries(): DailySummary[] {
    const summaries = readJsonValue<DailySummary[]>(STORAGE_KEYS.dailySummaries, []);
    if (summaries.length > 0) return summaries;
    return readJsonValue<DailySummary[]>(STORAGE_KEYS.dailyStats, []);
}

export function readDailySummary(date: string) {
    return readDailySummaries().find((summary) => summary.date === date) ?? null;
}

function rebuildDailySummary(date: string) {
    const daySamples = readMetricSamples().filter((sample) => sample.date === date && !sample.isCalibrating);
    const dayReminders = readReminderEvents().filter((event) => event.date === date);
    const summaries = readDailySummaries().filter((summary) => summary.date !== date);
    const nextSummary: DailySummary = {
        date,
        sampleCount: daySamples.length,
        averageBlinkRate: average(daySamples.map((sample) => sample.blinkRate)),
        averageDistanceCm: average(daySamples.map((sample) => sample.distanceCm)),
        averageBrightnessLux: average(daySamples.map((sample) => sample.brightnessLux)),
        averageEyeHealthScore: average(daySamples.map((sample) => sample.eyeHealthScore)),
        totalUseTimeSeconds: daySamples.length > 0
            ? Math.max(...daySamples.map((sample) => sample.totalUseTimeSeconds ?? sample.activeScreenTimeSeconds ?? 0))
            : 0,
        latestSampleAt: daySamples.length > 0 ? Math.max(...daySamples.map((sample) => sample.timestamp)) : null,
        reminderCount: dayReminders.length,
    };

    writeDailySummaries([...summaries, nextSummary].sort((a, b) => a.date.localeCompare(b.date)));
    return nextSummary;
}

export function createMetricSample(
    userId: string,
    metrics: EyeMetrics,
    risks: RiskItem[],
    reminders: Reminder[],
    timestamp = Date.now(),
): MetricSample {
    return {
        id: `metric-${timestamp}`,
        userId,
        timestamp,
        date: localDateKey(timestamp),
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
        totalUseTimeSeconds: metrics.totalUseTimeSeconds ?? metrics.activeScreenTimeSeconds ?? 0,
        avgSessionUseTimeSeconds: metrics.avgSessionUseTimeSeconds ?? metrics.sessionUseTimeSeconds ?? metrics.useTimeSeconds,
        activeScreenTimeSeconds: metrics.activeScreenTimeSeconds ?? metrics.useTimeSeconds,
        continuousUseTimeSeconds: metrics.continuousUseTimeSeconds ?? metrics.useTimeSeconds,
        breakDurationSeconds: metrics.breakDurationSeconds ?? 0,
        isCalibrating: metrics.isCalibrating,
        useTimeStatus: metrics.useTimeStatus,
        eyeHealthScore: metrics.eyeHealthScore,
        scoreLevel: metrics.scoreLevel,
        faceDetected: metrics.faceDetected,
        risks,
        reminders,
    };
}

export function appendMetricSample(sample: MetricSample) {
    const samples = readMetricSamples();
    writeMetricSamples([sample, ...samples]);
    saveLatestMetrics({
        blinkRate: sample.blinkRate,
        rawBlinkRate: sample.rawBlinkRate,
        smoothedBlinkRate: sample.smoothedBlinkRate,
        blinkCount: sample.blinkCount,
        blinkEventsInWindow: sample.blinkEventsInWindow,
        blinkWindowSeconds: sample.blinkWindowSeconds,
        distanceCm: sample.distanceCm,
        brightnessLux: sample.brightnessLux,
        useTimeSeconds: sample.useTimeSeconds,
        sessionUseTimeSeconds: sample.sessionUseTimeSeconds,
        totalUseTimeSeconds: sample.totalUseTimeSeconds,
        avgSessionUseTimeSeconds: sample.avgSessionUseTimeSeconds,
        activeScreenTimeSeconds: sample.activeScreenTimeSeconds,
        continuousUseTimeSeconds: sample.continuousUseTimeSeconds,
        breakDurationSeconds: sample.breakDurationSeconds,
        isCalibrating: sample.isCalibrating,
        eyeHealthScore: sample.eyeHealthScore,
        scoreLevel: sample.scoreLevel,
        useTimeStatus: sample.useTimeStatus,
        fps: 0,
        ear: 0,
        earBaseline: 0,
        blinkThreshold: 0,
        isBlinking: false,
        faceDetected: sample.faceDetected,
        alerts: [],
    });
    rebuildDailySummary(sample.date);
    emitLocalDataUpdate();
    return sample;
}

export function samplesForDate(date: string) {
    return readMetricSamples().filter((sample) => sample.date === date);
}

export function readReminderEvents(): ReminderEvent[] {
    return readJsonValue<ReminderEvent[]>(STORAGE_KEYS.reminderEvents, []);
}

function writeReminderEvents(events: ReminderEvent[]) {
    const nextEvents = events.slice(0, 50);
    try {
        writeJsonValue(STORAGE_KEYS.reminderEvents, nextEvents);
        writeJsonValue(STORAGE_KEYS.reminders, nextEvents);
        return nextEvents;
    } catch (error) {
        const compactEvents = nextEvents.slice(0, 20);
        try {
            writeJsonValue(STORAGE_KEYS.reminderEvents, compactEvents);
            writeJsonValue(STORAGE_KEYS.reminders, compactEvents);
            console.warn("Reminder history was trimmed because localStorage is full.", error);
            return compactEvents;
        } catch (retryError) {
            try {
                writeJsonValue(STORAGE_KEYS.reminderEvents, []);
                writeJsonValue(STORAGE_KEYS.reminders, []);
            } catch {
                // Ignore final cleanup failure.
            }
            console.warn("Reminder history could not be saved and was cleared.", retryError);
            return [];
        }
    }
}

export function appendReminderEvent(event: ReminderEvent) {
    try {
        const events = readReminderEvents();
        writeReminderEvents([event, ...events]);
        try {
            rebuildDailySummary(event.date);
        } catch (summaryError) {
            console.warn("Reminder event was saved, but daily summary rebuild failed.", summaryError);
        }
        emitLocalDataUpdate();
    } catch (error) {
        console.warn("Reminder event could not be saved.", error);
    }
    return event;
}

export function readReportHistory<T = unknown>() {
    return readJsonValue<Array<StoredReport<T>>>(STORAGE_KEYS.reportHistory, []);
}

export function readLatestReport<T = unknown>() {
    return readJsonValue<StoredReport<T> | null>(STORAGE_KEYS.latestReport, null);
}

export function saveLatestReport<T>(report: T, generatedAt = new Date().toISOString()) {
    const storedReport = { report, generatedAt };
    const history = readReportHistory<T>();
    writeJsonValue(STORAGE_KEYS.latestReport, storedReport);
    writeJsonValue(STORAGE_KEYS.reportHistory, [storedReport, ...history].slice(0, 20));
    emitLocalDataUpdate();
    return storedReport;
}

export function getLocalDataStats() {
    const metricSamples = readMetricSamples();
    const reminderEvents = readReminderEvents();
    const latestSample = metricSamples
        .filter((sample) => typeof sample.timestamp === "number")
        .sort((a, b) => b.timestamp - a.timestamp)[0];

    return {
        metricSamplesCount: metricSamples.length,
        reminderEventsCount: reminderEvents.length,
        latestSampleAt: latestSample ? latestSample.timestamp : null,
        latestSampleReadable: latestSample ? new Date(latestSample.timestamp).toLocaleString() : "No data",
    };
}

export function exportLocalData() {
    const payload = {
        version: "1.0",
        app: "VisionGuard",
        exportedAt: Date.now(),
        exportedAtReadable: new Date().toLocaleString(),
        storageType: "localStorage",
        user: {
            userId: localStorage.getItem(STORAGE_KEYS.userId),
            username: localStorage.getItem(STORAGE_KEYS.username),
            email: localStorage.getItem(STORAGE_KEYS.email),
        },
        data: {
            metricSamples: readJsonValue<unknown[]>(STORAGE_KEYS.metricSamples, []),
            dailySummaries: readJsonValue<unknown>(STORAGE_KEYS.dailySummaries, []),
            reminderEvents: readJsonValue<unknown[]>(STORAGE_KEYS.reminderEvents, []),
            reportHistory: readJsonValue<unknown[]>(STORAGE_KEYS.reportHistory, []),
            settings: readJsonValue<Record<string, unknown>>(STORAGE_KEYS.settings, {}),
        },
    };

    const filename = `visionguard-local-data-${localDateKey()}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    return filename;
}

export async function importLocalData(file: File) {
    const text = await file.text();
    const payload = JSON.parse(text) as {
        app?: string;
        version?: string;
        user?: {
            userId?: string | null;
            username?: string | null;
            email?: string | null;
        };
        data?: {
            metricSamples?: unknown;
            dailySummaries?: unknown;
            reminderEvents?: unknown;
            settings?: unknown;
            reportHistory?: unknown;
        };
    };

    if (payload.app !== "VisionGuard" && !payload.version) {
        throw new Error("Invalid VisionGuard export file.");
    }

    if (!Array.isArray(payload.data?.metricSamples) || !Array.isArray(payload.data?.reminderEvents)) {
        throw new Error("Invalid VisionGuard local data structure.");
    }

    writeJsonValue(STORAGE_KEYS.metricSamples, payload.data.metricSamples);
    writeJsonValue(
        STORAGE_KEYS.dailySummaries,
        payload.data.dailySummaries ?? [],
    );
    writeJsonValue(STORAGE_KEYS.reminderEvents, payload.data.reminderEvents);
    writeJsonValue(STORAGE_KEYS.reminders, payload.data.reminderEvents);
    writeJsonValue(
        STORAGE_KEYS.reportHistory,
        Array.isArray(payload.data.reportHistory) ? payload.data.reportHistory : [],
    );
    writeJsonValue(
        STORAGE_KEYS.settings,
        typeof payload.data.settings === "object" && payload.data.settings !== null ? payload.data.settings : {},
    );

    saveUserProfile({
        userId: payload.user?.userId ?? undefined,
        username: payload.user?.username ?? undefined,
        email: payload.user?.email ?? undefined,
    });

    emitLocalDataUpdate();
}

export function clearLocalTrendData() {
    localStorage.removeItem(STORAGE_KEYS.metricSamples);
    localStorage.removeItem(STORAGE_KEYS.dailySummaries);
    localStorage.removeItem(STORAGE_KEYS.dailyStats);
    localStorage.removeItem(STORAGE_KEYS.reminderEvents);
    localStorage.removeItem(STORAGE_KEYS.reminders);
    localStorage.removeItem(STORAGE_KEYS.latestMetrics);
    localStorage.removeItem("visionguard_card_reminder_cooldowns");
    localStorage.removeItem("visionguard_reminder_cooldowns");
    sessionStorage.removeItem("visionguard_sustained_state");
    emitLocalDataUpdate();
}

export function deleteLocalAccountData() {
    localStorage.removeItem(STORAGE_KEYS.metricSamples);
    localStorage.removeItem(STORAGE_KEYS.dailySummaries);
    localStorage.removeItem(STORAGE_KEYS.dailyStats);
    localStorage.removeItem(STORAGE_KEYS.reminderEvents);
    localStorage.removeItem(STORAGE_KEYS.reminders);
    localStorage.removeItem(STORAGE_KEYS.latestMetrics);
    localStorage.removeItem(STORAGE_KEYS.latestReport);
    localStorage.removeItem(STORAGE_KEYS.reportHistory);
    localStorage.removeItem(STORAGE_KEYS.settings);
    localStorage.removeItem(STORAGE_KEYS.userId);
    localStorage.removeItem(STORAGE_KEYS.username);
    localStorage.removeItem(STORAGE_KEYS.email);
    localStorage.removeItem("visionguard_card_reminder_cooldowns");
    localStorage.removeItem("visionguard_reminder_cooldowns");
    sessionStorage.removeItem("visionguard_sustained_state");
    emitLocalDataUpdate();
}
