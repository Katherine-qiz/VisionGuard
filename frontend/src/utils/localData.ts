import { localDateKey } from "./dateUtils";

const STORAGE_KEYS = {
    metricSamples: "visionguard_metric_samples",
    dailySummaries: "visionguard_daily_summaries",
    reminderEvents: "visionguard_reminder_events",
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
    window.dispatchEvent(new Event("visionguard-storage-updated"));
    return nextSettings;
}

export function getLocalDataStats() {
    const metricSamples = readJsonValue<unknown[]>(STORAGE_KEYS.metricSamples, []);
    const reminderEvents = readJsonValue<unknown[]>(STORAGE_KEYS.reminderEvents, []);
    const latestSample = metricSamples
        .filter((sample): sample is { timestamp: number } => (
            typeof sample === "object"
            && sample !== null
            && typeof (sample as { timestamp?: unknown }).timestamp === "number"
        ))
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
    writeJsonValue(
        STORAGE_KEYS.settings,
        typeof payload.data.settings === "object" && payload.data.settings !== null ? payload.data.settings : {},
    );

    if (payload.user?.userId) localStorage.setItem(STORAGE_KEYS.userId, payload.user.userId);
    if (payload.user?.username) localStorage.setItem(STORAGE_KEYS.username, payload.user.username);
    if (payload.user?.email) localStorage.setItem(STORAGE_KEYS.email, payload.user.email);

    window.dispatchEvent(new Event("visionguard-storage-updated"));
}

export function clearLocalTrendData() {
    localStorage.removeItem(STORAGE_KEYS.metricSamples);
    localStorage.removeItem(STORAGE_KEYS.dailySummaries);
    localStorage.removeItem(STORAGE_KEYS.reminderEvents);
    localStorage.removeItem("visionguard_card_reminder_cooldowns");
    localStorage.removeItem("visionguard_reminder_cooldowns");
    sessionStorage.removeItem("visionguard_sustained_state");
    window.dispatchEvent(new Event("visionguard-storage-updated"));
}

export function deleteLocalAccountData() {
    localStorage.removeItem(STORAGE_KEYS.metricSamples);
    localStorage.removeItem(STORAGE_KEYS.dailySummaries);
    localStorage.removeItem(STORAGE_KEYS.reminderEvents);
    localStorage.removeItem(STORAGE_KEYS.settings);
    localStorage.removeItem(STORAGE_KEYS.userId);
    localStorage.removeItem(STORAGE_KEYS.username);
    localStorage.removeItem(STORAGE_KEYS.email);
    localStorage.removeItem("visionguard_card_reminder_cooldowns");
    localStorage.removeItem("visionguard_reminder_cooldowns");
    sessionStorage.removeItem("visionguard_sustained_state");
    window.dispatchEvent(new Event("visionguard-storage-updated"));
}
