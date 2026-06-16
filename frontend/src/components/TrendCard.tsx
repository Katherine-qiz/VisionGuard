import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { dateKey, readMetricSamples, type MetricSample } from "../utils/metricsStorage";
import { readReminderEvents } from "../utils/reminderStorage";
import type { ReminderEvent } from "../types/reminder";
import { getCurrentUserId } from "../utils/user";

function lastSevenDates() {
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - index);
        return dateKey(date.getTime());
    }).reverse();
}

function average(values: number[]) {
    if (values.length === 0) return null;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function TrendCard() {
    const [samples, setSamples] = useState<MetricSample[]>([]);
    const [events, setEvents] = useState<ReminderEvent[]>([]);
    const dates = useMemo(lastSevenDates, []);

    useEffect(() => {
        const refresh = () => {
            const currentUserId = getCurrentUserId();
            setSamples(readMetricSamples().filter((sample) => sample.userId === currentUserId));
            setEvents(readReminderEvents().filter((event) => event.userId === currentUserId));
        };

        refresh();
        const intervalId = window.setInterval(refresh, 5000);
        window.addEventListener("focus", refresh);
        window.addEventListener("storage", refresh);
        window.addEventListener("visionguard-storage-updated", refresh);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", refresh);
            window.removeEventListener("storage", refresh);
            window.removeEventListener("visionguard-storage-updated", refresh);
        };
    }, []);

    const rows = dates.map((date) => {
        const daySamples = samples.filter((sample) => sample.date === date);
        return {
            date,
            score: average(daySamples.map((sample) => sample.eyeHealthScore)),
        };
    });
    const scores = rows.map((row) => row.score).filter((score): score is number => score !== null);
    const latestScore = scores.at(-1) ?? null;
    const previousScore = scores.length > 1 ? scores.at(-2) ?? null : null;
    const weeklyAlertCount = events.filter((event) => dates.includes(event.date)).length;
    const hasData = scores.length > 0;
    const trendNote = !hasData
        ? "Start monitoring to build your trend preview."
        : previousScore === null
          ? `Latest score is ${latestScore}. ${weeklyAlertCount} reminders this week.`
          : latestScore !== null && latestScore >= previousScore
            ? `Weekly score is improving. ${weeklyAlertCount} reminders this week.`
            : `Weekly score needs attention. ${weeklyAlertCount} reminders this week.`;

    return (
        <section className="panel trend-card">
            <div className="panel-header compact">
                <div>
                    <p className="eyebrow">Trend</p>
                    <h2>Eye Health Trend</h2>
                </div>
            </div>

            <div className="trend-card-content">
                <div className={`trend-bars${hasData ? "" : " empty"}`} aria-label="Seven day eye health score mini chart">
                    {rows.map((row) => (
                        row.score === null ? (
                            <span className="empty" key={row.date} title={`${row.date}: No data`} />
                        ) : (
                            <span
                                key={row.date}
                                style={{ height: `${Math.max(8, Math.min(100, row.score))}%` }}
                                title={`${row.date}: ${row.score}`}
                            />
                        )
                    ))}
                </div>

                <p className="trend-note">{trendNote}</p>
            </div>

            <div className="card-action-row">
                <Link className="primary-button trend-card-action" to="/trend">
                    View Full Trend
                </Link>
            </div>
        </section>
    );
}

export default TrendCard;
