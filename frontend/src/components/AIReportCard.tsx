import { useNavigate } from "react-router-dom";

import { useMonitoring } from "../context/MonitoringContext";
import { readLatestMetrics, readMetricSamples } from "../utils/localData";

function getMainSignal(metrics: { blinkRate?: number; distanceCm?: number; brightnessLux?: number; sessionUseTimeSeconds?: number; useTimeSeconds?: number }) {
    const sessionSeconds = metrics.sessionUseTimeSeconds ?? metrics.useTimeSeconds ?? 0;
    if (typeof metrics.blinkRate === "number" && metrics.blinkRate < 12) return "blink";
    if (typeof metrics.distanceCm === "number" && (metrics.distanceCm < 50 || metrics.distanceCm > 100)) return "distance";
    if (typeof metrics.brightnessLux === "number" && (metrics.brightnessLux < 300 || metrics.brightnessLux > 750)) return "brightness";
    if (sessionSeconds > 20 * 60) return "screen time";
    return "stable pattern";
}

function AIReportCard() {
    const navigate = useNavigate();
    const { metrics } = useMonitoring();
    const latestMetrics = readLatestMetrics();
    const hasMonitoringData = readMetricSamples().some((sample) => !sample.isCalibrating) || Boolean(latestMetrics);
    const latestScore = metrics.eyeHealthScore ?? latestMetrics?.eyeHealthScore;
    const mainSignal = getMainSignal({
        blinkRate: metrics.blinkRate ?? latestMetrics?.blinkRate,
        distanceCm: metrics.distanceCm ?? latestMetrics?.distanceCm,
        brightnessLux: metrics.brightnessLux ?? latestMetrics?.brightnessLux,
        sessionUseTimeSeconds: metrics.sessionUseTimeSeconds ?? latestMetrics?.sessionUseTimeSeconds,
        useTimeSeconds: metrics.useTimeSeconds ?? latestMetrics?.useTimeSeconds,
    });

    return (
        <section className="panel ai-report-card ai-report-entry-card">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">AI Insight</p>
                    <h2>AI Eye-Care Report</h2>
                    <p className="panel-helper">
                        Generate a structured eye-care behavior report from your latest VisionGuard monitoring data.
                    </p>
                </div>
                <span className="status-badge ai-status">Powered by DeepSeek</span>
            </div>

            <div className="ai-report-entry-body">
                <div className="ai-report-entry-copy">
                    <p>Your report will explain:</p>
                    <ul>
                        <li>what your score means</li>
                        <li>which metrics are healthy or risky</li>
                        <li>how to improve your screen-use habits</li>
                        <li>prevention tips for eye comfort</li>
                    </ul>
                </div>

                <div className="ai-report-entry-status">
                    {hasMonitoringData ? (
                        <>
                            <span>Latest score: {typeof latestScore === "number" ? Math.round(latestScore) : "--"} / 100</span>
                            <span>Main signal: {mainSignal}</span>
                        </>
                    ) : (
                        <span>Start monitoring first to generate a more meaningful report.</span>
                    )}
                </div>
            </div>

            <div className="card-action-row">
                <button className="primary-button" onClick={() => navigate("/ai-report")} type="button">
                    Generate report
                </button>
            </div>
        </section>
    );
}

export default AIReportCard;
