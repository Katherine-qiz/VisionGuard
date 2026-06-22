import type { EyeMetrics } from "./metrics";

export type ReminderType = "use_time" | "distance" | "blink" | "brightness" | "face";

export type Reminder = {
    id: string;
    type: ReminderType;
    title: string;
    message: string;
    level: "info" | "attention" | "warning";
    deliveryMethod: "card" | "browser_notification";
    cooldownMs: number;
};

export type ReminderEvent = Reminder & {
    userId: string;
    triggeredAt: number;
    date: string;
    metricsSnapshot: Partial<Pick<
        EyeMetrics,
        | "eyeHealthScore"
        | "scoreLevel"
        | "blinkRate"
        | "distanceCm"
        | "brightnessLux"
        | "sessionUseTimeSeconds"
        | "totalUseTimeSeconds"
        | "continuousUseTimeSeconds"
        | "faceDetected"
        | "isCalibrating"
    >>;
};
