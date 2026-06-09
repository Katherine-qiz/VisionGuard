import { useEffect, useState } from "react";

import { fetchEyeMetrics } from "../api/client";
import type { EyeMetrics } from "../types/metrics";

import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import CameraComparisonPanel from "../components/CameraComparisonPanel";
import MetricCard from "../components/MetricCard";
import EyeHealthScoreCard from "../components/EyeHealthScoreCard";
import EyeBuddyCard from "../components/EyeBuddyCard";
import AIReportCard from "../components/AIReportCard";
import ReminderList from "../components/ReminderList";
import TrendCard from "../components/TrendCard";

function DashboardPage() {
    const [metrics, setMetrics] = useState<EyeMetrics | null>(null);
    const [error, setError] = useState("");

    const username = localStorage.getItem("visionguard_username") || "Katherine";

    useEffect(() => {
        fetchEyeMetrics()
            .then((data) => {
                setMetrics(data);
            })
            .catch((err) => {
                setError(err.message);
            });
    }, []);

    return (
        <div className="dashboard-shell">
            <Sidebar />

            <main className="dashboard-main">
                <TopBar username={username} />

                <div className="dashboard-content">
                    {error && <div className="error-banner">Error: {error}</div>}

                    {metrics ? (
                        <>
                            <section className="dashboard-top-grid">
                                <CameraComparisonPanel onAnalysisResult={setMetrics} />

                                <aside className="right-stack">
                                    <EyeHealthScoreCard score={metrics.eyeHealthScore} />
                                    <EyeBuddyCard score={metrics.eyeHealthScore} />
                                </aside>
                            </section>

                            <section className="metrics-grid" aria-label="Eye health metrics">
                                <MetricCard
                                    title="Blink Rate"
                                    value={metrics.blinkRate}
                                    unit="/ min"
                                    status="Normal"
                                    statusType="good"
                                />

                                <MetricCard
                                    title="Viewing Distance"
                                    value={metrics.distanceCm}
                                    unit="cm"
                                    status="Good"
                                    statusType="good"
                                />

                                <MetricCard
                                    title="Brightness"
                                    value={metrics.brightnessLux}
                                    unit="lux"
                                    status="Good"
                                    statusType="good"
                                />

                                <MetricCard
                                    title="Use Time"
                                    value={Math.round(metrics.useTimeSeconds / 60)}
                                    unit="min"
                                    status="Attention"
                                    statusType="attention"
                                />
                            </section>

                            <section className="dashboard-bottom-grid">
                                <AIReportCard />

                                <div className="right-stack">
                                    <TrendCard />
                                    <ReminderList />
                                </div>
                            </section>
                        </>
                    ) : (
                        <>
                            <CameraComparisonPanel onAnalysisResult={setMetrics} />
                            <section className="panel loading-panel">Loading metrics...</section>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

export default DashboardPage;
