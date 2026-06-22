import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { localDateKey } from "../utils/dateUtils";
import { buildTrendViewModel } from "../utils/trendData";

function TrendCard() {
    const [refreshVersion, setRefreshVersion] = useState(0);
    const viewModel = useMemo(
        () => buildTrendViewModel(localDateKey()),
        [refreshVersion],
    );
    const scores = viewModel.last7DaysSummary
        .map((day) => day.avgScore)
        .filter((score): score is number => score !== null);
    const averageScore = scores.length > 0
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : null;
    const weeklyReminderCount = viewModel.riskBreakdown7Days.reduce((sum, risk) => sum + risk.count, 0);
    const mainRisk = viewModel.riskBreakdown7Days
        .filter((risk) => risk.count > 0)
        .sort((a, b) => b.count - a.count)[0]?.type;
    const hasData = scores.length > 0;
    const trendNote = hasData
        ? `7-day average score ${averageScore}. ${weeklyReminderCount} reminders this week. Main risk: ${mainRisk ?? "stable pattern"}.`
        : "Start monitoring to build your trend.";

    useEffect(() => {
        const refresh = () => setRefreshVersion((version) => version + 1);
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
                    {viewModel.last7DaysSummary.map((row) => (
                        row.avgScore === null ? (
                            <span className="empty" key={row.date} title={`${row.date}: No data`} />
                        ) : (
                            <span
                                key={row.date}
                                style={{ height: `${Math.max(8, Math.min(100, row.avgScore))}%` }}
                                title={`${row.date}: ${row.avgScore}`}
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
