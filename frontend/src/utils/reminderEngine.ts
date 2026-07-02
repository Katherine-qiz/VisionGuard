import type { EyeMetrics } from "../types/metrics";
import type { Reminder, ReminderType } from "../types/reminder";
import { saveReminderEvent } from "./reminderStorage";

const HISTORY_COOLDOWNS_KEY = "visionguard_reminder_history_cooldowns";
const BROWSER_COOLDOWNS_KEY = "visionguard_reminder_browser_cooldowns";
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const TWENTY_MINUTES_MS = 20 * 60 * 1000;

const conditionStartedAt: Partial<Record<ReminderType, number>> = {};
const cooldownByType: Record<ReminderType, number> = {
    blink: FIVE_MINUTES_MS,
    distance: FIVE_MINUTES_MS,
    brightness: FIVE_MINUTES_MS,
    use_time: TWENTY_MINUTES_MS,
    face: FIVE_MINUTES_MS,
};
const levelRank: Record<Reminder["level"], number> = {
    info: 0,
    attention: 1,
    warning: 2,
};

type ReminderEngineOptions = {
    monitoringDurationSeconds: number;
    now?: number;
    reminders?: Reminder[];
    userId?: string;
    allowFocusedNotification?: boolean;
};

type ReminderEngineResult = {
    cardReminders: Reminder[];
    browserReminders: Reminder[];
};

function makeReminder(
    type: ReminderType,
    title: string,
    message: string,
    level: Reminder["level"],
    deliveryMethod: Reminder["deliveryMethod"],
    cooldownMs: number,
): Reminder {
    return {
        id: `${type}-${Date.now()}`,
        type,
        title,
        message,
        level,
        deliveryMethod,
        cooldownMs,
    };
}

function safeReadJson<T>(key: string, fallback: T): T {
    try {
        const rawValue = localStorage.getItem(key);
        return rawValue ? JSON.parse(rawValue) as T : fallback;
    } catch {
        return fallback;
    }
}

function safeWriteJson(key: string, value: unknown) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Storage can fail in private browsing or constrained environments.
    }
}

type CooldownEntry = {
    triggeredAt: number;
    level: Reminder["level"];
};

function canPassTypeCooldown(
    key: string,
    reminder: Reminder,
    now: number,
) {
    const cooldowns = safeReadJson<Partial<Record<ReminderType, CooldownEntry>>>(key, {});
    const lastEntry = cooldowns[reminder.type];
    if (!lastEntry) return true;
    const hasLevelUpgrade = levelRank[reminder.level] > levelRank[lastEntry.level];
    return hasLevelUpgrade || now - lastEntry.triggeredAt >= cooldownByType[reminder.type];
}

function canAttemptBrowserNotification(force = false) {
    if (typeof document === "undefined") return false;
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (Notification.permission !== "granted") return false;
    if (force) return true;
    return document.visibilityState !== "visible" || !document.hasFocus();
}

function markTypeCooldown(key: string, reminder: Reminder, now: number) {
    const cooldowns = safeReadJson<Partial<Record<ReminderType, CooldownEntry>>>(key, {});
    safeWriteJson(key, {
        ...cooldowns,
        [reminder.type]: {
            triggeredAt: now,
            level: reminder.level,
        },
    });
}

function recordReminderEvents(
    reminders: Reminder[],
    metrics: EyeMetrics,
    now: number,
    userId = "local-user",
) {
    reminders.forEach((reminder) => {
        if (!canPassTypeCooldown(HISTORY_COOLDOWNS_KEY, reminder, now)) return;
        saveReminderEvent(userId, reminder, metrics, now);
        markTypeCooldown(HISTORY_COOLDOWNS_KEY, reminder, now);
    });
}

function addBrowserReminder(
    reminders: Reminder[],
    reminder: Reminder,
    now: number,
    allowFocusedNotification = false,
) {
    if (!canAttemptBrowserNotification(allowFocusedNotification)) {
        return;
    }

    if (!canPassTypeCooldown(BROWSER_COOLDOWNS_KEY, reminder, now)) return;

    reminders.push(reminder);
    markTypeCooldown(BROWSER_COOLDOWNS_KEY, reminder, now);
}

export function resetReminderEngineState() {
    Object.keys(conditionStartedAt).forEach((key) => {
        delete conditionStartedAt[key as ReminderType];
    });
}

export function evaluateReminders(
    metrics: EyeMetrics,
    options: ReminderEngineOptions,
): ReminderEngineResult {
    const now = options.now ?? Date.now();
    const activeCardReminders: Reminder[] = [];
    const browserReminders: Reminder[] = [];

    if (metrics.isCalibrating) {
        return {
            cardReminders: activeCardReminders,
            browserReminders,
        };
    }

    const continuousUseTimeSeconds = metrics.continuousUseTimeSeconds ?? metrics.useTimeSeconds;

    if (continuousUseTimeSeconds >= 20 * 60) {
        const cardReminder = makeReminder(
            "use_time",
            "🌿 Time for a 20-second eye break",
            "Nice focus. Now give your eyes a quick reset: look 20 feet away for 20 seconds.",
            "attention",
            "card",
            TWENTY_MINUTES_MS,
        );
        activeCardReminders.push(cardReminder);
        addBrowserReminder(
            browserReminders,
            { ...cardReminder, id: `use_time-notification-${now}`, deliveryMethod: "browser_notification" },
            now,
            options.allowFocusedNotification,
        );
    }

    if (metrics.distanceCm > 0 && (metrics.distanceCm < 50 || metrics.distanceCm > 100)) {
        conditionStartedAt.distance ??= now;
        const isWarningDistance = metrics.distanceCm < 40 || metrics.distanceCm > 120;

        const cardReminder = makeReminder(
            "distance",
            isWarningDistance ? "📏 Scoot back a little" : "📏 Viewing distance needs a small nudge",
            metrics.distanceCm < 50
                ? "Your viewing distance is below the comfortable range. Try sitting around an arm's length from your screen."
                : "Your screen is a bit far away. Adjust your setup so text stays easy to read without leaning.",
            isWarningDistance ? "warning" : "attention",
            "card",
            FIVE_MINUTES_MS,
        );
        activeCardReminders.push(cardReminder);

        addBrowserReminder(
            browserReminders,
            { ...cardReminder, id: `distance-notification-${now}`, deliveryMethod: "browser_notification" },
            now,
            options.allowFocusedNotification,
        );
    } else {
        delete conditionStartedAt.distance;
    }

    if (
        metrics.faceDetected &&
        metrics.blinkRate < 12 &&
        (metrics.blinkWindowSeconds ?? 0) >= 30
    ) {
        conditionStartedAt.blink ??= now;
        const isWarningBlink = metrics.blinkRate < 8;
        const cardReminder = makeReminder(
            "blink",
            isWarningBlink ? "👀 Blink check" : "👀 Blink rhythm needs a nudge",
            isWarningBlink
                ? "Your blink rate is low. Try a few intentional blinks to keep your eyes comfortable."
                : "Your blink rate is slightly below the comfortable range. Add a few gentle blinks while reading.",
            isWarningBlink ? "warning" : "attention",
            "card",
            FIVE_MINUTES_MS,
        );
        activeCardReminders.push(cardReminder);
        addBrowserReminder(
            browserReminders,
            { ...cardReminder, id: `blink-notification-${now}`, deliveryMethod: "browser_notification" },
            now,
            options.allowFocusedNotification,
        );
    } else {
        delete conditionStartedAt.blink;
    }

    if (metrics.brightnessLux < 300 || metrics.brightnessLux > 750) {
        const isWarningBrightness = metrics.brightnessLux < 200 || metrics.brightnessLux > 1000;
        const cardReminder = makeReminder(
            "brightness",
            isWarningBrightness ? "💡 Tune your lighting" : "💡 Lighting needs a small tune-up",
            "The lighting environment may be uncomfortable. Improve ambient light or reduce glare.",
            isWarningBrightness ? "warning" : "attention",
            "card",
            FIVE_MINUTES_MS,
        );
        activeCardReminders.push(cardReminder);
        addBrowserReminder(
            browserReminders,
            { ...cardReminder, id: `brightness-notification-${now}`, deliveryMethod: "browser_notification" },
            now,
            options.allowFocusedNotification,
        );
    }

    if (!metrics.faceDetected) {
        const cardReminder = makeReminder(
            "face",
            "🙂 Camera lost your face",
            "Adjust your camera angle so VisionGuard can estimate your viewing habits.",
            "info",
            "card",
            FIVE_MINUTES_MS,
        );
        activeCardReminders.push(cardReminder);
        addBrowserReminder(
            browserReminders,
            { ...cardReminder, id: `face-notification-${now}`, deliveryMethod: "browser_notification" },
            now,
            options.allowFocusedNotification,
        );
    }

    recordReminderEvents(activeCardReminders, metrics, now, options.userId);

    const result = {
        cardReminders: activeCardReminders,
        browserReminders,
    };
    return result;
}
