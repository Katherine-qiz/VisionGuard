import type { EyeMetrics, ScoreLevel } from "../types/metrics";
import type { Reminder, ReminderType } from "../types/reminder";

const SUSTAINED_STATE_KEY = "visionguard_sustained_state";

export type RiskItem = {
    type: ReminderType;
    level: "good" | "attention" | "warning";
    title: string;
    message: string;
    currentValue: number | boolean;
};

export type SustainedState = {
    distanceAttentionStartedAt?: number;
    distanceWarningStartedAt?: number;
    blinkAttentionStartedAt?: number;
    blinkWarningStartedAt?: number;
    brightnessAttentionStartedAt?: number;
    useTimeAttentionStartedAt?: number;
    goodDistanceStartedAt?: number;
    goodBlinkStartedAt?: number;
    goodBrightnessStartedAt?: number;
    faceMissingStartedAt?: number;
    completedBreak?: boolean;
};

type SustainedTimeKey = Exclude<keyof SustainedState, "completedBreak">;

export type RiskResult = {
    score: number;
    scoreLevel: ScoreLevel;
    mainIssue: "none" | ReminderType;
    risks: RiskItem[];
    reminders: Reminder[];
    scoreFeedback: {
        emoji: string;
        title: string;
        message: string;
    };
    sustainedState: SustainedState;
};

const priority: Record<ReminderType, number> = {
    use_time: 0,
    distance: 1,
    blink: 2,
    brightness: 3,
    face: 4,
};

function readSustainedState(): SustainedState {
    try {
        const rawValue = sessionStorage.getItem(SUSTAINED_STATE_KEY);
        return rawValue ? JSON.parse(rawValue) as SustainedState : {};
    } catch {
        return {};
    }
}

function writeSustainedState(state: SustainedState) {
    try {
        sessionStorage.setItem(SUSTAINED_STATE_KEY, JSON.stringify(state));
    } catch {
        // Session storage can be unavailable in constrained environments.
    }
}

function setStart(
    state: SustainedState,
    key: SustainedTimeKey,
    condition: boolean,
    now: number,
) {
    if (condition) {
        state[key] = typeof state[key] === "number" ? state[key] : now;
        return;
    }

    delete state[key];
}

function elapsed(state: SustainedState, key: SustainedTimeKey, now: number) {
    const startedAt = state[key];
    return typeof startedAt === "number" ? now - startedAt : 0;
}

function scoreLevel(score: number): ScoreLevel {
    if (score >= 85) return "Healthy";
    if (score >= 70) return "Good";
    if (score >= 55) return "Attention";
    return "Risk";
}

function reminderFromRisk(risk: RiskItem): Reminder {
    return {
        id: `${risk.type}-${risk.level}`,
        type: risk.type,
        title: risk.title,
        message: risk.message,
        level: risk.level === "warning" ? "warning" : "attention",
        deliveryMethod: "card",
        cooldownMs: risk.type === "use_time" ? 20 * 60 * 1000 : 5 * 60 * 1000,
    };
}

function mainIssueFromRisks(risks: RiskItem[]): "none" | ReminderType {
    const activeRisks = risks
        .filter((risk) => risk.level !== "good")
        .sort((a, b) => priority[a.type] - priority[b.type]);

    return activeRisks[0]?.type ?? "none";
}

function feedbackFor(score: number, mainIssue: "none" | ReminderType) {
    const base = score >= 85
        ? {
            emoji: "😊",
            title: "Great rhythm today",
            message: "Keep your screen distance and blinking steady.",
        }
        : score >= 70
          ? {
              emoji: "🙂",
              title: "Looking good",
              message: "A few small habits can still be improved.",
          }
          : score >= 50
            ? {
                emoji: "😐",
                title: "Needs attention",
                message: "Check your distance, blinking, or break time.",
            }
            : {
                emoji: "😟",
                title: "Take action now",
                message: "Adjust your posture and take a short eye break.",
            };

    const issueMessage: Partial<Record<ReminderType, string>> = {
        distance: " You are slightly close to the screen.",
        blink: " Your blink rate is a little low.",
        use_time: " Continuous screen time is increasing.",
        brightness: " Lighting may need adjustment.",
        face: " Keep your face visible for more accurate guidance.",
    };

    return {
        ...base,
        message: `${base.message}${mainIssue === "none" ? "" : issueMessage[mainIssue]}`,
    };
}

export function resetSustainedRiskState() {
    try {
        sessionStorage.removeItem(SUSTAINED_STATE_KEY);
    } catch {
        // Ignore storage failures.
    }
}

export function evaluateRisk(metrics: EyeMetrics, now = Date.now()): RiskResult {
    const state = readSustainedState();
    const risks: RiskItem[] = [];
    let currentPenalty = 0;
    const blinkWindowSeconds = metrics.blinkWindowSeconds ?? 0;
    const isBlinkCalibrating = blinkWindowSeconds < 30;
    const continuousUseTimeSeconds = metrics.continuousUseTimeSeconds ?? metrics.useTimeSeconds;
    const breakDurationSeconds = metrics.breakDurationSeconds ?? 0;
    const useTimeStatus = metrics.useTimeStatus
        ?? (continuousUseTimeSeconds < 20 * 60
            ? "normal"
            : continuousUseTimeSeconds < 25 * 60
              ? "break_due"
              : continuousUseTimeSeconds < 40 * 60
                ? "overdue"
                : "long_session");

    const blinkLevel = isBlinkCalibrating
        ? "attention"
        : metrics.blinkRate >= 12
          ? "good"
          : metrics.blinkRate >= 8
            ? "attention"
            : "warning";
    currentPenalty += isBlinkCalibrating ? 0 : blinkLevel === "good" ? 0 : blinkLevel === "attention" ? 6 : 14;
    risks.push({
        type: "blink",
        level: blinkLevel,
        title: isBlinkCalibrating ? "👀 Calibrating blink rhythm" : blinkLevel === "warning" ? "👀 Blink check" : blinkLevel === "attention" ? "👀 Blink rhythm needs a nudge" : "👀 Blink rhythm looks good",
        message: isBlinkCalibrating
            ? "VisionGuard is collecting enough recent eye data before judging blink rate."
            : blinkLevel === "warning"
            ? "Your blink rate is low. Try a few intentional blinks to keep your eyes comfortable."
            : blinkLevel === "attention"
              ? "Your blink rate is slightly below the comfortable range."
              : "Your blink rate is in a comfortable range.",
        currentValue: metrics.blinkRate,
    });

    const distanceLevel = !metrics.faceDetected || metrics.distanceCm <= 0
        ? "attention"
        : metrics.distanceCm >= 50 && metrics.distanceCm <= 100
        ? "good"
        : metrics.distanceCm >= 40
          ? "attention"
          : "warning";
    currentPenalty += !metrics.faceDetected || metrics.distanceCm <= 0 ? 0 : distanceLevel === "good" ? 0 : distanceLevel === "attention" ? 6 : 14;
    risks.push({
        type: "distance",
        level: distanceLevel,
        title: distanceLevel === "warning" ? "📏 Scoot back a little" : distanceLevel === "attention" ? "📏 Viewing distance is a bit close" : "📏 Viewing distance looks good",
        message: distanceLevel === "warning"
            ? "Your viewing distance is below 40 cm. Try sitting around an arm's length from your screen."
            : distanceLevel === "attention"
              ? "Try sitting around an arm's length from your screen."
              : "Your screen distance is comfortable.",
        currentValue: metrics.distanceCm,
    });

    const brightnessLevel = metrics.brightnessLux >= 200 && metrics.brightnessLux <= 750
        ? "good"
        : (metrics.brightnessLux >= 100 && metrics.brightnessLux < 200) || (metrics.brightnessLux > 750 && metrics.brightnessLux <= 1000)
          ? "attention"
          : "warning";
    currentPenalty += brightnessLevel === "good" ? 0 : brightnessLevel === "attention" ? 5 : 10;
    risks.push({
        type: "brightness",
        level: brightnessLevel,
        title: brightnessLevel === "warning" ? "💡 Tune your lighting" : brightnessLevel === "attention" ? "💡 Lighting needs a small tune-up" : "💡 Lighting looks comfortable",
        message: brightnessLevel === "warning"
            ? "The lighting environment may be uncomfortable. Improve ambient light or reduce glare."
            : brightnessLevel === "attention"
              ? "Lighting may need a small adjustment."
              : "Brightness is in a comfortable range.",
        currentValue: metrics.brightnessLux,
    });

    const useTimeLevel = useTimeStatus === "normal" ? "good" : useTimeStatus === "break_due" ? "attention" : "warning";
    currentPenalty += useTimeStatus === "break_due" ? 3 : useTimeStatus === "overdue" ? 8 : useTimeStatus === "long_session" ? 15 : 0;
    risks.push({
        type: "use_time",
        level: useTimeLevel,
        title: useTimeLevel === "warning" ? "🌿 Eye break overdue" : useTimeLevel === "attention" ? "🌿 Time for a 20-second eye break" : "🌿 Screen time is still comfortable",
        message: useTimeLevel === "good"
            ? "Your continuous use time is still in a comfortable range."
            : "Nice focus. Now give your eyes a quick reset: look 20 feet away for 20 seconds.",
        currentValue: continuousUseTimeSeconds,
    });

    if (!metrics.faceDetected) {
        currentPenalty += breakDurationSeconds >= 120 ? 0 : breakDurationSeconds >= 30 ? 3 : 0;
        risks.push({
            type: "face",
            level: "attention",
            title: "🙂 Camera lost your face",
            message: "Adjust your camera angle so VisionGuard can estimate your viewing habits.",
            currentValue: false,
        });
    } else {
        risks.push({
            type: "face",
            level: "good",
            title: "🙂 Face detected",
            message: "VisionGuard can estimate your current viewing habits.",
            currentValue: true,
        });
    }

    if (breakDurationSeconds >= 120) {
        state.completedBreak = true;
    }

    setStart(state, "distanceAttentionStartedAt", metrics.faceDetected && metrics.distanceCm > 0 && metrics.distanceCm < 50, now);
    setStart(state, "distanceWarningStartedAt", metrics.faceDetected && metrics.distanceCm > 0 && metrics.distanceCm < 40, now);
    setStart(state, "blinkAttentionStartedAt", !isBlinkCalibrating && metrics.blinkRate < 12, now);
    setStart(state, "blinkWarningStartedAt", !isBlinkCalibrating && metrics.blinkRate < 8, now);
    setStart(state, "brightnessAttentionStartedAt", brightnessLevel !== "good", now);
    setStart(state, "useTimeAttentionStartedAt", useTimeStatus === "overdue" || useTimeStatus === "long_session", now);
    setStart(state, "goodDistanceStartedAt", metrics.distanceCm >= 50 && metrics.distanceCm <= 100, now);
    setStart(state, "goodBlinkStartedAt", !isBlinkCalibrating && metrics.blinkRate >= 12, now);
    setStart(state, "goodBrightnessStartedAt", brightnessLevel === "good", now);
    setStart(state, "faceMissingStartedAt", !metrics.faceDetected, now);

    let sustainedPenalty = 0;
    if (elapsed(state, "distanceAttentionStartedAt", now) >= 60 * 1000) sustainedPenalty += 4;
    if (elapsed(state, "distanceWarningStartedAt", now) >= 30 * 1000) sustainedPenalty += 8;
    if (elapsed(state, "blinkWarningStartedAt", now) >= 90 * 1000) sustainedPenalty += 8;
    if (elapsed(state, "brightnessAttentionStartedAt", now) >= 60 * 1000) sustainedPenalty += 4;
    if (elapsed(state, "useTimeAttentionStartedAt", now) >= 5 * 60 * 1000 && useTimeStatus === "overdue") sustainedPenalty += 6;
    if (elapsed(state, "useTimeAttentionStartedAt", now) >= 10 * 60 * 1000 && useTimeStatus === "long_session") sustainedPenalty += 10;

    let recoveryBonus = 0;
    if (elapsed(state, "goodDistanceStartedAt", now) >= 60 * 1000) recoveryBonus += 3;
    if (elapsed(state, "goodBlinkStartedAt", now) >= 60 * 1000) recoveryBonus += 3;
    if (elapsed(state, "goodBrightnessStartedAt", now) >= 60 * 1000) recoveryBonus += 2;
    if (state.completedBreak) recoveryBonus += 5;

    const calculatedScore = 85 - currentPenalty - sustainedPenalty + recoveryBonus;
    const score = Math.max(40, Math.min(100, Math.round(calculatedScore)));
    const level = scoreLevel(score);
    const mainIssue = mainIssueFromRisks(risks);
    const reminders = risks
        .filter((risk) => risk.level !== "good")
        .filter((risk) => !(risk.type === "blink" && isBlinkCalibrating))
        .sort((a, b) => priority[a.type] - priority[b.type])
        .slice(0, 3)
        .map(reminderFromRisk);

    writeSustainedState(state);

    return {
        score,
        scoreLevel: level,
        mainIssue,
        risks,
        reminders,
        scoreFeedback: feedbackFor(score, mainIssue),
        sustainedState: state,
    };
}
