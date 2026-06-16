import { useEffect, useMemo, useState } from "react";

import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import type { MetricSample } from "../utils/metricsStorage";
import { metricSampleDisplayDate, readMetricSamples } from "../utils/metricsStorage";
import { readReminderEvents, reminderEventDisplayDate } from "../utils/reminderStorage";
import type { ReminderEvent, ReminderType } from "../types/reminder";
import { getCurrentUserId } from "../utils/user";
import { localDateKey, utcDateKey } from "../utils/dateUtils";

const riskTypes: ReminderType[] = ["use_time", "distance", "blink", "brightness", "face"];

function lastSevenDates() {
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - index);
        return localDateKey(date.getTime());
    }).reverse();
}

function getLatestSampleDisplayDateInRange(samples: MetricSample[], dates: string[]) {
    const dateSet = new Set(dates);
    const latestSample = samples
        .filter((sample) => dateSet.has(metricSampleDisplayDate(sample)))
        .sort((a, b) => b.timestamp - a.timestamp)[0];

    return latestSample ? metricSampleDisplayDate(latestSample) : localDateKey();
}

function average(values: number[]) {
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function averageOrNull(values: number[]) {
    if (values.length === 0) return null;
    return average(values);
}

function sampleUseTimeSeconds(sample: MetricSample) {
    return Math.max(
        sample.activeScreenTimeSeconds ?? 0,
        sample.continuousUseTimeSeconds ?? 0,
        sample.useTimeSeconds ?? 0,
    );
}

function mostCommonRisk(events: ReminderEvent[]) {
    if (events.length === 0) return "none";

    const counts = events.reduce<Record<string, number>>((acc, event) => {
        acc[event.type] = (acc[event.type] ?? 0) + 1;
        return acc;
    }, {});

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";
}

type TrendRow = {
    date: string;
    score: number | null;
    useTime: number | null;
    alertCount: number;
    blinkRate: number | null;
    distance: number | null;
    brightness: number | null;
};

type TrendSummary = {
    avgScore: number;
    totalUseTime: number;
    avgBlinkRate: number;
    avgDistance: number;
    alertCount: number;
    mostCommonRisk: string;
};

function averageFromNullable(values: Array<number | null>) {
    const actualValues = values.filter((value): value is number => value !== null);
    return actualValues.length > 0 ? average(actualValues) : null;
}

function dominantRiskFromRows(rows: TrendRow[]): ReminderType | "none" {
    const avgBlinkRate = averageFromNullable(rows.map((row) => row.blinkRate));
    const avgUseTime = averageFromNullable(rows.map((row) => row.useTime));
    const avgDistance = averageFromNullable(rows.map((row) => row.distance));
    const avgBrightness = averageFromNullable(rows.map((row) => row.brightness));

    if (avgBlinkRate !== null && avgBlinkRate < 8) return "blink";
    if (avgUseTime !== null && avgUseTime >= 25) return "use_time";
    if (avgDistance !== null && avgDistance > 0 && avgDistance < 40) return "distance";
    if (avgBrightness !== null && (avgBrightness < 100 || avgBrightness > 1000)) return "brightness";

    return "none";
}

function buildWeeklyReview({
    sevenDayRows,
    selectedEvents,
    summary,
}: {
    sevenDayRows: TrendRow[];
    selectedSamples: MetricSample[];
    selectedEvents: ReminderEvent[];
    summary: TrendSummary;
}) {
    const sevenDayScores = sevenDayRows
        .map((row) => row.score)
        .filter((score): score is number => score !== null);

    if (sevenDayScores.length === 0) {
        return "Start monitoring for at least a few seconds to build your local trend history.";
    }

    const avgScore = average(sevenDayScores);
    const eventRisk = mostCommonRisk(selectedEvents);
    const rowRisk = dominantRiskFromRows(sevenDayRows);
    const mainRisk = eventRisk !== "none" ? eventRisk : rowRisk;

    if (avgScore >= 80 && mainRisk === "none") {
        return "Your eye-care habits look stable this week. Screen distance and lighting stayed mostly comfortable. Keep your break rhythm consistent.";
    }

    if (mainRisk === "blink") {
        return "Your blink rate was the main area that needs attention this week. Try intentional blinking during longer screen sessions, especially when focusing on reading or coding.";
    }

    if (mainRisk === "use_time") {
        return "Continuous screen time is building up. Try taking a short visual break every 20 minutes to avoid long uninterrupted sessions.";
    }

    if (mainRisk === "distance") {
        return "Your viewing distance was sometimes too close. Keeping the screen around an arm's length away can make your screen-use posture more comfortable.";
    }

    if (mainRisk === "brightness") {
        return "Lighting conditions fluctuated this week. Try to keep ambient light comfortable and reduce glare from overhead lights or windows.";
    }

    if (summary.mostCommonRisk !== "none") {
        return `Your ${summary.mostCommonRisk.replace("_", " ")} pattern needs the most attention. Small adjustments during daily work sessions can make the week feel easier on your eyes.`;
    }

    return "VisionGuard has not found a dominant risk pattern yet. Keep monitoring to build a clearer weekly review.";
}

function MetricTrendChart({
    title,
    rows,
    valueKey,
    scaleMax,
    targetText,
    guidance,
    statusForValue,
    unit = "",
}: {
    title: string;
    rows: Array<{ date: string; score: number | null; useTime: number | null; alertCount: number; blinkRate: number | null; distance: number | null; brightness: number | null }>;
    valueKey: "score" | "useTime" | "blinkRate" | "distance" | "brightness";
    scaleMax: number;
    targetText: string;
    guidance: string;
    statusForValue: (value: number | null) => "Good" | "Attention" | "Warning" | "No data";
    unit?: string;
}) {
    const values = rows.map((row) => row[valueKey]);
    const latestValue = [...values].reverse().find((value) => value !== null) ?? null;
    const status = statusForValue(latestValue);
    const statusClass = status === "Good"
        ? "good-status"
        : status === "Attention"
          ? "attention-status"
          : status === "Warning"
            ? "warning-status"
            : "neutral-status";

    return (
        <div className="trend-chart">
            <div className="trend-chart-header">
                <div>
                    <strong>{title}</strong>
                    <p>
                        {targetText} · Current {latestValue === null ? "No data" : `${latestValue}${unit}`}
                    </p>
                </div>
                <span className={`status-badge ${statusClass}`}>{status}</span>
            </div>
            <div className="trend-chart-bars">
                {rows.map((row) => (
                    <div className="trend-chart-bar" key={`${title}-${row.date}`}>
                        {row[valueKey] === null ? (
                            <span className="trend-chart-empty">No data</span>
                        ) : (
                            <span style={{ height: `${Math.max(8, Math.min(100, (row[valueKey] / scaleMax) * 100))}%` }} />
                        )}
                        <small>{row.date.slice(5)}</small>
                    </div>
                ))}
            </div>
            <p className="trend-chart-guidance">{guidance}</p>
        </div>
    );
}

function TrendPage() {
    const [samples, setSamples] = useState<MetricSample[]>([]);
    const [events, setEvents] = useState<ReminderEvent[]>([]);
    const [selectedDate, setSelectedDate] = useState(localDateKey());
    const [hasUserSelectedDate, setHasUserSelectedDate] = useState(false);
    const username = localStorage.getItem("visionguard_username") || "Katherine";
    const [debugUserId, setDebugUserId] = useState(getCurrentUserId());
    const dates = useMemo(lastSevenDates, []);

    const refreshTrendData = () => {
        const currentUserId = getCurrentUserId();
        setDebugUserId(currentUserId);
        setSamples(readMetricSamples().filter((sample) => sample.userId === currentUserId));
        setEvents(readReminderEvents().filter((event) => event.userId === currentUserId));
    };

    const migrateLocalDatesToLocalTimezone = () => {
        const migratedSamples = readMetricSamples().map((sample) => ({
            ...sample,
            date: localDateKey(sample.timestamp),
        }));
        localStorage.setItem("visionguard_metric_samples", JSON.stringify(migratedSamples));

        const migratedEvents = readReminderEvents().map((event) => ({
            ...event,
            date: localDateKey(event.triggeredAt),
        }));
        localStorage.setItem("visionguard_reminder_events", JSON.stringify(migratedEvents));
        window.dispatchEvent(new Event("visionguard-storage-updated"));
        refreshTrendData();
    };

    useEffect(() => {
        refreshTrendData();
        const intervalId = window.setInterval(refreshTrendData, 5000);
        window.addEventListener("focus", refreshTrendData);
        window.addEventListener("storage", refreshTrendData);
        window.addEventListener("visionguard-storage-updated", refreshTrendData);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", refreshTrendData);
            window.removeEventListener("storage", refreshTrendData);
            window.removeEventListener("visionguard-storage-updated", refreshTrendData);
        };
    }, []);

    useEffect(() => {
        if (hasUserSelectedDate || samples.length === 0) return;

        const selectedDateHasSamples = samples.some((sample) => metricSampleDisplayDate(sample) === selectedDate);
        if (selectedDateHasSamples) return;

        const nextSelectedDate = getLatestSampleDisplayDateInRange(samples, dates);
        if (nextSelectedDate !== selectedDate) {
            setSelectedDate(nextSelectedDate);
        }
    }, [dates, hasUserSelectedDate, samples, selectedDate]);

    const sevenDayDateSet = useMemo(() => new Set(dates), [dates]);
    const sevenDayEvents = events.filter((event) => sevenDayDateSet.has(reminderEventDisplayDate(event)));
    const selectedSamples = samples.filter((sample) => metricSampleDisplayDate(sample) === selectedDate);
    const selectedEvents = events.filter((event) => reminderEventDisplayDate(event) === selectedDate);
    const summary = {
        avgScore: average(selectedSamples.map((sample) => sample.eyeHealthScore)),
        totalUseTime: Math.max(0, ...selectedSamples.map(sampleUseTimeSeconds)),
        avgBlinkRate: average(selectedSamples.map((sample) => sample.blinkRate)),
        avgDistance: average(selectedSamples.map((sample) => sample.distanceCm)),
        alertCount: selectedEvents.length,
        mostCommonRisk: mostCommonRisk(selectedEvents),
    };
    const riskBreakdown = riskTypes.map((type) => ({
        type,
        count: sevenDayEvents.filter((event) => event.type === type).length,
    }));
    const sevenDayRows = dates.map((date) => {
        const daySamples = samples.filter((sample) => metricSampleDisplayDate(sample) === date);
        const dayEvents = events.filter((event) => reminderEventDisplayDate(event) === date);

        return {
            date,
            score: averageOrNull(daySamples.map((sample) => sample.eyeHealthScore)),
            useTime: daySamples.length > 0 ? Math.round(Math.max(...daySamples.map(sampleUseTimeSeconds)) / 60) : null,
            alertCount: dayEvents.length,
            blinkRate: averageOrNull(daySamples.map((sample) => sample.blinkRate)),
            distance: averageOrNull(daySamples.map((sample) => sample.distanceCm)),
            brightness: averageOrNull(daySamples.map((sample) => sample.brightnessLux)),
        };
    });
    const weeklyReview = buildWeeklyReview({
        sevenDayRows,
        selectedSamples,
        selectedEvents: sevenDayEvents,
        summary,
    });
    const latestSample = [...samples].sort((a, b) => b.timestamp - a.timestamp)[0];
    const latestEvent = [...events].sort((a, b) => b.triggeredAt - a.triggeredAt)[0];
    const hasSevenDaySamples = sevenDayRows.some((row) => row.score !== null);

    const clearLocalDemoData = () => {
        localStorage.removeItem("visionguard_metric_samples");
        localStorage.removeItem("visionguard_daily_summaries");
        localStorage.removeItem("visionguard_reminder_events");
        sessionStorage.removeItem("visionguard_sustained_state");
        localStorage.removeItem("visionguard_card_reminder_cooldowns");
        localStorage.removeItem("visionguard_reminder_cooldowns");
        refreshTrendData();
    };

    return (
        <div className="dashboard-shell">
            <Sidebar />

            <main className="dashboard-main">
                <TopBar username={username} />

                <div className="dashboard-content trend-page-content">
                    <section className="panel trend-guide-card">
                        <div className="panel-header compact">
                            <div>
                                <p className="eyebrow">Guide</p>
                                <h2>How to read your trends</h2>
                                <p className="panel-helper">VisionGuard summarizes your screen-use habits from four signals.</p>
                            </div>
                            <button className="secondary-button compact-action" onClick={clearLocalDemoData} type="button">
                                Clear Local Demo Data
                            </button>
                            <button className="secondary-button compact-action" onClick={migrateLocalDatesToLocalTimezone} type="button">
                                Fix Local Dates
                            </button>
                        </div>
                        <div className="trend-guide-card-grid">
                            <article className="trend-guide-item">
                                <div>
                                    <div className="trend-guide-title">
                                        <span aria-hidden="true">📏</span>
                                        <strong>Viewing Distance</strong>
                                    </div>
                                    <span className="guide-target-badge">Target: 50–100 cm</span>
                                    <p>Keep your screen about an arm's length away.</p>
                                </div>
                            </article>
                            <article className="trend-guide-item">
                                <div>
                                    <div className="trend-guide-title">
                                        <span aria-hidden="true">👀</span>
                                        <strong>Blink Rate</strong>
                                    </div>
                                    <span className="guide-target-badge">Target: ≥12 / min</span>
                                    <p>Low blink rate may increase dryness during screen use.</p>
                                </div>
                            </article>
                            <article className="trend-guide-item">
                                <div>
                                    <div className="trend-guide-title">
                                        <span aria-hidden="true">🌿</span>
                                        <strong>Break Rhythm</strong>
                                    </div>
                                    <span className="guide-target-badge">Target: every 20 min</span>
                                    <p>Take short visual breaks before long sessions build up.</p>
                                </div>
                            </article>
                            <article className="trend-guide-item">
                                <div>
                                    <div className="trend-guide-title">
                                        <span aria-hidden="true">💡</span>
                                        <strong>Lighting</strong>
                                    </div>
                                    <span className="guide-target-badge">Target: 200–750 lux</span>
                                    <p>Avoid very dim light or strong glare.</p>
                                </div>
                            </article>
                        </div>
                        <p className="trend-light-legend">
                            Green means comfortable, orange means attention, and red means a pattern worth improving.
                        </p>
                    </section>
                    <section className="panel trend-overview-panel">
                        <div className="panel-header">
                            <div>
                                <p className="eyebrow">Selected Date Summary</p>
                                <h2>{selectedDate}</h2>
                                <p className="panel-helper">Samples and reminder events for the selected date only.</p>
                            </div>
                        </div>

                        <div className="date-chip-row" aria-label="Select trend date">
                            {dates.map((date) => (
                                <button
                                    className={`date-chip${date === selectedDate ? " active" : ""}`}
                                    key={date}
                                    onClick={() => {
                                        setHasUserSelectedDate(true);
                                        setSelectedDate(date);
                                    }}
                                    type="button"
                                >
                                    <span>{new Date(date).toLocaleDateString("en-US", { weekday: "short" })}</span>
                                    <strong>{date.slice(5)}</strong>
                                </button>
                            ))}
                        </div>

                        {selectedSamples.length > 0 ? (
                            <div className="trend-summary-grid">
                                <div><span>Avg Score</span><strong>{summary.avgScore}</strong></div>
                                <div><span>Total Use Time</span><strong>{Math.round(summary.totalUseTime / 60)} min</strong></div>
                                <div><span>Avg Blink Rate</span><strong>{summary.avgBlinkRate}/min</strong></div>
                                <div><span>Avg Distance</span><strong>{summary.avgDistance} cm</strong></div>
                                <div><span>Alert Count</span><strong>{summary.alertCount}</strong></div>
                                <div><span>Most Common Risk</span><strong>{summary.mostCommonRisk}</strong></div>
                            </div>
                        ) : (
                            <div className="empty-state">No saved monitoring samples for this date.</div>
                        )}

                        {selectedEvents.length === 0 && (
                            <div className="empty-state">No reminder events for this date.</div>
                        )}
                    </section>

                    <section className="dashboard-bottom-grid">
                        <section className="panel">
                            <div className="panel-header compact">
                                <div>
                                    <p className="eyebrow">Last 7 Days</p>
                                    <h2>Score, Use Time, Alerts</h2>
                                </div>
                            </div>
                            <div className="trend-table">
                                {sevenDayRows.map((row) => (
                                    <div className="trend-row" key={row.date}>
                                        <span>{row.date.slice(5)}</span>
                                        <strong>{row.score === null ? "No data" : `Score ${row.score}`}</strong>
                                        <span>{row.useTime === null ? "No data" : `${row.useTime} min`}</span>
                                        <span>{row.score === null ? "No data" : `${row.alertCount} alerts`}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="panel trend-events-card">
                            <div className="panel-header compact">
                                <div>
                                    <p className="eyebrow">7-day Risk Breakdown</p>
                                    <h2>Reminder Events</h2>
                                    <p className="panel-helper">
                                        {sevenDayEvents.length > 0
                                            ? "Based on reminder events saved in the last 7 days."
                                            : "No reminder events saved in the last 7 days."}
                                    </p>
                                </div>
                            </div>

                            <div className="risk-breakdown">
                                {riskBreakdown.map((item) => (
                                    <div key={item.type}>
                                        <span>{item.type}</span>
                                        <strong>{item.count}</strong>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </section>

                    <section className="panel">
                        <div className="panel-header compact">
                            <div>
                                <p className="eyebrow">Metric Trends</p>
                                <h2>Last 7 Days</h2>
                            </div>
                        </div>

                        {hasSevenDaySamples ? (
                            <div className="metric-trend-grid">
                                <MetricTrendChart
                                    title="Eye Health Score Trend"
                                    rows={sevenDayRows}
                                    valueKey="score"
                                    scaleMax={100}
                                    targetText="Target 80+"
                                    guidance="Higher score means healthier screen-use habits."
                                    statusForValue={(value) => value === null ? "No data" : value >= 80 ? "Good" : value >= 60 ? "Attention" : "Warning"}
                                />
                                <MetricTrendChart
                                    title="Blink Rate Trend"
                                    rows={sevenDayRows}
                                    valueKey="blinkRate"
                                    scaleMax={20}
                                    targetText="Attention < 12/min, Warning < 8/min"
                                    guidance="Low blink rate may increase dryness. Try intentional blinking."
                                    statusForValue={(value) => value === null ? "No data" : value >= 12 ? "Good" : value >= 8 ? "Attention" : "Warning"}
                                    unit="/min"
                                />
                                <MetricTrendChart
                                    title="Viewing Distance Trend"
                                    rows={sevenDayRows}
                                    valueKey="distance"
                                    scaleMax={100}
                                    targetText="Recommended 50-100 cm"
                                    guidance="Keep your screen about an arm's length away."
                                    statusForValue={(value) => value === null ? "No data" : value >= 50 && value <= 100 ? "Good" : value >= 40 ? "Attention" : "Warning"}
                                    unit="cm"
                                />
                                <MetricTrendChart
                                    title="Brightness Trend"
                                    rows={sevenDayRows}
                                    valueKey="brightness"
                                    scaleMax={1000}
                                    targetText="Comfortable range 200-750 lux, camera-estimated"
                                    guidance="Avoid very dim or glaring light."
                                    statusForValue={(value) => value === null ? "No data" : value >= 200 && value <= 750 ? "Good" : value >= 100 && value <= 1000 ? "Attention" : "Warning"}
                                    unit="lux"
                                />
                                <MetricTrendChart
                                    title="Daily Active Screen Time"
                                    rows={sevenDayRows}
                                    valueKey="useTime"
                                    scaleMax={60}
                                    targetText="Take a break every 20 min"
                                    guidance="Follow the 20-20-20 rule: every 20 minutes, look 20 feet away for 20 seconds."
                                    statusForValue={(value) => value === null ? "No data" : value < 20 ? "Good" : value <= 40 ? "Attention" : "Warning"}
                                    unit="min"
                                />
                            </div>
                        ) : (
                            <div className="empty-state">Start monitoring for at least a few seconds to build your local trend history.</div>
                        )}
                    </section>

                    <section className="panel weekly-review-card">
                        <div className="panel-header compact">
                            <div>
                                <p className="eyebrow">Weekly Review</p>
                                <h2>Eye-care comment</h2>
                            </div>
                            <span className="status-badge neutral-status">Based on recent local data</span>
                        </div>
                        <p>{weeklyReview}</p>
                        <div className="risk-notice highlighted">This is not medical diagnosis.</div>
                    </section>

                    <section className="trend-debug-panel">
                        <strong>Debug</strong>
                        <span>currentUserId: {debugUserId}</span>
                        <span>totalSamples: {samples.length}</span>
                        <span>totalEvents: {events.length}</span>
                        <span>selectedDate: {selectedDate}</span>
                        <span>selectedSamples: {selectedSamples.length}</span>
                        <span>selectedEvents: {selectedEvents.length}</span>
                        <span>sevenDayEvents: {sevenDayEvents.length}</span>
                        <span>localDateKeyNow: {localDateKey()}</span>
                        <span>utcDateKeyNow: {utcDateKey()}</span>
                        <span>latestSampleStoredDate: {latestSample ? latestSample.date : "none"}</span>
                        <span>latestSampleDisplayDate: {latestSample ? metricSampleDisplayDate(latestSample) : "none"}</span>
                        <span>latestSampleTimestampLocal: {latestSample ? new Date(latestSample.timestamp).toLocaleString() : "none"}</span>
                        <span>latestSampleScore: {latestSample ? latestSample.eyeHealthScore : "none"}</span>
                        <span>latestEventStoredDate: {latestEvent ? latestEvent.date : "none"}</span>
                        <span>latestEventDisplayDate: {latestEvent ? reminderEventDisplayDate(latestEvent) : "none"}</span>
                        <span>latestEventTimestampLocal: {latestEvent ? new Date(latestEvent.triggeredAt).toLocaleString() : "none"}</span>
                        <span>latestEventType: {latestEvent ? latestEvent.type : "none"}</span>
                    </section>
                </div>
            </main>
        </div>
    );
}

export default TrendPage;
