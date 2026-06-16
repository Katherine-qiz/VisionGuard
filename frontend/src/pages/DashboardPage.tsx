import { useMonitoring } from "../context/MonitoringContext";

import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import CameraComparisonPanel from "../components/CameraComparisonPanel";
import MetricCard from "../components/MetricCard";
import EyeHealthScoreCard from "../components/EyeHealthScoreCard";
import AIReportCard from "../components/AIReportCard";
import ReminderList from "../components/ReminderList";
import TrendCard from "../components/TrendCard";

function DashboardPage() {
    const {
        metrics,
        isMonitoring,
        riskResult,
        cardReminders,
    } = useMonitoring();

    const username = localStorage.getItem("visionguard_username") || "Katherine";
    const visibleReminders = isMonitoring ? cardReminders : [];
    const riskByType = (type: "blink" | "distance" | "brightness" | "use_time") =>
        riskResult.risks.find((risk) => risk.type === type);
    const statusLabel = (level?: "good" | "attention" | "warning") =>
        level === "good" ? "Good" : level === "attention" ? "Attention" : "Warning";
    const blinkStatus = (metrics.blinkWindowSeconds ?? 0) < 30 ? "Calibrating" : statusLabel(riskByType("blink")?.level);
    const blinkStatusType = (metrics.blinkWindowSeconds ?? 0) < 30 ? "attention" : riskByType("blink")?.level ?? "warning";
    const continuousUseTimeSeconds = metrics.continuousUseTimeSeconds ?? metrics.useTimeSeconds;

    return (
        <div className="dashboard-shell">
            <Sidebar />

            <main className="dashboard-main">
                <TopBar username={username} />

                <div className="dashboard-content">
                    <section className="dashboard-hero-grid">
                        <CameraComparisonPanel />

                        <aside className="dashboard-side-column">
                            <EyeHealthScoreCard
                                score={metrics.eyeHealthScore}
                                level={metrics.scoreLevel}
                                metrics={metrics}
                                feedback={riskResult.scoreFeedback}
                            />
                            <ReminderList reminders={visibleReminders} />
                        </aside>
                    </section>

                    <section className="metrics-grid" aria-label="Eye health metrics">
                        <MetricCard
                            icon="👁"
                            title="Blink Rate"
                            value={metrics.blinkRate}
                            unit="/ min"
                            status={blinkStatus}
                            statusType={blinkStatusType}
                            helper="Recent 60s estimate"
                        />

                        <MetricCard
                            icon="📏"
                            title="Viewing Distance"
                            value={metrics.distanceCm}
                            unit="cm"
                            status={statusLabel(riskByType("distance")?.level)}
                            statusType={riskByType("distance")?.level ?? "warning"}
                            helper="Current live distance"
                        />

                        <MetricCard
                            icon="💡"
                            title="Brightness"
                            value={metrics.brightnessLux}
                            unit="lux"
                            status={statusLabel(riskByType("brightness")?.level)}
                            statusType={riskByType("brightness")?.level ?? "warning"}
                            helper="Current camera-estimated light"
                        />

                        <MetricCard
                            icon="⏱"
                            title="Use Time"
                            value={Math.round(continuousUseTimeSeconds / 60)}
                            unit="min"
                            status={statusLabel(riskByType("use_time")?.level)}
                            statusType={riskByType("use_time")?.level ?? "warning"}
                            helper="Continuous focus time"
                        />
                    </section>

                    <section className="metric-debug-row" aria-label="Blink detection diagnostics">
                        <span>Session Blinks: {metrics.blinkCount}</span>
                        <span>Recent Rate: {metrics.blinkRate}</span>
                        <span>Raw: {metrics.rawBlinkRate ?? 0}</span>
                        <span>Smoothed: {metrics.smoothedBlinkRate ?? metrics.blinkRate}</span>
                        <span>Session: {Math.round((metrics.sessionUseTimeSeconds ?? 0) / 60)}m</span>
                        <span>Active: {Math.round((metrics.activeScreenTimeSeconds ?? 0) / 60)}m</span>
                        <span>Break: {metrics.breakDurationSeconds ?? 0}s</span>
                        <span>EAR: {metrics.ear.toFixed(3)}</span>
                        <span>Baseline: {metrics.earBaseline.toFixed(3)}</span>
                        <span>Blink Window: {metrics.blinkWindowSeconds ?? 0}s</span>
                        <span>Events in Window: {metrics.blinkEventsInWindow ?? 0}</span>
                        <span>{metrics.isBlinking ? "Blinking" : "Eyes open"}</span>
                    </section>

                    <section className="dashboard-bottom-grid">
                        <AIReportCard />
                        <TrendCard />
                    </section>
                </div>
            </main>
        </div>
    );
}

export default DashboardPage;
