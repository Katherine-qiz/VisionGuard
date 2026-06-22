import type { ReminderEvent, ReminderType } from "../types/reminder";
import { localDateKey } from "./dateUtils";
import {
    readMetricSamples,
    readReminderEvents,
    type MetricSample,
} from "./localData";

const riskTypes: ReminderType[] = ["blink", "distance", "brightness", "use_time", "face"];
const REMINDER_DEDUPE_WINDOW_MS = 5 * 60 * 1000;

export type TrendDaySummary = {
    date: string;
    hasData: boolean;
    avgScore: number | null;
    totalUseTimeSeconds: number | null;
    avgBlinkRate: number | null;
    avgDistance: number | null;
    avgBrightness: number | null;
    reminderCount: number | null;
    mostCommonRisk: ReminderType | "none" | null;
};

export type MetricTrends = {
    score: Array<{ date: string; value: number | null }>;
    blinkRate: Array<{ date: string; value: number | null }>;
    distance: Array<{ date: string; value: number | null }>;
    brightness: Array<{ date: string; value: number | null }>;
    useTime: Array<{ date: string; value: number | null }>;
};

export type TrendViewModel = {
    selectedDate: string;
    selectedDateSamples: MetricSample[];
    selectedDateReminders: ReminderEvent[];
    selectedSummary: TrendDaySummary;
    last7DaysSummary: TrendDaySummary[];
    riskBreakdown7Days: Array<{
        type: ReminderType;
        count: number;
        label: string;
        isCapped: boolean;
    }>;
    metricTrends: MetricTrends;
    weeklyReview: {
        mainRisk: ReminderType | "none";
        avgScore: number | null;
        totalUseTimeSeconds: number;
        text: string;
    };
};

export function lastSevenLocalDates(anchorTimestamp = Date.now()) {
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(anchorTimestamp);
        date.setDate(date.getDate() - (6 - index));
        return localDateKey(date.getTime());
    });
}

function sampleDate(sample: MetricSample) {
    return localDateKey(sample.timestamp);
}

function reminderDate(event: ReminderEvent) {
    return localDateKey(event.triggeredAt);
}

function sampleUseTimeSeconds(sample: MetricSample) {
    return sample.totalUseTimeSeconds ?? sample.activeScreenTimeSeconds ?? 0;
}

function average(values: number[]) {
    if (values.length === 0) return null;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function mostCommonRisk(events: ReminderEvent[]) {
    if (events.length === 0) return "none";
    const counts = events.reduce<Partial<Record<ReminderType, number>>>((acc, event) => {
        acc[event.type] = (acc[event.type] ?? 0) + 1;
        return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as ReminderType | undefined ?? "none";
}

export function dedupeReminderEvents(events: ReminderEvent[]) {
    const sortedEvents = [...events].sort((a, b) => b.triggeredAt - a.triggeredAt);
    const seen = new Set<string>();
    const dedupedEvents: ReminderEvent[] = [];

    sortedEvents.forEach((event) => {
        const windowKey = Math.floor(event.triggeredAt / REMINDER_DEDUPE_WINDOW_MS);
        const key = `${event.type}-${event.title}-${event.level}-${windowKey}`;
        if (seen.has(key)) return;
        seen.add(key);
        dedupedEvents.push(event);
    });

    return dedupedEvents;
}

function buildDaySummary(date: string, samples: MetricSample[], reminders: ReminderEvent[]): TrendDaySummary {
    const daySamples = samples
        .filter((sample) => !sample.isCalibrating)
        .filter((sample) => sampleDate(sample) === date);
    const dayReminders = dedupeReminderEvents(reminders.filter((event) => reminderDate(event) === date));
    const totalUseTimeSeconds = daySamples.length > 0
        ? Math.max(...daySamples.map(sampleUseTimeSeconds))
        : null;

    return {
        date,
        hasData: daySamples.length > 0,
        avgScore: average(daySamples.map((sample) => sample.eyeHealthScore)),
        totalUseTimeSeconds,
        avgBlinkRate: average(daySamples.map((sample) => sample.blinkRate)),
        avgDistance: average(daySamples.map((sample) => sample.distanceCm)),
        avgBrightness: average(daySamples.map((sample) => sample.brightnessLux)),
        reminderCount: daySamples.length > 0 ? dayReminders.length : null,
        mostCommonRisk: daySamples.length > 0 ? mostCommonRisk(dayReminders) : null,
    };
}

function buildRiskBreakdown(events: ReminderEvent[]) {
    const counts = events.reduce<Partial<Record<ReminderType, number>>>((acc, event) => {
        acc[event.type] = (acc[event.type] ?? 0) + 1;
        return acc;
    }, {});

    return riskTypes.map((type) => {
        const count = counts[type] ?? 0;
        const isCapped = count > 50;
        return {
            type,
            count: isCapped ? 50 : count,
            label: isCapped ? "50+ · Data reset recommended" : String(count),
            isCapped,
        };
    });
}

function buildMetricTrends(last7DaysSummary: TrendDaySummary[]): MetricTrends {
    return {
        score: last7DaysSummary.map((day) => ({ date: day.date, value: day.avgScore })),
        blinkRate: last7DaysSummary.map((day) => ({ date: day.date, value: day.avgBlinkRate })),
        distance: last7DaysSummary.map((day) => ({ date: day.date, value: day.avgDistance })),
        brightness: last7DaysSummary.map((day) => ({ date: day.date, value: day.avgBrightness })),
        useTime: last7DaysSummary.map((day) => ({
            date: day.date,
            value: day.totalUseTimeSeconds === null ? null : Math.round(day.totalUseTimeSeconds / 60),
        })),
    };
}

function buildWeeklyReview(last7DaysSummary: TrendDaySummary[], riskBreakdown7Days: TrendViewModel["riskBreakdown7Days"]) {
    const scoreValues = last7DaysSummary
        .map((day) => day.avgScore)
        .filter((score): score is number => score !== null);
    const avgScore = average(scoreValues);
    const totalUseTimeSeconds = last7DaysSummary.reduce((sum, day) => sum + (day.totalUseTimeSeconds ?? 0), 0);
    const mainRisk = riskBreakdown7Days
        .filter((risk) => risk.count > 0)
        .sort((a, b) => b.count - a.count)[0]?.type ?? "none";

    if (scoreValues.length === 0) {
        return {
            mainRisk,
            avgScore,
            totalUseTimeSeconds,
            text: "Start monitoring to generate your weekly eye-care review.",
        };
    }

    const copy: Record<ReminderType | "none", string> = {
        blink: "Your blink rate was the main area that needs attention this week. Try intentional blinking during longer reading or coding sessions.",
        distance: "You were often close to the screen this week. Keep your screen about 50-100 cm from your eyes.",
        brightness: "Lighting was the main pattern to improve this week. Avoid dim environments and reduce glare where possible.",
        use_time: "Long continuous sessions were the main pattern this week. Try shorter focus blocks with regular 20-second breaks.",
        face: "Camera visibility was the main issue this week. Keep your face visible so VisionGuard can estimate habits accurately.",
        none: avgScore !== null && avgScore >= 85
            ? "Your weekly pattern looks comfortable. Keep your distance, blinking, and break rhythm steady."
            : "VisionGuard has not found one dominant risk pattern yet. Keep monitoring to build a clearer weekly review.",
    };

    return {
        mainRisk,
        avgScore,
        totalUseTimeSeconds,
        text: copy[mainRisk],
    };
}

export function buildTrendViewModel(selectedDate: string): TrendViewModel {
    const samples = readMetricSamples().filter((sample) => !sample.isCalibrating);
    const reminders = dedupeReminderEvents(readReminderEvents());
    const last7Dates = lastSevenLocalDates();
    const last7DateSet = new Set(last7Dates);
    const selectedDateSamples = samples.filter((sample) => sampleDate(sample) === selectedDate);
    const selectedDateReminders = reminders.filter((event) => reminderDate(event) === selectedDate);
    const last7DaysSummary = last7Dates.map((date) => buildDaySummary(date, samples, reminders));
    const last7Reminders = reminders.filter((event) => last7DateSet.has(reminderDate(event)));
    const riskBreakdown7Days = buildRiskBreakdown(last7Reminders);

    return {
        selectedDate,
        selectedDateSamples,
        selectedDateReminders,
        selectedSummary: buildDaySummary(selectedDate, samples, reminders),
        last7DaysSummary,
        riskBreakdown7Days,
        metricTrends: buildMetricTrends(last7DaysSummary),
        weeklyReview: buildWeeklyReview(last7DaysSummary, riskBreakdown7Days),
    };
}
