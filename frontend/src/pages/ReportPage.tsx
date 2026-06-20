import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { readMetricSamples } from "../utils/metricsStorage";
import { readReminderEvents } from "../utils/reminderStorage";

type ReportPageProps = {
    onOpenSettings?: () => void;
};

type ReportPayload = {
    blinkRate: number | null;
    viewingDistance: number | null;
    distanceCm: number | null;
    brightness: number | null;
    brightnessLux: number | null;
    useTimeSeconds: number | null;
    sessionUseTimeSeconds: number | null;
    totalUseTimeSeconds: number | null;
    eyeHealthScore: number | null;
    selectedDate: string;
    recentSamples: Array<Record<string, unknown>>;
    reminders: unknown;
    latestMetrics: unknown;
    dailyStats: unknown;
    previousReport: unknown;
};

type AIReport = {
    summary: string;
    trendInsight?: string;
    riskLevel: string;
    score: number;
    keyFindings?: string[];
    issues?: string[];
    behaviorTrends?: string[];
    fatigueAnalysis?: string[];
    riskFactors?: string[];
    recommendations?: string[];
    suggestions?: string[];
};

type ReportResponse = {
    success: boolean;
    report?: Partial<AIReport>;
    raw?: string;
    error?: string;
};

const LATEST_REPORT_KEY = "visionguard_latest_report";

type StoredReport = {
    report: AIReport;
    generatedAt: string;
};

function readJsonStorage(key: string) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) as unknown : null;
    } catch {
        return null;
    }
}

function readSavedReport() {
    try {
        const value = localStorage.getItem(LATEST_REPORT_KEY);
        if (!value) return null;
        const parsedValue = JSON.parse(value) as Partial<StoredReport> & Partial<AIReport>;
        const reportValue = parsedValue.report ?? parsedValue;
        return {
            report: normalizeReport(reportValue),
            generatedAt: typeof parsedValue.generatedAt === "string" ? parsedValue.generatedAt : "",
        };
    } catch {
        return null;
    }
}

function normalizeReport(report: Partial<AIReport>): AIReport {
    return {
        summary: report.summary ?? "Your eye-care report is ready.",
        trendInsight: report.trendInsight,
        riskLevel: report.riskLevel ?? "medium",
        score: typeof report.score === "number" ? report.score : 0,
        keyFindings: Array.isArray(report.keyFindings) ? report.keyFindings : [],
        issues: Array.isArray(report.issues) ? report.issues : [],
        behaviorTrends: Array.isArray(report.behaviorTrends) ? report.behaviorTrends : [],
        fatigueAnalysis: Array.isArray(report.fatigueAnalysis) ? report.fatigueAnalysis : [],
        riskFactors: Array.isArray(report.riskFactors) ? report.riskFactors : [],
        recommendations: Array.isArray(report.recommendations) ? report.recommendations : [],
        suggestions: Array.isArray(report.suggestions) ? report.suggestions : [],
    };
}

async function fetchCurrentMetrics() {
    const response = await fetch("http://127.0.0.1:5000/api/stats");
    if (!response.ok) {
        throw new Error("Unable to read the latest monitoring metrics.");
    }

    return response.json() as Promise<Record<string, unknown>>;
}

function numberOrNull(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function buildReportPayload(): Promise<ReportPayload> {
    const currentMetrics = await fetchCurrentMetrics();
    const samples = readMetricSamples()
        .filter((sample) => !sample.isCalibrating)
        .sort((a, b) => b.timestamp - a.timestamp);
    const latest = samples[0];
    const reminderEvents = readReminderEvents()
        .sort((a, b) => b.triggeredAt - a.triggeredAt)
        .slice(0, 8);
    const dailyStats = readJsonStorage("visionguard_daily_stats");
    const latestMetrics = readJsonStorage("visionguard_latest_metrics");
    const storedReminders = readJsonStorage("visionguard_reminders");
    const previousReport = readJsonStorage(LATEST_REPORT_KEY);
    const distanceCm = numberOrNull(currentMetrics.distanceCm) ?? latest?.distanceCm ?? null;
    const brightnessLux = numberOrNull(currentMetrics.brightnessLux) ?? latest?.brightnessLux ?? null;

    return {
        blinkRate: numberOrNull(currentMetrics.blinkRate) ?? latest?.blinkRate ?? null,
        viewingDistance: distanceCm,
        distanceCm,
        brightness: brightnessLux,
        brightnessLux,
        useTimeSeconds: numberOrNull(currentMetrics.useTimeSeconds) ?? latest?.useTimeSeconds ?? null,
        sessionUseTimeSeconds: numberOrNull(currentMetrics.sessionUseTimeSeconds) ?? latest?.sessionUseTimeSeconds ?? null,
        totalUseTimeSeconds: numberOrNull(currentMetrics.totalUseTimeSeconds) ?? latest?.totalUseTimeSeconds ?? null,
        eyeHealthScore: numberOrNull(currentMetrics.eyeHealthScore) ?? latest?.eyeHealthScore ?? null,
        selectedDate: new Date().toISOString().slice(0, 10),
        recentSamples: samples.slice(0, 8),
        reminders: storedReminders ?? reminderEvents,
        latestMetrics,
        dailyStats,
        previousReport,
    };
}

function ReportList({ title, items }: { title: string; items: string[] }) {
    return (
        <section className="report-section" style={{ minHeight: "100%" }}>
            <h3>{title}</h3>
            {items.length > 0 ? (
                <ul>
                    {items.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            ) : (
                <p>More detail will appear here after VisionGuard has enough monitoring history.</p>
            )}
        </section>
    );
}

function ReportPage({ onOpenSettings }: ReportPageProps) {
    const username = localStorage.getItem("visionguard_username") || "Katherine";
    const userInitial = username.charAt(0).toUpperCase();
    const savedReport = readSavedReport();
    const [report, setReport] = useState<AIReport | null>(() => savedReport?.report ?? null);
    const [generatedAt, setGeneratedAt] = useState(() => savedReport?.generatedAt ?? "");
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState("");
    const [userMessages, setUserMessages] = useState<string[]>(report ? ["Generate my eye health report"] : []);
    const [hasMonitoringData, setHasMonitoringData] = useState(() => readMetricSamples().some((sample) => !sample.isCalibrating));

    useEffect(() => {
        const savedReport = readSavedReport();
        if (savedReport) {
            setReport(savedReport.report);
            setGeneratedAt(savedReport.generatedAt);
        }
    }, []);

    const mainFindings = report
        ? [...(report.keyFindings ?? []), ...(report.issues ?? [])]
        : [];
    const riskFactors = report
        ? [...(report.riskFactors ?? []), ...(report.behaviorTrends ?? []), ...(report.fatigueAnalysis ?? [])]
        : [];
    const suggestions = report
        ? [...(report.recommendations ?? []), ...(report.suggestions ?? [])]
        : [];

    const generateReport = async () => {
        setLoading(true);
        setNotice("");
        setUserMessages((current) => [...current, "Generate my eye health report"]);

        try {
            const payload = await buildReportPayload();
            setHasMonitoringData(payload.recentSamples.length > 0);
            console.log("REPORT PAYLOAD", payload);

            const response = await fetch("http://127.0.0.1:5000/api/report/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json() as ReportResponse;
            console.log("REPORT RESPONSE", data);

            if (data.success && data.report) {
                const nextReport = normalizeReport(data.report);
                const nextGeneratedAt = new Date().toISOString();
                setReport(nextReport);
                setGeneratedAt(nextGeneratedAt);
                setNotice("");
                localStorage.setItem(LATEST_REPORT_KEY, JSON.stringify({
                    report: nextReport,
                    generatedAt: nextGeneratedAt,
                }));
                return;
            }

            setNotice("The report could not connect right now. Your previous report will stay available here.");
        } catch {
            setNotice("The report could not connect right now. Your previous report will stay available here.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard-shell">
            <Sidebar onOpenSettings={onOpenSettings} />

            <main className="dashboard-main">
                <TopBar username={username} />

                <div className="dashboard-content">
                    <section className="panel">
                        <div className="panel-header">
                            <div>
                                <p className="eyebrow">AI report</p>
                                <h2>AI Eye-Care Report</h2>
                                <p className="panel-helper">
                                    This report uses blink rate, viewing distance, brightness, session time, score, and reminders to summarize your eye-care habits.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="panel" style={{ background: "#f7f8fa", borderRadius: "18px" }}>
                        <div style={{ display: "grid", gap: "18px" }}>
                            {userMessages.map((message, index) => (
                                <div key={`${message}-${index}`} style={{ alignItems: "flex-end", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                                    <div style={{ background: "#2563eb", borderRadius: "18px 18px 6px 18px", color: "#ffffff", fontWeight: 800, maxWidth: "520px", padding: "14px 18px" }}>
                                        {message}
                                    </div>
                                    <div style={{ alignItems: "center", background: "linear-gradient(135deg, #94a3b8, #475569)", borderRadius: "50%", color: "#ffffff", display: "flex", flex: "0 0 auto", fontWeight: 900, height: "40px", justifyContent: "center", width: "40px" }}>
                                        {userInitial}
                                    </div>
                                </div>
                            ))}

                            {!report && !loading && (
                                <article style={{ background: "#ffffff", border: "1px solid #dbe3ef", borderRadius: "18px", color: "#475569", maxWidth: "760px", padding: "20px" }}>
                                    {hasMonitoringData
                                        ? "Generate your report when you are ready. Your latest monitoring pattern will be used."
                                        : "No monitoring history is available yet. You can still generate a starter report, and it will become more useful after a short monitoring session."}
                                </article>
                            )}

                            {loading && (
                                <article style={{ background: "#ffffff", border: "1px solid #dbe3ef", borderRadius: "18px", color: "#475569", maxWidth: "760px", padding: "20px" }}>
                                    Reviewing your eye-care patterns...
                                </article>
                            )}

                            {notice && (
                                <div className="risk-notice highlighted" style={{ whiteSpace: "normal" }}>
                                    {notice}
                                </div>
                            )}

                            {report && (
                                <article style={{ background: "#ffffff", border: "1px solid #dbe3ef", borderRadius: "22px", boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)", padding: "24px" }}>
                                    <div style={{ alignItems: "flex-start", display: "flex", gap: "16px", justifyContent: "space-between" }}>
                                        <div>
                                            <p className="eyebrow">Overall Score</p>
                                            <h2 style={{ marginTop: 0 }}>{report.score} / 100</h2>
                                            <p className="panel-helper">
                                                A higher score means your recent eye-care habits look more comfortable across blinking, distance, lighting, and session rhythm.
                                            </p>
                                            <p className="panel-helper">
                                                Report generated: {generatedAt ? new Date(generatedAt).toLocaleString() : "Not available"}
                                            </p>
                                        </div>
                                        <span className="status-badge attention-status" style={{ textTransform: "capitalize" }}>
                                            {report.riskLevel}
                                        </span>
                                    </div>

                                    <section className="report-section report-summary" style={{ marginTop: "16px" }}>
                                        <h3>Summary</h3>
                                        <p>{report.summary}</p>
                                        {report.trendInsight && <p>{report.trendInsight}</p>}
                                    </section>

                                    <div className="ai-report-cards" style={{ marginTop: "16px" }}>
                                        <ReportList title="Main Findings" items={mainFindings} />
                                        <ReportList title="Risk Factors" items={riskFactors} />
                                        <ReportList title="Suggestions" items={suggestions} />
                                    </div>

                                    <section className="report-section" style={{ marginTop: "16px" }}>
                                        <h3>How to read these metrics</h3>
                                        <ul>
                                            <li>Blink rate shows how often you blink during screen use. Lower rates can mean your eyes may feel drier.</li>
                                            <li>Viewing distance describes how far you sit from the screen. A comfortable target is usually around an arm’s length.</li>
                                            <li>Brightness reflects the surrounding light estimated from the camera. Very dim or glaring light can feel tiring.</li>
                                            <li>Session time shows how long the current screen-use period has lasted. Longer sessions benefit from short visual breaks.</li>
                                        </ul>
                                    </section>

                                    <div className="risk-notice highlighted" style={{ marginTop: "16px", whiteSpace: "normal" }}>
                                        Disclaimer: This is not a medical diagnosis. It is eye-care habit guidance based on VisionGuard activity patterns.
                                    </div>
                                </article>
                            )}
                        </div>

                        <div style={{ borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", marginTop: "22px", paddingTop: "18px" }}>
                            <button className="primary-button report-button" disabled={loading} onClick={generateReport} type="button">
                                {loading ? "Generating..." : "Generate Report"}
                            </button>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

export default ReportPage;
