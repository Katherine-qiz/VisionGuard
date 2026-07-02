import { useState } from "react";

import { useMonitoring } from "../context/MonitoringContext";

import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import CameraComparisonPanel from "../components/CameraComparisonPanel";
import MetricCard from "../components/MetricCard";
import EyeHealthScoreCard from "../components/EyeHealthScoreCard";
import AIReportCard from "../components/AIReportCard";
import ReminderList from "../components/ReminderList";
import TrendCard from "../components/TrendCard";

type DashboardPageProps = {
    onOpenSettings?: () => void;
};

function DashboardPage({ onOpenSettings }: DashboardPageProps) {
    const {
        metrics,
        isMonitoring,
        riskResult,
        cardReminders,
    } = useMonitoring();
    const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

    const username = localStorage.getItem("visionguard_username") || "Katherine";
    const isCalibrating = metrics.isCalibrating === true;
    const visibleReminders = isMonitoring
        ? (cardReminders.length > 0 ? cardReminders : riskResult.reminders)
        : [];
    const riskByType = (type: "blink" | "distance" | "brightness" | "use_time") =>
        riskResult.risks.find((risk) => risk.type === type);
    const statusLabel = (level?: "good" | "attention" | "warning") =>
        level === "attention" ? "Attention" : level === "warning" ? "Warning" : "Good";
    const statusType = (type: "blink" | "distance" | "brightness" | "use_time") =>
        isCalibrating ? "attention" : riskByType(type)?.level ?? "good";
    const metricStatus = (type: "blink" | "distance" | "brightness" | "use_time") =>
        isCalibrating ? "Calibrating" : statusLabel(riskByType(type)?.level);
    const metricHelper = (fallback: string) => isCalibrating ? "Collecting baseline data" : fallback;
    const sessionUseTimeSeconds = metrics.sessionUseTimeSeconds ?? metrics.useTimeSeconds ?? 0;
    const todayTotalUseTimeSeconds = metrics.totalUseTimeSeconds ?? 0;
    const todayTotalStatus = isMonitoring ? "Tracking" : "Recorded";

    return (
        <div className="dashboard-shell">
            <Sidebar onOpenSettings={onOpenSettings} />

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
                            status={metricStatus("blink")}
                            statusType={statusType("blink")}
                            helper={metricHelper("Recent 60s estimate")}
                        />

                        <MetricCard
                            icon="📏"
                            title="Viewing Distance"
                            value={metrics.distanceCm}
                            unit="cm"
                            status={metricStatus("distance")}
                            statusType={statusType("distance")}
                            helper={metricHelper("Current viewing distance")}
                        />

                        <MetricCard
                            icon="💡"
                            title="Brightness"
                            value={metrics.brightnessLux}
                            unit="lux"
                            status={metricStatus("brightness")}
                            statusType={statusType("brightness")}
                            helper={metricHelper("Estimated room brightness")}
                        />

                        <MetricCard
                            icon="⏱"
                            title="Use Time"
                            value={Math.round(sessionUseTimeSeconds / 60)}
                            unit="min"
                            status={metricStatus("use_time")}
                            statusType={statusType("use_time")}
                            helper={metricHelper("Current focus session")}
                        />

                        <MetricCard
                            icon="📊"
                            title="Today Total"
                            value={Math.round(todayTotalUseTimeSeconds / 60)}
                            unit="min"
                            status={todayTotalStatus}
                            statusType="good"
                            helper="Tracked screen time today"
                        />
                    </section>

                    <section className="metric-debug-row" aria-label="Technical diagnostics">
                        <button
                            className="text-link-button"
                            onClick={() => setShowTechnicalDetails((isVisible) => !isVisible)}
                            type="button"
                        >
                            {showTechnicalDetails ? "Hide technical details" : "Show technical details"}
                        </button>

                        {showTechnicalDetails && (
                            <>
                                <span>rawBlinkRate: {metrics.rawBlinkRate ?? 0}</span>
                                <span>smoothedBlinkRate: {metrics.smoothedBlinkRate ?? metrics.blinkRate}</span>
                                <span>EAR: {metrics.ear.toFixed(3)}</span>
                                <span>Baseline: {metrics.earBaseline.toFixed(3)}</span>
                                <span>blinkWindowSeconds: {metrics.blinkWindowSeconds ?? 0}</span>
                                <span>snapshotScore: {riskResult.signalScores.snapshotScore}</span>
                                <span>liveBehaviorScore: {riskResult.signalScores.liveBehaviorScore}</span>
                                <span>blinkMetricScore: {riskResult.signalScores.blinkScore}</span>
                                <span>distanceMetricScore: {riskResult.signalScores.distanceScore}</span>
                                <span>brightnessMetricScore: {riskResult.signalScores.brightnessScore}</span>
                                <span>sessionTimeMetricScore: {riskResult.signalScores.sessionTimeScore}</span>
                                <span>dailyLoadScore: {riskResult.signalScores.dailyLoadScore}</span>
                                <span>dailyScore: {riskResult.score}</span>
                                <span>lastSettlementAt: {riskResult.sustainedState.lastSettlementAt ? new Date(riskResult.sustainedState.lastSettlementAt).toLocaleTimeString() : "pending"}</span>
                            </>
                        )}
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
