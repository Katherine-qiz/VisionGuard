import type { EyeMetrics } from "../types/metrics";
import type { Reminder, ReminderType } from "../types/reminder";
import { saveReminderEvent } from "./reminderStorage";

// Temporarily disabled for notification testing.
// const COOLDOWNS_KEY = "visionguard_reminder_cooldowns";
const CARD_EVENT_COOLDOWNS_KEY = "visionguard_card_reminder_cooldowns";
const DISTANCE_SUSTAINED_MS = 10 * 1000;
const BLINK_SUSTAINED_MS = 90 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;
const TWENTY_MINUTES_MS = 20 * 60 * 1000;

const conditionStartedAt: Partial<Record<ReminderType, number>> = {};

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

// Temporarily disabled for notification testing.
// function isCoolingDown(type: ReminderType, now: number, cooldownMs: number) {
//     const cooldowns = safeReadJson<Partial<Record<ReminderType, number>>>(COOLDOWNS_KEY, {});
//     const lastTriggeredAt = cooldowns[type] ?? 0;
//     return now - lastTriggeredAt < cooldownMs;
// }

function isCardEventCoolingDown(type: ReminderType, now: number, cooldownMs: number) {
    const cooldowns = safeReadJson<Partial<Record<ReminderType, number>>>(CARD_EVENT_COOLDOWNS_KEY, {});
    const lastTriggeredAt = cooldowns[type] ?? 0;
    return now - lastTriggeredAt < cooldownMs;
}

function canAttemptBrowserNotification(force = false) {
    if (typeof document === "undefined") return false;
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (Notification.permission !== "granted") return false;
    if (force) return true;
    return document.visibilityState !== "visible" || !document.hasFocus();
}

// Temporarily disabled for notification testing.
// function markCooldown(type: ReminderType, now: number) {
//     const cooldowns = safeReadJson<Partial<Record<ReminderType, number>>>(COOLDOWNS_KEY, {});
//     safeWriteJson(COOLDOWNS_KEY, {
//         ...cooldowns,
//         [type]: now,
//     });
// }

function markCardEventCooldown(type: ReminderType, now: number) {
    const cooldowns = safeReadJson<Partial<Record<ReminderType, number>>>(CARD_EVENT_COOLDOWNS_KEY, {});
    safeWriteJson(CARD_EVENT_COOLDOWNS_KEY, {
        ...cooldowns,
        [type]: now,
    });
}

function recordCardReminderEvents(
    reminders: Reminder[],
    metrics: EyeMetrics,
    now: number,
    userId = "local-user",
) {
    reminders.forEach((reminder) => {
        if (isCardEventCoolingDown(reminder.type, now, reminder.cooldownMs)) return;
        saveReminderEvent(userId, reminder, metrics, now);
        markCardEventCooldown(reminder.type, now);
    });
}

function addBrowserReminder(
    reminders: Reminder[],
    reminder: Reminder,
    metrics: EyeMetrics,
    now: number,
    userId = "local-user",
    allowFocusedNotification = false,
) {
    console.log("Trying browser reminder:", reminder.type);

    if (!canAttemptBrowserNotification(allowFocusedNotification)) {
        console.log("Browser reminder blocked:", {
            type: reminder.type,
            notificationSupported: typeof window !== "undefined" && "Notification" in window,
            permission: typeof window !== "undefined" && "Notification" in window ? Notification.permission : "not-supported",
            visibilityState: typeof document !== "undefined" ? document.visibilityState : "unknown",
            hasFocus: typeof document !== "undefined" ? document.hasFocus() : false,
            allowFocusedNotification,
        });
        return;
    }

    // Temporarily disabled for notification testing.
    // if (isCoolingDown(reminder.type, now, reminder.cooldownMs)) return;

    reminders.push(reminder);
    // Temporarily disabled for notification testing.
    // markCooldown(reminder.type, now);
    saveReminderEvent(userId, reminder, metrics, now);
    console.log("Browser reminder added with cooldown disabled:", reminder.type);
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
    if (options.reminders) {
        const browserReminders: Reminder[] = [];
        recordCardReminderEvents(options.reminders, metrics, now, options.userId);

        options.reminders
            .filter((reminder) => reminder.type !== "face")
            .forEach((reminder) => {
                if (reminder.type === "blink") {
                    if ((metrics.blinkWindowSeconds ?? 0) < 30 || metrics.blinkRate >= 8) return;
                    conditionStartedAt.blink ??= now;
                    if (now - conditionStartedAt.blink < BLINK_SUSTAINED_MS) return;
                } else {
                    delete conditionStartedAt.blink;
                }

                if (reminder.type === "use_time") {
                    const continuousUseTimeSeconds = metrics.continuousUseTimeSeconds ?? metrics.useTimeSeconds;
                    if (continuousUseTimeSeconds < 25 * 60) return;
                }

                addBrowserReminder(
                    browserReminders,
                    {
                        ...reminder,
                        id: `${reminder.type}-notification-${now}`,
                        deliveryMethod: "browser_notification",
                    },
                    metrics,
                    now,
                    options.userId,
                    options.allowFocusedNotification,
                );
            });

        const result = {
            cardReminders: options.reminders,
            browserReminders,
        };
        console.log("evaluateReminders result:", result);
        return result;
    }

    const cardReminders: Reminder[] = [];
    const browserReminders: Reminder[] = [];

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
        cardReminders.push(cardReminder);
        if (continuousUseTimeSeconds >= 25 * 60) {
            addBrowserReminder(
                browserReminders,
                { ...cardReminder, id: `use_time-notification-${now}`, deliveryMethod: "browser_notification" },
                metrics,
                now,
                options.userId,
                options.allowFocusedNotification,
            );
        }
    }

    if (metrics.distanceCm > 0 && metrics.distanceCm < 40) {
        conditionStartedAt.distance ??= now;

        const cardReminder = makeReminder(
            "distance",
            "📏 Scoot back a little",
            "Your viewing distance is below 40 cm. Try sitting around an arm's length from your screen.",
            "warning",
            "card",
            FIVE_MINUTES_MS,
        );
        cardReminders.push(cardReminder);

        if (now - conditionStartedAt.distance >= DISTANCE_SUSTAINED_MS) {
            addBrowserReminder(
                browserReminders,
                { ...cardReminder, id: `distance-notification-${now}`, deliveryMethod: "browser_notification" },
                metrics,
                now,
                options.userId,
                options.allowFocusedNotification,
            );
        }
    } else {
        delete conditionStartedAt.distance;
    }

    if (
        metrics.faceDetected &&
        metrics.blinkRate < 8 &&
        (metrics.blinkWindowSeconds ?? 0) >= 30
    ) {
        conditionStartedAt.blink ??= now;
        const cardReminder = makeReminder(
            "blink",
            "👀 Blink check",
            "Your blink rate is low. Try a few intentional blinks to keep your eyes comfortable.",
            "attention",
            "card",
            FIVE_MINUTES_MS,
        );
        cardReminders.push(cardReminder);
        if (now - conditionStartedAt.blink >= BLINK_SUSTAINED_MS) {
            addBrowserReminder(
                browserReminders,
                { ...cardReminder, id: `blink-notification-${now}`, deliveryMethod: "browser_notification" },
                metrics,
                now,
                options.userId,
                options.allowFocusedNotification,
            );
        }
    } else {
        delete conditionStartedAt.blink;
    }

    if (metrics.brightnessLux < 100 || metrics.brightnessLux > 1000) {
        const cardReminder = makeReminder(
            "brightness",
            "💡 Tune your lighting",
            "The lighting environment may be uncomfortable. Improve ambient light or reduce glare.",
            "attention",
            "card",
            TEN_MINUTES_MS,
        );
        cardReminders.push(cardReminder);
        addBrowserReminder(
            browserReminders,
            { ...cardReminder, id: `brightness-notification-${now}`, deliveryMethod: "browser_notification" },
            metrics,
            now,
            options.userId,
            options.allowFocusedNotification,
        );
    }

    if (!metrics.faceDetected) {
        cardReminders.push(makeReminder(
            "face",
            "🙂 Camera lost your face",
            "Adjust your camera angle so VisionGuard can estimate your viewing habits.",
            "info",
            "card",
            FIVE_MINUTES_MS,
        ));
    }

    const result = {
        cardReminders: cardReminders.slice(0, 3),
        browserReminders,
    };
    console.log("evaluateReminders result:", result);
    return result;
}
