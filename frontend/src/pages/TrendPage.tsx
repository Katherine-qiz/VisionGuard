import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import type { ReminderType } from "../types/reminder";
import { localDateKey } from "../utils/dateUtils";
import {
    buildTrendViewModel,
    lastSevenLocalDates,
    type TrendDaySummary,
} from "../utils/trendData";

type TrendPageProps = {
    onOpenSettings?: () => void;
};

type TrendValueKey = "score" | "blinkRate" | "distance" | "brightness" | "useTime";

function formatDateLabel(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

function formatValue(value: number | null, unit = "") {
    return value === null ? "No data" : `${value}${unit}`;
}

function formatMinutes(seconds: number | null) {
    return seconds === null ? "No data" : `${Math.round(seconds / 60)} min`;
}

function riskLabel(risk: ReminderType | "none" | null) {
    return risk ? risk.replace("_", " ") : "No data";
}

function statusClass(status: "Good" | "Attention" | "Warning" | "No data") {
    if (status === "Good") return "good-status";
    if (status === "Attention") return "attention-status";
    if (status === "Warning") return "warning-status";
    return "neutral-status";
}

function MetricTrendChart({
    title,
    rows,
    valueKey,
    scaleMax,
    targetText,
    guidance,
    unit = "",
    statusForValue,
}: {
    title: string;
    rows: TrendDaySummary[];
    valueKey: TrendValueKey;
    scaleMax: number;
    targetText: string;
    guidance: string;
    unit?: string;
    statusForValue: (value: number | null) => "Good" | "Attention" | "Warning" | "No data";
}) {
    const valueForRow = (row: TrendDaySummary) => {
        if (valueKey === "score") return row.avgScore;
        if (valueKey === "blinkRate") return row.avgBlinkRate;
        if (valueKey === "distance") return row.avgDistance;
        if (valueKey === "brightness") return row.avgBrightness;
        return row.totalUseTimeSeconds === null ? null : Math.round(row.totalUseTimeSeconds / 60);
    };
    const latestValue = [...rows].reverse().map(valueForRow).find((value) => value !== null) ?? null;
    const status = statusForValue(latestValue);

    return (
        <div className="trend-chart">
            <div className="trend-chart-header">
                <div>
                    <strong>{title}</strong>
                    <p>{targetText} · Current {formatValue(latestValue, unit)}</p>
                </div>
                <span className={`status-badge ${statusClass(status)}`}>{status}</span>
            </div>

            <div className="trend-chart-bars">
                {rows.map((row) => {
                    const value = valueForRow(row);
                    return (
                        <div className="trend-chart-bar" key={`${title}-${row.date}`}>
                            {value === null ? (
                                <span className="trend-chart-empty">No data</span>
                            ) : (
                                <span style={{ height: `${Math.max(8, Math.min(100, (value / scaleMax) * 100))}%` }} />
                            )}
                            <small>{row.date.slice(5)}</small>
                        </div>
                    );
                })}
            </div>

            <p className="trend-chart-guidance">{guidance}</p>
        </div>
    );
}

function TrendPage({ onOpenSettings }: TrendPageProps) {
    const [selectedDate, setSelectedDate] = useState(localDateKey());
    const [refreshVersion, setRefreshVersion] = useState(0);
    const username = localStorage.getItem("visionguard_username") || "Katherine";
    const viewModel = useMemo(
        () => buildTrendViewModel(selectedDate),
        [selectedDate, refreshVersion],
    );
    const dateOptions = useMemo(lastSevenLocalDates, []);
    const hasSevenDayData = viewModel.last7DaysSummary.some((day) => day.hasData);
    const selectedSummary = viewModel.selectedSummary;

    useEffect(() => {
        const refresh = () => setRefreshVersion((version) => version + 1);
        window.addEventListener("focus", refresh);
        window.addEventListener("storage", refresh);
        window.addEventListener("visionguard-storage-updated", refresh);

        return () => {
            window.removeEventListener("focus", refresh);
            window.removeEventListener("storage", refresh);
            window.removeEventListener("visionguard-storage-updated", refresh);
        };
    }, []);

    return (
        <div className="dashboard-shell">
            <Sidebar onOpenSettings={onOpenSettings} />

            <main className="dashboard-main">
                <TopBar username={username} />

                <div className="dashboard-content trend-page-content">
                    <section className="panel trend-overview-panel">
                        <div className="panel-header">
                            <div>
                                <p className="eyebrow">Trend</p>
                                <h2>Eye-care trends</h2>
                                <p className="panel-helper">All cards use the same selected date and seven-day local data model.</p>
                            </div>
                            <div className="trend-action-group">
                                <input
                                    aria-label="Select trend date"
                                    className="date-input"
                                    onChange={(event) => setSelectedDate(event.target.value || localDateKey())}
                                    type="date"
                                    value={selectedDate}
                                />
                                <Link className="secondary-button compact-action" to="/ai-report">
                                    View Detailed AI Report
                                </Link>
                            </div>
                        </div>

                        <div className="date-chip-row" aria-label="Recent dates">
                            {dateOptions.map((date) => (
                                <button
                                    className={`date-chip${date === selectedDate ? " active" : ""}`}
                                    key={date}
                                    onClick={() => setSelectedDate(date)}
                                    type="button"
                                >
                                    <span>{new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" })}</span>
                                    <strong>{date.slice(5)}</strong>
                                </button>
                            ))}
                        </div>

                        <div className="trend-summary-grid">
                            <div><span>Avg Score</span><strong>{formatValue(selectedSummary.avgScore)}</strong></div>
                            <div><span>Total Use Time</span><strong>{formatMinutes(selectedSummary.totalUseTimeSeconds)}</strong></div>
                            <div><span>Avg Blink Rate</span><strong>{formatValue(selectedSummary.avgBlinkRate, "/min")}</strong></div>
                            <div><span>Avg Distance</span><strong>{formatValue(selectedSummary.avgDistance, " cm")}</strong></div>
                            <div><span>Reminder Count</span><strong>{selectedSummary.reminderCount === null ? "No data" : selectedSummary.reminderCount}</strong></div>
                            <div><span>Most Common Risk</span><strong>{riskLabel(selectedSummary.mostCommonRisk)}</strong></div>
                        </div>

                        {!selectedSummary.hasData && (
                            <div className="empty-state">No data for {formatDateLabel(selectedDate)}.</div>
                        )}
                    </section>

                    <section className="dashboard-bottom-grid">
                        <section className="panel">
                            <div className="panel-header compact">
                                <div>
                                    <p className="eyebrow">Last 7 Days</p>
                                    <h2>Summary</h2>
                                </div>
                            </div>
                            <div className="trend-table">
                                {viewModel.last7DaysSummary.map((row) => (
                                    <div className="trend-row" key={row.date}>
                                        <span>{row.date.slice(5)}</span>
                                        <strong>{row.avgScore === null ? "No data" : `Score ${row.avgScore}`}</strong>
                                        <span>{formatMinutes(row.totalUseTimeSeconds)}</span>
                                        <span>{row.reminderCount === null ? "No data" : `${row.reminderCount} reminders`}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="panel trend-events-card">
                            <div className="panel-header compact">
                                <div>
                                    <p className="eyebrow">7-day Risk Breakdown</p>
                                    <h2>Reminder Events</h2>
                                    <p className="panel-helper">Deduped reminder events saved in the last 7 days.</p>
                                </div>
                            </div>

                            <div className="risk-breakdown">
                                {viewModel.riskBreakdown7Days.map((item) => (
                                    <div key={item.type}>
                                        <span>{item.type}</span>
                                        <strong>{item.label}</strong>
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

                        {hasSevenDayData ? (
                            <div className="metric-trend-grid">
                                <MetricTrendChart
                                    guidance="Higher score means healthier screen-use habits."
                                    rows={viewModel.last7DaysSummary}
                                    scaleMax={100}
                                    statusForValue={(value) => value === null ? "No data" : value >= 85 ? "Good" : value >= 70 ? "Attention" : "Warning"}
                                    targetText="Target 85+"
                                    title="Eye Health Score Trend"
                                    valueKey="score"
                                />
                                <MetricTrendChart
                                    guidance="Low blink rate may increase dryness. Try intentional blinking."
                                    rows={viewModel.last7DaysSummary}
                                    scaleMax={20}
                                    statusForValue={(value) => value === null ? "No data" : value >= 12 ? "Good" : value >= 8 ? "Attention" : "Warning"}
                                    targetText="Good ≥12/min"
                                    title="Blink Rate Trend"
                                    unit="/min"
                                    valueKey="blinkRate"
                                />
                                <MetricTrendChart
                                    guidance="Keep your screen about an arm's length away."
                                    rows={viewModel.last7DaysSummary}
                                    scaleMax={100}
                                    statusForValue={(value) => value === null ? "No data" : value >= 50 && value <= 100 ? "Good" : "Attention"}
                                    targetText="Recommended 50-100 cm"
                                    title="Viewing Distance Trend"
                                    unit="cm"
                                    valueKey="distance"
                                />
                                <MetricTrendChart
                                    guidance="Use daily active screen time for trend and report context."
                                    rows={viewModel.last7DaysSummary}
                                    scaleMax={480}
                                    statusForValue={(value) => value === null ? "No data" : "Good"}
                                    targetText="Recorded, not scored"
                                    title="Daily Active Screen Time"
                                    unit="min"
                                    valueKey="useTime"
                                />
                                <MetricTrendChart
                                    guidance="Avoid very dim or glaring light."
                                    rows={viewModel.last7DaysSummary}
                                    scaleMax={1000}
                                    statusForValue={(value) => value === null ? "No data" : value >= 300 && value <= 750 ? "Good" : "Attention"}
                                    targetText="Comfortable 300-750 lux"
                                    title="Brightness Trend"
                                    unit="lux"
                                    valueKey="brightness"
                                />
                            </div>
                        ) : (
                            <div className="empty-state">Start monitoring to build your trend.</div>
                        )}
                    </section>

                    <section className="panel weekly-review-card">
                        <div className="panel-header compact">
                            <div>
                                <p className="eyebrow">Weekly Review</p>
                                <h2>Eye-care comment</h2>
                            </div>
                            <Link className="secondary-button compact-action" to="/ai-report">
                                View Detailed AI Report
                            </Link>
                        </div>
                        <p>{viewModel.weeklyReview.text}</p>
                        <div className="risk-notice highlighted">This is not medical diagnosis.</div>
                    </section>
                </div>
            </main>
        </div>
    );
}

export default TrendPage;
