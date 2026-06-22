import type { EyeMetrics } from "../types/metrics";
import type { Reminder } from "../types/reminder";
import { localDateKey } from "./dateUtils";
import {
    appendMetricSample,
    createMetricSample,
    readMetricSamples as readSharedMetricSamples,
    samplesForDate as sharedSamplesForDate,
    type MetricSample,
} from "./localData";
import type { RiskItem } from "./riskEngine";

export type { MetricSample } from "./localData";

export function dateKey(timestamp = Date.now()) {
    return localDateKey(timestamp);
}

export function metricSampleDisplayDate(sample: MetricSample) {
    return localDateKey(sample.timestamp);
}

export function readMetricSamples(): MetricSample[] {
    return readSharedMetricSamples();
}

export function saveMetricSample(
    userId: string,
    metrics: EyeMetrics,
    risks: RiskItem[],
    reminders: Reminder[],
    timestamp = Date.now(),
) {
    return appendMetricSample(createMetricSample(userId, metrics, risks, reminders, timestamp));
}

export function samplesForDate(date: string) {
    return sharedSamplesForDate(date);
}
