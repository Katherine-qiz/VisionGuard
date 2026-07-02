import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { useMonitoring } from "../context/MonitoringContext";
import type { EyeMetrics } from "../types/metrics";
import type { ReminderEvent } from "../types/reminder";
import {
    readDailySummaries,
    readLatestMetrics,
    readLatestReport,
    readMetricSamples,
    readReportHistory,
    readReminderEvents,
    saveLatestReport,
    subscribeLocalData,
} from "../utils/localData";
import { normalizeMetrics } from "../utils/normalizeMetrics";

type ReportPageProps = {
    onOpenSettings?: () => void;
};

type MetricStatus = "Good" | "Attention" | "Warning" | "High Risk";

type MetricExplanation = {
    metric: "blinkRate" | "distance" | "brightness" | "sessionTime";
    currentValue: string;
    recommendedRange: string;
    status: MetricStatus;
    meaning: string;
};

type ActionPlan = {
    doNow: string[];
    improveToday: string[];
    longTermHabits: string[];
};

type MetricsSnapshot = {
    blinkRate: number | null;
    distanceCm: number | null;
    brightnessLux: number | null;
    useTimeSeconds: number | null;
    sessionUseTimeSeconds: number | null;
    totalUseTimeSeconds: number | null;
    eyeHealthScore: number | null;
    scoreLevel: MetricStatus;
    isCalibrating: boolean;
    faceDetected: boolean;
};

type AIReport = {
    summary: string;
    scoreMeaning: string;
    mainIssue: string;
    whatIsGood: string[];
    needsAttention: string[];
    metricExplanations: MetricExplanation[];
    actionPlan: ActionPlan;
    preventionTips: string[];
    disclaimer: string;
    score?: number;
    riskLevel?: string;
    risk_level?: string;
    trendInsight?: string;
    keyFindings?: string[];
    issues?: string[];
    behaviorTrends?: string[];
    fatigueAnalysis?: string[];
    riskFactors?: string[];
    recommendations?: string[];
    suggestions?: string[];
};

type ReportHistoryEntry = {
    id: string;
    prompt: string;
    report: AIReport;
    generatedAt: string;
    reportScore: number;
    riskLevel: MetricStatus;
    topRisk: string;
    metricsSnapshot: MetricsSnapshot;
    remindersSnapshot: ReminderEvent[];
};

type ReportPayload = {
    blinkRate: number | null;
    viewingDistance: number | null;
    distanceCm: number | null;
    brightness: number | null;
    brightnessLux: number | null;
    useTimeSeconds: number | null;
    sessionUseTimeSeconds: number | null;
    totalUseTimeSeconds: number | null;
    eyeHealthScore: number | null;
    scoreLevel: MetricStatus;
    isCalibrating: boolean;
    faceDetected: boolean;
    selectedDate: string;
    metricsSnapshot: MetricsSnapshot;
    remindersSnapshot: ReminderEvent[];
    recentSamples: Array<Record<string, unknown>>;
    todayReminderSummary: unknown;
    currentReminders: unknown;
    reminderCountByType: unknown;
    recurringIssues: string[];
    improvedSignals: string[];
    reminders: unknown;
    latestMetrics: unknown;
    dailyStats: unknown;
    previousReport: unknown;
};

type ReportResponse = {
    success: boolean;
    report?: Partial<AIReport>;
    raw?: string;
    error?: string;
};

const REPORT_CONVERSATION_KEY = "visionguard_report_conversation";
const REPORT_PROMPT_TEXT = "Generate my eye health report";
const DEFAULT_DISCLAIMER = "This is not a medical diagnosis. If you have persistent eye pain, blurred vision, severe dryness, or worsening symptoms, consult an eye-care professional.";

function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function numberOrNull(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function secondsToMinutes(seconds: number | null) {
    if (seconds === null) return null;
    return Math.round(seconds / 60);
}

function formatGeneratedAt(generatedAt: string) {
    return generatedAt ? new Date(generatedAt).toLocaleString() : "Not generated yet";
}

function reminderLabel(type: string) {
    if (type === "blink") return "Blink rate";
    if (type === "distance") return "Viewing distance";
    if (type === "brightness") return "Brightness";
    if (type === "use_time") return "Session time";
    if (type === "face") return "Face visibility";
    return type;
}

function scoreStatus(score: number): MetricStatus {
    if (score >= 85) return "Good";
    if (score >= 70) return "Attention";
    if (score >= 50) return "Warning";
    return "High Risk";
}

function statusClassName(status: MetricStatus) {
    if (status === "Good") return "good-status";
    if (status === "Attention") return "attention-status";
    return "warning-status";
}

function riskLevelFromReport(report: Partial<AIReport> | null, reportScore: number): MetricStatus {
    const rawRisk = String(report?.riskLevel ?? report?.risk_level ?? "").toLowerCase();
    if (rawRisk.includes("high")) return "High Risk";
    if (rawRisk.includes("warning")) return "Warning";
    if (rawRisk.includes("medium") || rawRisk.includes("attention")) return "Attention";
    if (rawRisk.includes("low") || rawRisk.includes("good")) return "Good";
    return scoreStatus(reportScore);
}

function metricStatus(metric: MetricExplanation["metric"], value: number | null): MetricStatus {
    if (value === null) return "Attention";
    if (metric === "blinkRate") {
        if (value >= 12) return "Good";
        if (value >= 8) return "Attention";
        return "Warning";
    }
    if (metric === "distance") {
        if (value >= 50 && value <= 100) return "Good";
        if ((value >= 40 && value < 50) || (value > 100 && value <= 120)) return "Attention";
        return "Warning";
    }
    if (metric === "brightness") {
        if (value >= 300 && value <= 750) return "Good";
        if ((value >= 200 && value < 300) || (value > 750 && value <= 1000)) return "Attention";
        return "Warning";
    }
    if (value <= 20) return "Good";
    if (value <= 40) return "Attention";
    return "Warning";
}

function metricMeaning(metric: MetricExplanation["metric"], status: MetricStatus) {
    const meanings = {
        blinkRate: {
            Good: "Your blinking rhythm is in a comfortable range for screen work.",
            Attention: "Your blink rate is slightly low, which may increase dryness during focused reading.",
            Warning: "Your blink rate is low enough to deserve a conscious blinking reset.",
            "High Risk": "Your blink pattern suggests sustained dryness risk.",
        },
        distance: {
            Good: "Your viewing distance is close to the recommended arm's-length range.",
            Attention: "Your screen distance is near the edge of the comfortable range.",
            Warning: "Your screen distance is outside the comfortable range and may add strain.",
            "High Risk": "Your viewing distance pattern needs attention.",
        },
        brightness: {
            Good: "Your lighting looks comfortable for screen use.",
            Attention: "Your lighting is slightly outside the comfort range.",
            Warning: "Your lighting may be too dim or too glaring for comfortable viewing.",
            "High Risk": "Your lighting exposure needs attention.",
        },
        sessionTime: {
            Good: "Your current session is still within the 20-minute break rhythm.",
            Attention: "You have passed the 20-minute mark, so a short eye break would help.",
            Warning: "This session is long enough that a break should be prioritized.",
            "High Risk": "Your session length suggests a sustained break is needed.",
        },
    } satisfies Record<MetricExplanation["metric"], Record<MetricStatus, string>>;

    return meanings[metric][status];
}

function fallbackMetricExplanations(snapshot: MetricsSnapshot): MetricExplanation[] {
    const blinkStatus = metricStatus("blinkRate", snapshot.blinkRate);
    const distanceStatus = metricStatus("distance", snapshot.distanceCm);
    const brightnessStatus = metricStatus("brightness", snapshot.brightnessLux);
    const sessionMinutes = secondsToMinutes(snapshot.sessionUseTimeSeconds ?? snapshot.useTimeSeconds);
    const sessionStatus = metricStatus("sessionTime", sessionMinutes);

    return [
        {
            metric: "blinkRate",
            currentValue: snapshot.blinkRate === null ? "No data" : `${Math.round(snapshot.blinkRate)}/min`,
            recommendedRange: "Good >= 12/min; Attention 8-11/min; Warning < 8/min",
            status: blinkStatus,
            meaning: metricMeaning("blinkRate", blinkStatus),
        },
        {
            metric: "distance",
            currentValue: snapshot.distanceCm === null ? "No data" : `${Math.round(snapshot.distanceCm)} cm`,
            recommendedRange: "Good 50-100 cm; Attention 40-49 or 101-120 cm; Warning < 40 or > 120 cm",
            status: distanceStatus,
            meaning: metricMeaning("distance", distanceStatus),
        },
        {
            metric: "brightness",
            currentValue: snapshot.brightnessLux === null ? "No data" : `${Math.round(snapshot.brightnessLux)} lux`,
            recommendedRange: "Good 300-750 lux; Attention 200-299 or 751-1000 lux; Warning < 200 or > 1000 lux",
            status: brightnessStatus,
            meaning: metricMeaning("brightness", brightnessStatus),
        },
        {
            metric: "sessionTime",
            currentValue: sessionMinutes === null ? "No data" : `${sessionMinutes} min`,
            recommendedRange: "Good <= 20 min; Attention 20-40 min; Warning > 40 min",
            status: sessionStatus,
            meaning: metricMeaning("sessionTime", sessionStatus),
        },
    ];
}

function topRiskFromMetrics(metrics: MetricExplanation[]) {
    const ranked = [...metrics].sort((a, b) => {
        const rank = { "High Risk": 3, Warning: 2, Attention: 1, Good: 0 } as const;
        return rank[b.status] - rank[a.status];
    });
    const top = ranked.find((metric) => metric.status !== "Good");
    if (!top) return "No major risk";
    if (top.metric === "blinkRate") return "Blink rate";
    if (top.metric === "distance") return "Viewing distance";
    if (top.metric === "brightness") return "Brightness";
    return "Session time";
}

function buildTodayReminderSummary(events: ReminderEvent[], snapshot: MetricsSnapshot) {
    const today = localDateKey();
    const todayEvents = events.filter((event) => event.date === today);
    const countByType = todayEvents.reduce<Record<string, number>>((counts, event) => {
        counts[event.type] = (counts[event.type] ?? 0) + 1;
        return counts;
    }, {});
    const latestByType = todayEvents.reduce<Record<string, ReminderEvent>>((latest, event) => {
        const currentLatest = latest[event.type];
        if (!currentLatest || event.triggeredAt > currentLatest.triggeredAt) {
            latest[event.type] = event;
        }
        return latest;
    }, {});
    const currentMetricStatus = {
        blink: metricStatus("blinkRate", snapshot.blinkRate),
        distance: metricStatus("distance", snapshot.distanceCm),
        brightness: metricStatus("brightness", snapshot.brightnessLux),
        use_time: metricStatus("sessionTime", secondsToMinutes(snapshot.sessionUseTimeSeconds ?? snapshot.useTimeSeconds)),
        face: snapshot.faceDetected ? "Good" : "Attention",
    } satisfies Record<string, MetricStatus>;
    const currentActiveTypes = Object.entries(currentMetricStatus)
        .filter(([, status]) => status !== "Good")
        .map(([type]) => type);
    const recurringIssues = Object.entries(countByType)
        .filter(([, count]) => count > 1)
        .map(([type, count]) => `${reminderLabel(type)} appeared ${count} times today.`);
    const improvedSignals = Object.entries(countByType)
        .filter(([type]) => !currentActiveTypes.includes(type))
        .map(([type]) => `${reminderLabel(type)} had reminders earlier today but is not active in the current snapshot.`);

    return {
        date: today,
        totalReminderCount: todayEvents.length,
        types: Object.keys(countByType),
        countByType,
        latestByType: Object.fromEntries(Object.entries(latestByType).map(([type, event]) => [
            type,
            {
                title: event.title,
                level: event.level,
                triggeredAt: event.triggeredAt,
                currentStillPresent: currentActiveTypes.includes(type),
            },
        ])),
        currentActiveTypes,
        recurringIssues,
        improvedSignals,
    };
}

function summarizeReminderSnapshot(events: ReminderEvent[], snapshot: MetricsSnapshot) {
    const summary = buildTodayReminderSummary(events, snapshot);
    if (summary.totalReminderCount === 0) {
        return "No reminder history has been recorded today, so this report mainly reflects the current monitoring snapshot.";
    }

    const types = summary.types.map(reminderLabel).join(", ");
    const improved = summary.improvedSignals.length > 0
        ? ` ${summary.improvedSignals.join(" ")}`
        : "";
    const active = summary.currentActiveTypes.length > 0
        ? ` Current attention signals: ${summary.currentActiveTypes.map(reminderLabel).join(", ")}.`
        : " No urgent reminder is active in the current snapshot.";
    return `Today VisionGuard recorded ${summary.totalReminderCount} reminder${summary.totalReminderCount === 1 ? "" : "s"} across ${types}.${active}${improved}`;
}

function buildFallbackReport(snapshot: MetricsSnapshot, reportScore: number): AIReport {
    const metrics = fallbackMetricExplanations(snapshot);
    const needsAttention = metrics
        .filter((metric) => metric.status !== "Good")
        .map((metric) => `${topRiskFromMetrics([metric])}: keep this signal in range during upcoming sessions rather than treating the current value as an isolated reading.`);
    const whatIsGood = metrics
        .filter((metric) => metric.status === "Good")
        .map((metric) => `${topRiskFromMetrics([metric]) === "No major risk" ? metric.metric : topRiskFromMetrics([metric])}: ${metric.meaning}`);

    return {
        summary: `Your report score is ${reportScore}/100. VisionGuard is using your latest blink, distance, brightness, and session-time signals to summarize your screen-use habits.`,
        scoreMeaning: `A score of ${reportScore}/100 means your recent eye-care behavior is in the ${scoreStatus(reportScore).toLowerCase()} range. It is a behavioral guidance score, not a medical diagnosis.`,
        mainIssue: needsAttention.length > 0
            ? `${topRiskFromMetrics(metrics)} is the main pattern to watch in the current report context.`
            : "No major recurring issue stands out in the available report context.",
        whatIsGood: whatIsGood.length > 0 ? whatIsGood : ["At least one signal is close to the recommended range."],
        needsAttention: needsAttention.length > 0 ? needsAttention : ["Keep monitoring to build a clearer pattern over time."],
        metricExplanations: metrics,
        actionPlan: {
            doNow: ["Relax your focus for 20 seconds and look farther away from the screen."],
            improveToday: ["Keep your screen about 50-100 cm away and check lighting before long work blocks."],
            longTermHabits: ["Use short break rhythms and intentional blinking during reading or coding sessions."],
        },
        preventionTips: [
            "Follow the 20-20-20 rhythm during longer sessions.",
            "Keep the screen at a comfortable arm's-length distance.",
            "Avoid very dim or glaring light around your workspace.",
        ],
        disclaimer: DEFAULT_DISCLAIMER,
        score: reportScore,
        riskLevel: scoreStatus(reportScore),
    };
}

function normalizeMetricExplanation(value: unknown, fallback: MetricExplanation): MetricExplanation {
    if (!value || typeof value !== "object") return fallback;
    const explanation = value as Partial<MetricExplanation>;
    const metric = explanation.metric === "blinkRate" || explanation.metric === "distance" || explanation.metric === "brightness" || explanation.metric === "sessionTime"
        ? explanation.metric
        : fallback.metric;
    const status = explanation.status === "Good" || explanation.status === "Attention" || explanation.status === "Warning" || explanation.status === "High Risk"
        ? explanation.status
        : fallback.status;
    return {
        metric,
        currentValue: typeof explanation.currentValue === "string" ? explanation.currentValue : fallback.currentValue,
        recommendedRange: typeof explanation.recommendedRange === "string" ? explanation.recommendedRange : fallback.recommendedRange,
        status,
        meaning: typeof explanation.meaning === "string" ? explanation.meaning : fallback.meaning,
    };
}

function normalizeActionPlan(value: unknown, fallback: ActionPlan): ActionPlan {
    if (!value || typeof value !== "object") return fallback;
    const actionPlan = value as Partial<ActionPlan>;
    return {
        doNow: stringArray(actionPlan.doNow).length > 0 ? stringArray(actionPlan.doNow) : fallback.doNow,
        improveToday: stringArray(actionPlan.improveToday).length > 0 ? stringArray(actionPlan.improveToday) : fallback.improveToday,
        longTermHabits: stringArray(actionPlan.longTermHabits).length > 0 ? stringArray(actionPlan.longTermHabits) : fallback.longTermHabits,
    };
}

function normalizeReport(report: Partial<AIReport>, snapshot: MetricsSnapshot, reportScore: number): AIReport {
    const fallback = buildFallbackReport(snapshot, reportScore);
    const fallbackMetrics = fallback.metricExplanations;
    const sourceMetrics = Array.isArray(report.metricExplanations) ? report.metricExplanations : [];
    const recommendations = [
        ...stringArray(report.recommendations),
        ...stringArray(report.suggestions),
    ];
    const needsAttention = stringArray(report.needsAttention).length > 0
        ? stringArray(report.needsAttention)
        : [
            ...stringArray(report.riskFactors),
            ...stringArray(report.issues),
            ...stringArray(report.fatigueAnalysis),
        ];

    const mainIssue = report.mainIssue || needsAttention[0] || fallback.mainIssue;
    const distinctNeedsAttention = (needsAttention.length > 0 ? needsAttention : fallback.needsAttention)
        .filter((item) => item.trim() !== mainIssue.trim());

    return {
        summary: report.summary || fallback.summary,
        scoreMeaning: report.scoreMeaning || (report as { score_explanation?: string }).score_explanation || fallback.scoreMeaning,
        mainIssue,
        whatIsGood: stringArray(report.whatIsGood).length > 0 ? stringArray(report.whatIsGood) : fallback.whatIsGood,
        needsAttention: distinctNeedsAttention.length > 0 ? distinctNeedsAttention : fallback.needsAttention,
        metricExplanations: fallbackMetrics.map((fallbackMetric, index) => normalizeMetricExplanation(sourceMetrics[index], fallbackMetric)),
        actionPlan: normalizeActionPlan(report.actionPlan, recommendations.length > 0 ? {
            ...fallback.actionPlan,
            improveToday: recommendations,
        } : fallback.actionPlan),
        preventionTips: stringArray(report.preventionTips).length > 0 ? stringArray(report.preventionTips) : fallback.preventionTips,
        disclaimer: report.disclaimer || DEFAULT_DISCLAIMER,
        score: reportScore,
        riskLevel: riskLevelFromReport(report, reportScore),
        trendInsight: report.trendInsight,
        keyFindings: stringArray(report.keyFindings),
        issues: stringArray(report.issues),
        behaviorTrends: stringArray(report.behaviorTrends),
        fatigueAnalysis: stringArray(report.fatigueAnalysis),
        riskFactors: stringArray(report.riskFactors),
        recommendations,
        suggestions: stringArray(report.suggestions),
    };
}

function entryFromLegacyReport(value: unknown, generatedAt = ""): ReportHistoryEntry | null {
    if (!value || typeof value !== "object") return null;
    const maybeEntry = value as Partial<ReportHistoryEntry> & Partial<AIReport>;
    if (maybeEntry.report && maybeEntry.metricsSnapshot && typeof maybeEntry.reportScore === "number") {
        const metricsSnapshot = {
            ...maybeEntry.metricsSnapshot,
            scoreLevel: maybeEntry.metricsSnapshot.scoreLevel ?? scoreStatus(maybeEntry.reportScore),
            isCalibrating: maybeEntry.metricsSnapshot.isCalibrating ?? false,
            faceDetected: maybeEntry.metricsSnapshot.faceDetected ?? false,
        };
        return {
            id: maybeEntry.id ?? `report-${maybeEntry.generatedAt ?? generatedAt}`,
            prompt: maybeEntry.prompt ?? REPORT_PROMPT_TEXT,
            report: normalizeReport(maybeEntry.report, metricsSnapshot, maybeEntry.reportScore),
            generatedAt: maybeEntry.generatedAt ?? generatedAt,
            reportScore: maybeEntry.reportScore,
            riskLevel: maybeEntry.riskLevel ?? scoreStatus(maybeEntry.reportScore),
            topRisk: maybeEntry.topRisk ?? topRiskFromMetrics(maybeEntry.report.metricExplanations ?? []),
            metricsSnapshot,
            remindersSnapshot: Array.isArray(maybeEntry.remindersSnapshot) ? maybeEntry.remindersSnapshot : [],
        };
    }

    const reportScore = typeof maybeEntry.score === "number" ? Math.round(maybeEntry.score) : 0;
    const snapshot: MetricsSnapshot = {
        blinkRate: null,
        distanceCm: null,
        brightnessLux: null,
        useTimeSeconds: null,
        sessionUseTimeSeconds: null,
        totalUseTimeSeconds: null,
        eyeHealthScore: reportScore,
        scoreLevel: scoreStatus(reportScore),
        isCalibrating: false,
        faceDetected: false,
    };
    const report = normalizeReport(maybeEntry, snapshot, reportScore);
    return {
        id: `report-${generatedAt || Date.now()}`,
        prompt: REPORT_PROMPT_TEXT,
        report,
        generatedAt,
        reportScore,
        riskLevel: scoreStatus(reportScore),
        topRisk: topRiskFromMetrics(report.metricExplanations),
        metricsSnapshot: snapshot,
        remindersSnapshot: [],
    };
}

function readReportConversationHistory(): ReportHistoryEntry[] {
    try {
        const rawValue = localStorage.getItem(REPORT_CONVERSATION_KEY);
        const parsedValue = rawValue ? JSON.parse(rawValue) as unknown[] : [];
        if (Array.isArray(parsedValue) && parsedValue.length > 0) {
            return parsedValue
                .map((entry) => entryFromLegacyReport(entry, (entry as { generatedAt?: string })?.generatedAt ?? ""))
                .filter((entry): entry is ReportHistoryEntry => Boolean(entry));
        }
    } catch {
        // Fall back to shared report history below.
    }

    return readReportHistory<unknown>()
        .map((storedReport) => entryFromLegacyReport(storedReport.report, storedReport.generatedAt))
        .filter((entry): entry is ReportHistoryEntry => Boolean(entry));
}

function readSavedReport() {
    try {
        const parsedValue = readLatestReport<unknown>();
        if (!parsedValue) return null;
        return entryFromLegacyReport(parsedValue.report, parsedValue.generatedAt);
    } catch {
        return null;
    }
}

function saveReportConversationEntry(entry: ReportHistoryEntry) {
    const history = readReportConversationHistory();
    const nextHistory = [entry, ...history.filter((item) => item.id !== entry.id)].slice(0, 20);
    localStorage.setItem(REPORT_CONVERSATION_KEY, JSON.stringify(nextHistory));
    window.dispatchEvent(new Event("visionguard-storage-updated"));
    return nextHistory;
}

async function fetchCurrentMetrics() {
    const response = await fetch("http://127.0.0.1:5000/api/stats");
    if (!response.ok) {
        throw new Error("Unable to read the latest monitoring metrics.");
    }

    return response.json() as Promise<Record<string, unknown>>;
}

function buildSnapshotFromPayload(payload: Omit<ReportPayload, "metricsSnapshot">): MetricsSnapshot {
    return {
        blinkRate: payload.blinkRate,
        distanceCm: payload.distanceCm,
        brightnessLux: payload.brightnessLux,
        useTimeSeconds: payload.useTimeSeconds,
        sessionUseTimeSeconds: payload.sessionUseTimeSeconds,
        totalUseTimeSeconds: payload.totalUseTimeSeconds,
        eyeHealthScore: payload.eyeHealthScore,
        scoreLevel: payload.scoreLevel,
        isCalibrating: payload.isCalibrating,
        faceDetected: payload.faceDetected,
    };
}

async function buildReportPayload(liveMetrics?: EyeMetrics): Promise<ReportPayload> {
    let currentMetrics: Record<string, unknown> = {};
    try {
        currentMetrics = await fetchCurrentMetrics();
    } catch (error) {
        console.warn("Unable to read backend stats for report payload:", error);
    }

    const samples = readMetricSamples()
        .filter((sample) => !sample.isCalibrating)
        .sort((a, b) => b.timestamp - a.timestamp);
    const latest = samples[0];
    const reminderEvents = readReminderEvents();
    const remindersSnapshot = reminderEvents
        .sort((a, b) => b.triggeredAt - a.triggeredAt)
        .slice(0, 8);
    const dailyStats = readDailySummaries();
    const latestMetrics = readLatestMetrics();
    const normalizedLiveMetrics = liveMetrics ? normalizeMetrics(liveMetrics) : null;
    const normalizedCurrentMetrics = normalizeMetrics(currentMetrics);
    const previousReport = readLatestReport();
    const latestScore = numberOrNull(normalizedLiveMetrics?.eyeHealthScore)
        ?? numberOrNull(latestMetrics?.eyeHealthScore)
        ?? latest?.eyeHealthScore
        ?? numberOrNull(normalizedCurrentMetrics.eyeHealthScore)
        ?? null;
    const distanceCm = numberOrNull(normalizedLiveMetrics?.distanceCm)
        ?? numberOrNull(latestMetrics?.distanceCm)
        ?? latest?.distanceCm
        ?? numberOrNull(normalizedCurrentMetrics.distanceCm)
        ?? null;
    const brightnessLux = numberOrNull(normalizedLiveMetrics?.brightnessLux)
        ?? numberOrNull(latestMetrics?.brightnessLux)
        ?? latest?.brightnessLux
        ?? numberOrNull(normalizedCurrentMetrics.brightnessLux)
        ?? null;
    const scoreLevel = (normalizedLiveMetrics?.scoreLevel ?? latestMetrics?.scoreLevel ?? latest?.scoreLevel ?? normalizedCurrentMetrics.scoreLevel) as MetricStatus;

    const snapshotBase = {
        blinkRate: numberOrNull(normalizedLiveMetrics?.blinkRate) ?? numberOrNull(latestMetrics?.blinkRate) ?? latest?.blinkRate ?? numberOrNull(normalizedCurrentMetrics.blinkRate) ?? null,
        viewingDistance: distanceCm,
        distanceCm,
        brightness: brightnessLux,
        brightnessLux,
        useTimeSeconds: numberOrNull(normalizedLiveMetrics?.useTimeSeconds) ?? numberOrNull(latestMetrics?.useTimeSeconds) ?? latest?.useTimeSeconds ?? numberOrNull(normalizedCurrentMetrics.useTimeSeconds) ?? null,
        sessionUseTimeSeconds: numberOrNull(normalizedLiveMetrics?.sessionUseTimeSeconds) ?? numberOrNull(latestMetrics?.sessionUseTimeSeconds) ?? latest?.sessionUseTimeSeconds ?? numberOrNull(normalizedCurrentMetrics.sessionUseTimeSeconds) ?? null,
        totalUseTimeSeconds: numberOrNull(normalizedLiveMetrics?.totalUseTimeSeconds) ?? numberOrNull(latestMetrics?.totalUseTimeSeconds) ?? latest?.totalUseTimeSeconds ?? numberOrNull(normalizedCurrentMetrics.totalUseTimeSeconds) ?? null,
        eyeHealthScore: latestScore,
        scoreLevel,
        isCalibrating: normalizedLiveMetrics?.isCalibrating ?? latestMetrics?.isCalibrating ?? latest?.isCalibrating ?? normalizedCurrentMetrics.isCalibrating ?? false,
        faceDetected: normalizedLiveMetrics?.faceDetected ?? latestMetrics?.faceDetected ?? latest?.faceDetected ?? normalizedCurrentMetrics.faceDetected ?? false,
    };
    const snapshot = buildSnapshotFromPayload({
        ...snapshotBase,
        selectedDate: localDateKey(),
        remindersSnapshot,
        recentSamples: [],
        reminders: remindersSnapshot,
        latestMetrics,
        dailyStats,
        previousReport: null,
        todayReminderSummary: null,
        currentReminders: [],
        reminderCountByType: {},
        recurringIssues: [],
        improvedSignals: [],
    });
    const todayReminderSummary = buildTodayReminderSummary(reminderEvents, snapshot);

    const payloadWithoutSnapshot = {
        ...snapshotBase,
        selectedDate: localDateKey(),
        remindersSnapshot,
        recentSamples: samples.slice(0, 8),
        todayReminderSummary,
        currentReminders: remindersSnapshot.filter((reminder) => todayReminderSummary.currentActiveTypes.includes(reminder.type)).slice(0, 5),
        reminderCountByType: todayReminderSummary.countByType,
        recurringIssues: todayReminderSummary.recurringIssues,
        improvedSignals: todayReminderSummary.improvedSignals,
        reminders: remindersSnapshot,
        latestMetrics,
        dailyStats,
        previousReport: previousReport
            ? {
                generatedAt: previousReport.generatedAt,
                report: previousReport.report,
                contextOnly: true,
                note: "Historical context only. Use latestMetrics and eyeHealthScore as the current monitoring state. Do not describe previousReport as the current score.",
            }
            : null,
    };

    return {
        ...payloadWithoutSnapshot,
        metricsSnapshot: buildSnapshotFromPayload(payloadWithoutSnapshot),
    };
}

function ReportList({ title, items }: { title: string; items: string[] }) {
    return (
        <section className="report-section">
            <h3>{title}</h3>
            {items.length > 0 ? (
                <ul>
                    {items.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            ) : (
                <p>More detail will appear here after VisionGuard has enough monitoring history.</p>
            )}
        </section>
    );
}

function KeyMetricsTable({ metrics }: { metrics: MetricExplanation[] }) {
    return (
        <div className="report-table-wrap">
            <table className="report-metrics-table">
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Current Value</th>
                        <th>Recommended Range</th>
                        <th>Status</th>
                        <th>Meaning</th>
                    </tr>
                </thead>
                <tbody>
                    {metrics.map((metric) => (
                        <tr key={metric.metric}>
                            <td>{metric.metric === "blinkRate" ? "Blink Rate" : metric.metric === "distance" ? "Viewing Distance" : metric.metric === "brightness" ? "Brightness" : "Session Time"}</td>
                            <td>{metric.currentValue}</td>
                            <td>{metric.recommendedRange}</td>
                            <td>
                                <span className={`status-badge ${statusClassName(metric.status)}`}>{metric.status}</span>
                            </td>
                            <td>{metric.meaning}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ReportArticle({
    entry,
    currentScore,
    showGuide,
    reportTopRef,
    howToReadRef,
}: {
    entry: ReportHistoryEntry;
    currentScore: number | null;
    showGuide: boolean;
    reportTopRef: RefObject<HTMLDivElement | null>;
    howToReadRef: RefObject<HTMLDivElement | null>;
}) {
    const reportStatus = scoreStatus(entry.reportScore);
    const scoreChanged = currentScore !== null && Math.abs(currentScore - entry.reportScore) > 5;
    const behaviorReview = entry.report.trendInsight || summarizeReminderSnapshot(entry.remindersSnapshot, entry.metricsSnapshot);

    return (
        <>
        <div className="report-scroll-anchor" ref={reportTopRef} />
        <article className="report-article">
            <div className="report-overview">
                <div>
                    <p className="eyebrow">Report Snapshot</p>
                    <h2>{entry.reportScore} / 100</h2>
                    <p className="panel-helper">
                        This score was fixed when the report was generated.
                    </p>
                </div>
                <div className="report-overview-meta">
                    <span className={`status-badge ${statusClassName(reportStatus)}`}>Risk Level: {reportStatus}</span>
                    <span className="report-meta-pill">Generated at: {formatGeneratedAt(entry.generatedAt)}</span>
                    <span className="report-meta-pill">Data window: Latest monitoring data</span>
                </div>
            </div>

            {scoreChanged && (
                <div className="risk-notice highlighted report-stale-notice">
                    Your live monitoring score has changed since this report was generated. Generate a new report to refresh the analysis.
                </div>
            )}

            <section className="report-section report-summary">
                <h3>Executive Summary</h3>
                <p>{entry.report.summary}</p>
            </section>

            <section className="report-section">
                <h3>What this score means</h3>
                <p>{entry.report.scoreMeaning}</p>
            </section>

            <section className="report-section">
                <h3>Today’s Behavior Review</h3>
                <p>{behaviorReview}</p>
                {entry.report.whatIsGood.length > 0 && (
                    <ul>
                        {entry.report.whatIsGood.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="report-section">
                <h3>Key Signals</h3>
                <KeyMetricsTable metrics={entry.report.metricExplanations} />
            </section>

            <section className="report-section">
                <h3>Main Pattern</h3>
                <p>{entry.report.mainIssue}</p>
            </section>

            <ReportList title="What Needs Attention" items={entry.report.needsAttention} />

            <section className="report-section">
                <h3>Action Plan</h3>
                <div className="report-action-grid">
                    <ReportList title="Do now" items={entry.report.actionPlan.doNow} />
                    <ReportList title="Improve today" items={entry.report.actionPlan.improveToday} />
                    <ReportList title="Long-term habits" items={entry.report.actionPlan.longTermHabits} />
                </div>
            </section>

            {showGuide && (
                <>
                <div className="report-scroll-anchor" ref={howToReadRef} />
                <section className="report-section">
                    <h3>How to read this report</h3>
                    <ul>
                        <li>Score is a screen-use behavior guide, not a diagnosis.</li>
                        <li>Higher scores mean blinking, distance, lighting, and break rhythm are closer to recommended ranges.</li>
                        <li>Low scores mean one or more signals are outside comfortable ranges long enough to need attention.</li>
                        <li>Blink rate describes dryness risk, distance describes screen proximity, brightness describes lighting comfort, and session time describes break rhythm.</li>
                    </ul>
                </section>
                </>
            )}

            <section className="report-section">
                <h3>Prevention tips</h3>
                <ul>
                    {entry.report.preventionTips.map((tip) => (
                        <li key={tip}>{tip}</li>
                    ))}
                </ul>
            </section>

            <div className="risk-notice highlighted report-disclaimer">
                {entry.report.disclaimer}
            </div>
        </article>
        </>
    );
}

function ReportPage({ onOpenSettings }: ReportPageProps) {
    const { metrics, isMonitoring } = useMonitoring();
    const username = localStorage.getItem("visionguard_username") || "Katherine";
    const userInitial = username.charAt(0).toUpperCase();
    const [reportConversation, setReportConversation] = useState(readReportConversationHistory);
    const [latestSharedMetrics, setLatestSharedMetrics] = useState(readLatestMetrics);
    const [selectedReportId, setSelectedReportId] = useState(() => readSavedReport()?.id ?? "");
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState("");
    const [showGuide, setShowGuide] = useState(false);
    const [hasMonitoringData, setHasMonitoringData] = useState(() => readMetricSamples().some((sample) => !sample.isCalibrating));
    const reportTopRef = useRef<HTMLDivElement | null>(null);
    const howToReadRef = useRef<HTMLDivElement | null>(null);
    const currentScore = isMonitoring
        ? metrics.eyeHealthScore
        : numberOrNull(latestSharedMetrics?.eyeHealthScore) ?? numberOrNull(metrics.eyeHealthScore);

    const scrollToReportTop = () => {
        reportTopRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    };

    const scrollToHowToRead = () => {
        howToReadRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    };

    useEffect(() => {
        const refreshSavedReport = () => {
            setLatestSharedMetrics(readLatestMetrics());
            setReportConversation(readReportConversationHistory());
            setHasMonitoringData(readMetricSamples().some((sample) => !sample.isCalibrating));
        };

        refreshSavedReport();
        return subscribeLocalData(refreshSavedReport);
    }, []);

    useEffect(() => {
        if (reportConversation.length === 0) {
            setSelectedReportId("");
            return;
        }
        if (!selectedReportId || !reportConversation.some((entry) => entry.id === selectedReportId)) {
            setSelectedReportId(reportConversation[0].id);
        }
    }, [reportConversation, selectedReportId]);

    const selectedReport = useMemo(
        () => reportConversation.find((entry) => entry.id === selectedReportId) ?? reportConversation[0] ?? null,
        [reportConversation, selectedReportId],
    );

    const handleHowToRead = () => {
        setShowGuide(true);
        setTimeout(scrollToHowToRead, 80);
    };

    const handleSelectReport = (reportId: string) => {
        setSelectedReportId(reportId);
        setTimeout(scrollToReportTop, 80);
    };

    const handleGenerateReport = async () => {
        if (loading) return;
        setLoading(true);
        setNotice("");

        try {
            const payload = await buildReportPayload(metrics);
            setHasMonitoringData(payload.recentSamples.length > 0);
            console.log("REPORT PAYLOAD", payload);

            const response = await fetch("http://127.0.0.1:5000/api/report", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json() as ReportResponse;
            console.log("REPORT RESPONSE", data);

            if (data.report) {
                const nextGeneratedAt = new Date().toISOString();
                const reportScore = payload.eyeHealthScore ?? numberOrNull(data.report.score) ?? 0;
                const normalizedReport = normalizeReport(data.report, payload.metricsSnapshot, Math.round(reportScore));
                const nextEntry: ReportHistoryEntry = {
                    id: `report-${Date.now()}`,
                    prompt: REPORT_PROMPT_TEXT,
                    report: normalizedReport,
                    generatedAt: nextGeneratedAt,
                    reportScore: Math.round(reportScore),
                    riskLevel: riskLevelFromReport(data.report, Math.round(reportScore)),
                    topRisk: topRiskFromMetrics(normalizedReport.metricExplanations),
                    metricsSnapshot: payload.metricsSnapshot,
                    remindersSnapshot: payload.remindersSnapshot,
                };

                setNotice(data.success ? "" : "The report was generated with backup guidance and saved here.");

                try {
                    saveLatestReport(nextEntry, nextGeneratedAt);
                    const nextHistory = saveReportConversationEntry(nextEntry);
                    setReportConversation(nextHistory);
                    setSelectedReportId(nextEntry.id);
                    setTimeout(scrollToReportTop, 100);
                } catch (storageError) {
                    console.warn("Failed to save report locally:", storageError);
                    setReportConversation((history) => [nextEntry, ...history.filter((item) => item.id !== nextEntry.id)].slice(0, 20));
                    setSelectedReportId(nextEntry.id);
                    setTimeout(scrollToReportTop, 100);
                }

                return;
            }

            setNotice("The report could not connect right now. Your previous report will stay available here.");
        } catch {
            setNotice("The report could not connect right now. Your previous report will stay available here.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard-shell">
            <Sidebar onOpenSettings={onOpenSettings} />

            <main className="dashboard-main">
                <TopBar username={username} />

                <div className="dashboard-content report-page-content">
                    <section className="panel report-hero-panel">
                        <div className="panel-header report-page-header">
                            <div>
                                <p className="eyebrow">AI report</p>
                                <h2>AI Eye-Care Report</h2>
                                <p className="panel-helper">
                                    Generated from your VisionGuard monitoring data.
                                </p>
                            </div>
                            <div className="report-header-actions">
                                <button className="secondary-button" onClick={handleHowToRead} type="button">
                                    How to read this report
                                </button>
                                <button className="primary-button report-button" disabled={loading} onClick={handleGenerateReport} type="button">
                                    {loading ? "Generating..." : selectedReport ? "Regenerate report" : "Generate report"}
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className="panel report-workspace">
                        <div className="report-user-prompt">
                            <div className="report-user-bubble">Generate my eye health report</div>
                            <div className="report-user-avatar">{userInitial}</div>
                        </div>

                        {!selectedReport && !loading && (
                            <article className="report-empty-state">
                                {hasMonitoringData
                                    ? "Generate your report when you are ready. Your latest monitoring pattern will be used."
                                    : "No monitoring history is available yet. You can still generate a starter report, and it will become more useful after a short monitoring session."}
                            </article>
                        )}

                        {loading && (
                            <article className="report-empty-state">
                                Generating a new report from your latest monitoring data...
                            </article>
                        )}

                        {notice && (
                            <div className="risk-notice highlighted report-stale-notice">
                                {notice}
                            </div>
                        )}

                        {selectedReport && (
                            <ReportArticle
                                currentScore={currentScore}
                                entry={selectedReport}
                                howToReadRef={howToReadRef}
                                reportTopRef={reportTopRef}
                                showGuide={showGuide}
                            />
                        )}

                        <div className="report-footer-actions">
                            <Link className="secondary-button report-trend-link" to="/trend">
                                View trend details
                            </Link>
                            <button className="primary-button report-button" disabled={loading} onClick={handleGenerateReport} type="button">
                                {loading ? "Generating..." : "Generate new report"}
                            </button>
                        </div>
                    </section>

                    <section className="panel report-history-panel">
                        <details>
                            <summary>Report History</summary>
                            <div className="report-history-list">
                                {reportConversation.length > 0 ? reportConversation.map((entry) => (
                                    <button
                                        className={`report-history-item ${entry.id === selectedReport?.id ? "is-active" : ""}`}
                                        key={entry.id}
                                        onClick={() => handleSelectReport(entry.id)}
                                        type="button"
                                    >
                                        <span>{formatGeneratedAt(entry.generatedAt)}</span>
                                        <strong>{entry.reportScore}/100</strong>
                                        <span>{entry.riskLevel}</span>
                                        <span>{entry.topRisk}</span>
                                    </button>
                                )) : (
                                    <p className="panel-helper">Generated reports will appear here.</p>
                                )}
                            </div>
                        </details>
                    </section>
                </div>
            </main>
        </div>
    );
}

export default ReportPage;
