import type { EyeMetrics, ScoreLevel } from "../types/metrics";
import type { Reminder, ReminderType } from "../types/reminder";
import { localDateKey } from "./dateUtils";

const SUSTAINED_STATE_KEY = "visionguard_sustained_state";
const SCORE_MODEL_VERSION = 5;
const DEFAULT_SCORE = 90;
const SETTLEMENT_INTERVAL_MS = 60 * 1000;

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
    goodBehaviorStartedAt?: number;
    faceMissingStartedAt?: number;
    completedBreak?: boolean;
    currentScore?: number;
    dailyScore?: number;
    lastScoreUpdatedAt?: number;
    lastSettlementAt?: number;
    settlementSnapshotTotal?: number;
    settlementSampleCount?: number;
    scoreDate?: string;
    scoreModelVersion?: number;
};

type SustainedTimeKey =
    | "distanceAttentionStartedAt"
    | "distanceWarningStartedAt"
    | "blinkAttentionStartedAt"
    | "blinkWarningStartedAt"
    | "brightnessAttentionStartedAt"
    | "useTimeAttentionStartedAt"
    | "goodDistanceStartedAt"
    | "goodBlinkStartedAt"
    | "goodBrightnessStartedAt"
    | "goodBehaviorStartedAt"
    | "faceMissingStartedAt";

export type RiskResult = {
    score: number;
    displayScore: number;
    scoreLevel: ScoreLevel;
    mainIssue: "none" | ReminderType;
    risks: RiskItem[];
    reminders: Reminder[];
    scoreFeedback: {
        emoji: string;
        title: string;
        message: string;
    };
    signalScores: {
        blinkScore: number;
        distanceScore: number;
        brightnessScore: number;
        sessionTimeScore: number;
        dailyLoadScore: number;
        liveBehaviorScore: number;
        snapshotScore: number;
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

function scoreLevel(score: number): ScoreLevel {
    if (score >= 85) return "Good";
    if (score >= 70) return "Attention";
    if (score >= 50) return "Warning";
    return "High Risk";
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

function clampScore(score: number) {
    return Math.max(0, Math.min(100, Math.round(score)));
}

function blinkFrequencyScore(metrics: EyeMetrics) {
    const blinkRate = metrics.smoothedBlinkRate ?? metrics.blinkRate;
    if (blinkRate >= 15) return 100;
    if (blinkRate >= 12) return 90;
    if (blinkRate >= 8) return 75;
    if (blinkRate >= 4) return 55;
    return 35;
}

function distanceScore(metrics: EyeMetrics) {
    if (!metrics.faceDetected || metrics.distanceCm <= 0) return 70;
    if (metrics.distanceCm >= 50 && metrics.distanceCm <= 100) return 100;
    if ((metrics.distanceCm >= 40 && metrics.distanceCm < 50) || (metrics.distanceCm > 100 && metrics.distanceCm <= 120)) return 80;
    if (metrics.distanceCm >= 30 && metrics.distanceCm < 40) return 60;
    return 40;
}

function brightnessScore(metrics: EyeMetrics) {
    if (metrics.brightnessLux >= 300 && metrics.brightnessLux <= 750) return 100;
    if ((metrics.brightnessLux >= 200 && metrics.brightnessLux < 300) || (metrics.brightnessLux > 750 && metrics.brightnessLux <= 1000)) return 80;
    return 55;
}

function sessionTimeScore(sessionUseTimeSeconds: number) {
    const minutes = sessionUseTimeSeconds / 60;
    if (minutes <= 20) return 100;
    if (minutes <= 25) return 85;
    if (minutes <= 40) return 65;
    return 45;
}

function dailyLoadScore(totalUseTimeSeconds: number) {
    const hours = totalUseTimeSeconds / 3600;
    if (hours <= 2) return 100;
    if (hours <= 4) return 85;
    if (hours <= 6) return 70;
    if (hours <= 8) return 55;
    return 40;
}

function weightedLiveBehaviorScore(signalScores: {
    blinkScore: number;
    distanceScore: number;
    brightnessScore: number;
    sessionTimeScore: number;
}) {
    return clampScore(
        (signalScores.blinkScore * 0.35)
        + (signalScores.distanceScore * 0.25)
        + (signalScores.brightnessScore * 0.20)
        + (signalScores.sessionTimeScore * 0.20),
    );
}

function settleDailyScore(state: SustainedState, liveBehaviorScore: number, now: number) {
    state.settlementSnapshotTotal = (state.settlementSnapshotTotal ?? 0) + liveBehaviorScore;
    state.settlementSampleCount = (state.settlementSampleCount ?? 0) + 1;

    if (typeof state.lastSettlementAt !== "number") {
        state.lastSettlementAt = now;
        state.dailyScore = state.dailyScore ?? DEFAULT_SCORE;
        return state.dailyScore;
    }

    const settlementCount = Math.floor((now - state.lastSettlementAt) / SETTLEMENT_INTERVAL_MS);
    if (settlementCount <= 0) {
        return state.dailyScore ?? DEFAULT_SCORE;
    }

    const averageSnapshotScore = state.settlementSampleCount
        ? state.settlementSnapshotTotal / state.settlementSampleCount
        : liveBehaviorScore;
    const settlementDelta = averageSnapshotScore >= 90
        ? 2
        : averageSnapshotScore >= 80
          ? 1
          : averageSnapshotScore >= 70
            ? 0
            : averageSnapshotScore >= 50
              ? -1
              : -2;
    state.dailyScore = clampScore((state.dailyScore ?? DEFAULT_SCORE) + (settlementDelta * settlementCount));
    state.lastSettlementAt += settlementCount * SETTLEMENT_INTERVAL_MS;
    state.settlementSnapshotTotal = 0;
    state.settlementSampleCount = 0;
    return state.dailyScore;
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
    const today = localDateKey(now);
    if (state.scoreModelVersion !== SCORE_MODEL_VERSION || state.scoreDate !== today) {
        state.currentScore = DEFAULT_SCORE;
        state.dailyScore = DEFAULT_SCORE;
        state.lastScoreUpdatedAt = now;
        state.lastSettlementAt = undefined;
        state.settlementSnapshotTotal = undefined;
        state.settlementSampleCount = undefined;
        state.scoreDate = today;
        state.scoreModelVersion = SCORE_MODEL_VERSION;
    }

    const risks: RiskItem[] = [];
    const blinkWindowSeconds = metrics.blinkWindowSeconds ?? 0;
    const isBlinkCalibrating = metrics.isCalibrating ?? blinkWindowSeconds < 30;
    if (isBlinkCalibrating) {
        const calibrationScore = state.dailyScore ?? DEFAULT_SCORE;
        writeSustainedState(state);

        return {
            score: calibrationScore,
            displayScore: calibrationScore,
            scoreLevel: scoreLevel(calibrationScore),
            mainIssue: "none",
            risks: [],
            reminders: [],
            scoreFeedback: {
                emoji: "🙂",
                title: "Calibrating",
                message: "VisionGuard is collecting signals before daily score settlement starts.",
            },
            signalScores: {
                blinkScore: 100,
                distanceScore: 100,
                brightnessScore: 100,
                sessionTimeScore: 100,
                dailyLoadScore: 100,
                liveBehaviorScore: 100,
                snapshotScore: 100,
            },
            sustainedState: state,
        };
    }

    const sessionUseTimeSeconds = metrics.sessionUseTimeSeconds ?? metrics.useTimeSeconds;
    const continuousUseTimeSeconds = metrics.continuousUseTimeSeconds ?? sessionUseTimeSeconds;
    const totalUseTimeSeconds = metrics.totalUseTimeSeconds ?? metrics.activeScreenTimeSeconds ?? 0;
    const breakDurationSeconds = metrics.breakDurationSeconds ?? 0;
    const useTimeStatus = metrics.useTimeStatus
        ?? (continuousUseTimeSeconds < 20 * 60
            ? "normal"
            : continuousUseTimeSeconds < 25 * 60
              ? "break_due"
              : continuousUseTimeSeconds < 40 * 60
                ? "overdue"
                : "long_session");

    const signalScores = {
        blinkScore: blinkFrequencyScore(metrics),
        distanceScore: distanceScore(metrics),
        brightnessScore: brightnessScore(metrics),
        sessionTimeScore: sessionTimeScore(continuousUseTimeSeconds),
        dailyLoadScore: dailyLoadScore(totalUseTimeSeconds),
    };
    const liveBehaviorScore = weightedLiveBehaviorScore(signalScores);
    const snapshotScore = liveBehaviorScore;

    const blinkLevel = signalScores.blinkScore >= 90
        ? "good"
        : signalScores.blinkScore < 70
          ? "warning"
          : "attention";
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
        : signalScores.distanceScore >= 90
          ? "good"
          : signalScores.distanceScore < 70
            ? "warning"
            : "attention";
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

    const brightnessLevel = signalScores.brightnessScore >= 90
        ? "good"
        : signalScores.brightnessScore < 70
          ? "warning"
          : "attention";
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

    const focusTimeRiskActive = continuousUseTimeSeconds > 20 * 60;
    const useTimeLevel = signalScores.sessionTimeScore >= 90 ? "good" : useTimeStatus === "break_due" ? "attention" : "warning";
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

    setStart(state, "distanceWarningStartedAt", metrics.faceDetected && metrics.distanceCm > 0 && metrics.distanceCm < 40, now);
    setStart(state, "blinkWarningStartedAt", !isBlinkCalibrating && metrics.blinkRate < 8, now);
    setStart(state, "brightnessAttentionStartedAt", metrics.brightnessLux < 200, now);
    setStart(state, "useTimeAttentionStartedAt", focusTimeRiskActive, now);
    setStart(state, "goodDistanceStartedAt", metrics.distanceCm >= 50 && metrics.distanceCm <= 100, now);
    setStart(state, "goodBlinkStartedAt", !isBlinkCalibrating && metrics.blinkRate >= 12, now);
    setStart(state, "goodBrightnessStartedAt", brightnessLevel === "good", now);
    setStart(state, "faceMissingStartedAt", !metrics.faceDetected, now);
    const score = settleDailyScore(state, liveBehaviorScore, now);
    const displayScore = clampScore((score * 0.7) + (liveBehaviorScore * 0.3));

    state.currentScore = liveBehaviorScore;
    state.lastScoreUpdatedAt = now;
    state.scoreDate = today;
    state.scoreModelVersion = SCORE_MODEL_VERSION;
    const level = scoreLevel(displayScore);
    const mainIssue = mainIssueFromRisks(risks);
    const reminders = risks
        .filter((risk) => risk.level !== "good")
        .filter((risk) => !(risk.type === "blink" && isBlinkCalibrating))
        .sort((a, b) => priority[a.type] - priority[b.type])
        .map(reminderFromRisk);

    writeSustainedState(state);

    return {
        score,
        displayScore,
        scoreLevel: level,
        mainIssue,
        risks,
        reminders,
        scoreFeedback: feedbackFor(score, mainIssue),
        signalScores: {
            ...signalScores,
            liveBehaviorScore,
            snapshotScore,
        },
        sustainedState: state,
    };
}
