import type { EyeMetrics } from "../types/metrics";
import type { Reminder, ReminderEvent } from "../types/reminder";
import { localDateKey } from "./dateUtils";
import {
    appendReminderEvent,
    readReminderEvents as readSharedReminderEvents,
    STORAGE_KEYS,
} from "./localData";

export const REMINDER_EVENTS_KEY = STORAGE_KEYS.reminderEvents;

export function readReminderEvents(): ReminderEvent[] {
    return readSharedReminderEvents();
}

export function reminderEventDisplayDate(event: ReminderEvent) {
    return localDateKey(event.triggeredAt);
}

function compactMetricsSnapshot(metrics: EyeMetrics): ReminderEvent["metricsSnapshot"] {
    return {
        eyeHealthScore: metrics.eyeHealthScore,
        scoreLevel: metrics.scoreLevel,
        blinkRate: metrics.blinkRate,
        distanceCm: metrics.distanceCm,
        brightnessLux: metrics.brightnessLux,
        sessionUseTimeSeconds: metrics.sessionUseTimeSeconds,
        totalUseTimeSeconds: metrics.totalUseTimeSeconds,
        continuousUseTimeSeconds: metrics.continuousUseTimeSeconds,
        faceDetected: metrics.faceDetected,
        isCalibrating: metrics.isCalibrating,
    };
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
        metricsSnapshot: compactMetricsSnapshot(metricsSnapshot),
    };

    return appendReminderEvent(event);
}

export function reminderEventsForDate(date: string) {
    return readReminderEvents().filter((event) => reminderEventDisplayDate(event) === date);
}
