import type { EyeMetrics } from "../types/metrics";
import type { Reminder, ReminderEvent } from "../types/reminder";
import { localDateKey } from "./dateUtils";

export const REMINDER_EVENTS_KEY = "visionguard_reminder_events";
const MAX_EVENTS = 200;

export function readReminderEvents(): ReminderEvent[] {
    try {
        const rawValue = localStorage.getItem(REMINDER_EVENTS_KEY);
        return rawValue ? JSON.parse(rawValue) as ReminderEvent[] : [];
    } catch {
        return [];
    }
}

export function reminderEventDisplayDate(event: ReminderEvent) {
    return localDateKey(event.triggeredAt);
}

export function saveReminderEvent(
    userId: string,
    reminder: Reminder,
    metricsSnapshot: EyeMetrics,
    triggeredAt = Date.now(),
) {
    const event: ReminderEvent = {
        ...reminder,
        userId,
        triggeredAt,
        date: localDateKey(triggeredAt),
        metricsSnapshot,
    };

    try {
        const events = readReminderEvents();
        localStorage.setItem(
            REMINDER_EVENTS_KEY,
            JSON.stringify([event, ...events].slice(0, MAX_EVENTS)),
        );
        window.dispatchEvent(new Event("visionguard-storage-updated"));
    } catch {
        // Ignore storage failures for the local MVP.
    }

    return event;
}

export function reminderEventsForDate(date: string) {
    return readReminderEvents().filter((event) => reminderEventDisplayDate(event) === date);
}
