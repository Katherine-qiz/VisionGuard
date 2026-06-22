import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { useMonitoring } from "../context/MonitoringContext";
import type { EyeMetrics } from "../types/metrics";
import {
    readDailySummaries,
    readLatestMetrics,
    readLatestReport,
    readMetricSamples,
    readReportHistory,
    readReminderEvents,
    saveLatestReport,
    subscribeLocalData,
    type StoredReport,
} from "../utils/localData";

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
    risk_level?: string;
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

type ReportConversationEntry = {
    id: string;
    prompt: string;
    report: AIReport;
    generatedAt: string;
};

const REPORT_CONVERSATION_KEY = "visionguard_report_conversation";
const REPORT_PROMPT_TEXT = "Generate my eye health report";

function readSavedReport() {
    try {
        const parsedValue = readLatestReport<AIReport>() as (Partial<StoredReport> & Partial<AIReport>) | null;
        if (!parsedValue) return null;
        const reportValue = parsedValue.report ?? parsedValue;
        return {
            report: normalizeReport(reportValue),
            generatedAt: typeof parsedValue.generatedAt === "string" ? parsedValue.generatedAt : "",
        };
    } catch {
        return null;
    }
}

function readReportConversationHistory(): ReportConversationEntry[] {
    try {
        const rawValue = localStorage.getItem(REPORT_CONVERSATION_KEY);
        const parsedValue = rawValue ? JSON.parse(rawValue) as Array<Partial<ReportConversationEntry>> : [];
        if (Array.isArray(parsedValue) && parsedValue.length > 0) {
            return parsedValue
                .filter((entry) => entry.report && entry.generatedAt)
                .map((entry) => ({
                    id: entry.id ?? `report-${entry.generatedAt}`,
                    prompt: entry.prompt ?? REPORT_PROMPT_TEXT,
                    report: normalizeReport(entry.report ?? {}),
                    generatedAt: entry.generatedAt ?? "",
                }));
        }
    } catch {
        // Fall back to report history below.
    }

    return readReportHistory<AIReport>()
        .map((storedReport) => ({
            id: `report-${storedReport.generatedAt}`,
            prompt: REPORT_PROMPT_TEXT,
            report: normalizeReport(storedReport.report),
            generatedAt: storedReport.generatedAt,
        }))
        .filter((storedReport) => storedReport.generatedAt);
}

function saveReportConversationEntry(entry: ReportConversationEntry) {
    const history = readReportConversationHistory();
    const nextHistory = [entry, ...history.filter((item) => item.id !== entry.id)].slice(0, 20);
    localStorage.setItem(REPORT_CONVERSATION_KEY, JSON.stringify(nextHistory));
    window.dispatchEvent(new Event("visionguard-storage-updated"));
    return nextHistory;
}

function normalizeReport(report: Partial<AIReport>): AIReport {
    return {
        summary: report.summary ?? "Your eye-care report is ready.",
        trendInsight: report.trendInsight,
        riskLevel: report.riskLevel ?? report.risk_level ?? "medium",
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

function persistVisibleReport(report: AIReport, generatedAt = new Date().toISOString()) {
    const storedReport = saveLatestReport(report, generatedAt);
    return {
        report: storedReport.report,
        generatedAt: storedReport.generatedAt,
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

async function buildReportPayload(liveMetrics?: EyeMetrics): Promise<ReportPayload> {
    let currentMetrics: Record<string, unknown> = {};
    try {
        currentMetrics = await fetchCurrentMetrics();
    } catch (error) {
        console.warn("Unable to read backend stats for report payload:", error);
    }

    const samples = readMetricSamples()
        .filter((sample) => !sample.isCalibrating)
        .sort((a, b) => b.timestamp - a.timestamp);
    const latest = samples[0];
    const reminderEvents = readReminderEvents()
        .sort((a, b) => b.triggeredAt - a.triggeredAt)
        .slice(0, 8);
    const dailyStats = readDailySummaries();
    const latestMetrics = readLatestMetrics();
    const storedReminders = readReminderEvents();
    const previousReport = readLatestReport();
    const latestScore = numberOrNull(liveMetrics?.eyeHealthScore)
        ?? numberOrNull(latestMetrics?.eyeHealthScore)
        ?? latest?.eyeHealthScore
        ?? numberOrNull(currentMetrics.eyeHealthScore)
        ?? null;
    const distanceCm = numberOrNull(liveMetrics?.distanceCm)
        ?? numberOrNull(latestMetrics?.distanceCm)
        ?? latest?.distanceCm
        ?? numberOrNull(currentMetrics.distanceCm)
        ?? null;
    const brightnessLux = numberOrNull(liveMetrics?.brightnessLux)
        ?? numberOrNull(latestMetrics?.brightnessLux)
        ?? latest?.brightnessLux
        ?? numberOrNull(currentMetrics.brightnessLux)
        ?? null;

    return {
        blinkRate: numberOrNull(liveMetrics?.blinkRate) ?? numberOrNull(latestMetrics?.blinkRate) ?? latest?.blinkRate ?? numberOrNull(currentMetrics.blinkRate) ?? null,
        viewingDistance: distanceCm,
        distanceCm,
        brightness: brightnessLux,
        brightnessLux,
        useTimeSeconds: numberOrNull(liveMetrics?.useTimeSeconds) ?? numberOrNull(latestMetrics?.useTimeSeconds) ?? latest?.useTimeSeconds ?? numberOrNull(currentMetrics.useTimeSeconds) ?? null,
        sessionUseTimeSeconds: numberOrNull(liveMetrics?.sessionUseTimeSeconds) ?? numberOrNull(latestMetrics?.sessionUseTimeSeconds) ?? latest?.sessionUseTimeSeconds ?? numberOrNull(currentMetrics.sessionUseTimeSeconds) ?? null,
        totalUseTimeSeconds: numberOrNull(liveMetrics?.totalUseTimeSeconds) ?? numberOrNull(latestMetrics?.totalUseTimeSeconds) ?? latest?.totalUseTimeSeconds ?? numberOrNull(currentMetrics.totalUseTimeSeconds) ?? null,
        eyeHealthScore: latestScore,
        selectedDate: new Date().toISOString().slice(0, 10),
        recentSamples: samples.slice(0, 8),
        reminders: storedReminders.length > 0 ? storedReminders : reminderEvents,
        latestMetrics,
        dailyStats,
        previousReport: previousReport
            ? {
                ...previousReport,
                contextOnly: true,
                note: "Historical context only. Do not describe this as the current score.",
            }
            : null,
    };
}

function scoreStatus(score: number) {
    if (score >= 85) return { label: "Good", className: "good-status" };
    if (score >= 70) return { label: "Attention", className: "attention-status" };
    if (score >= 50) return { label: "Warning", className: "warning-status" };
    return { label: "High Risk", className: "warning-status" };
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

function ReportArticle({
    report,
    generatedAt,
    currentScore,
}: {
    report: AIReport;
    generatedAt: string;
    currentScore: number;
}) {
    const mainFindings = [...(report.keyFindings ?? []), ...(report.issues ?? [])];
    const riskFactors = [...(report.riskFactors ?? []), ...(report.behaviorTrends ?? []), ...(report.fatigueAnalysis ?? [])];
    const suggestions = [...(report.recommendations ?? []), ...(report.suggestions ?? [])];
    const reportStatus = scoreStatus(report.score);
    const scoreChanged = Math.abs(currentScore - report.score) > 5;

    return (
        <article style={{ background: "#ffffff", border: "1px solid #dbe3ef", borderRadius: "22px", boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)", padding: "24px" }}>
            <div style={{ alignItems: "flex-start", display: "flex", gap: "16px", justifyContent: "space-between" }}>
                <div style={{ display: "grid", gap: "14px" }}>
                    <div>
                        <p className="eyebrow">Current Monitoring Score</p>
                        <h2 style={{ marginTop: 0 }}>{currentScore} / 100</h2>
                        <p className="panel-helper">
                            This reflects your latest VisionGuard monitoring score.
                        </p>
                    </div>
                    <div>
                        <p className="eyebrow">Report Snapshot Score</p>
                        <h3 style={{ margin: "0 0 6px" }}>{report.score} / 100</h3>
                        <p className="panel-helper">
                            This report was generated from monitoring data at {generatedAt ? new Date(generatedAt).toLocaleString() : "the saved session"}.
                        </p>
                    </div>
                </div>
                <span className={`status-badge ${reportStatus.className}`}>
                    {reportStatus.label}
                </span>
            </div>

            {scoreChanged && (
                <div className="risk-notice highlighted" style={{ marginTop: "16px", whiteSpace: "normal" }}>
                    Your latest monitoring score has changed since this report was generated. Generate a new report to refresh the analysis.
                </div>
            )}

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
                    <li>Viewing distance describes how far you sit from the screen. A comfortable target is usually around an arm's length.</li>
                    <li>Brightness reflects the surrounding light estimated from the camera. Very dim or glaring light can feel tiring.</li>
                    <li>Session time shows how long the current screen-use period has lasted. Longer sessions benefit from short visual breaks.</li>
                </ul>
            </section>

            <div className="risk-notice highlighted" style={{ marginTop: "16px", whiteSpace: "normal" }}>
                Disclaimer: This is not a medical diagnosis. It is eye-care habit guidance based on VisionGuard activity patterns.
            </div>
        </article>
    );
}

function ReportPage({ onOpenSettings }: ReportPageProps) {
    const { metrics, isMonitoring } = useMonitoring();
    const username = localStorage.getItem("visionguard_username") || "Katherine";
    const userInitial = username.charAt(0).toUpperCase();
    const savedReport = readSavedReport();
    const [report, setReport] = useState<AIReport | null>(() => savedReport?.report ?? null);
    const [reportConversation, setReportConversation] = useState(readReportConversationHistory);
    const [latestSharedMetrics, setLatestSharedMetrics] = useState(readLatestMetrics);
    const [generatedAt, setGeneratedAt] = useState(() => savedReport?.generatedAt ?? "");
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState("");
    const [hasMonitoringData, setHasMonitoringData] = useState(() => readMetricSamples().some((sample) => !sample.isCalibrating));
    const currentScore = isMonitoring
        ? metrics.eyeHealthScore
        : numberOrNull(latestSharedMetrics?.eyeHealthScore) ?? report?.score ?? metrics.eyeHealthScore;

    useEffect(() => {
        const refreshSavedReport = () => {
            const savedReport = readSavedReport();
            setLatestSharedMetrics(readLatestMetrics());
            setReportConversation(readReportConversationHistory());
            if (savedReport) {
                setReport(savedReport.report);
                setGeneratedAt(savedReport.generatedAt);
            }
        };

        refreshSavedReport();
        return subscribeLocalData(refreshSavedReport);
    }, []);

    const generateReport = async () => {
        setLoading(true);
        setNotice("");

        try {
            const payload = await buildReportPayload(metrics);
            setHasMonitoringData(payload.recentSamples.length > 0);
            console.log("REPORT PAYLOAD", payload);

            const response = await fetch("http://127.0.0.1:5000/api/report", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json() as ReportResponse;
            console.log("REPORT RESPONSE", data);

            if (data.report) {
                const nextReport = normalizeReport(data.report);
                const nextGeneratedAt = new Date().toISOString();
                setReport(nextReport);
                setGeneratedAt(nextGeneratedAt);
                setNotice(data.success ? "" : "The report was generated with backup guidance and saved here.");

                try {
                    const savedReport = persistVisibleReport(nextReport, nextGeneratedAt);
                    setGeneratedAt(savedReport.generatedAt);
                } catch (storageError) {
                    console.warn("Failed to save report locally:", storageError);
                }

                try {
                    setReportConversation(saveReportConversationEntry({
                        id: `report-${nextGeneratedAt}`,
                        prompt: REPORT_PROMPT_TEXT,
                        report: nextReport,
                        generatedAt: nextGeneratedAt,
                    }));
                } catch (storageError) {
                    console.warn("Failed to save report conversation locally:", storageError);
                }

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
                            {reportConversation.map((storedReport) => (
                                <div key={storedReport.generatedAt} style={{ display: "grid", gap: "18px" }}>
                                    <div style={{ alignItems: "flex-end", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                                    <div style={{ background: "#2563eb", borderRadius: "18px 18px 6px 18px", color: "#ffffff", fontWeight: 800, maxWidth: "520px", padding: "14px 18px" }}>
                                        {storedReport.prompt}
                                    </div>
                                    <div style={{ alignItems: "center", background: "linear-gradient(135deg, #94a3b8, #475569)", borderRadius: "50%", color: "#ffffff", display: "flex", flex: "0 0 auto", fontWeight: 900, height: "40px", justifyContent: "center", width: "40px" }}>
                                        {userInitial}
                                    </div>
                                    </div>
                                    <ReportArticle
                                        currentScore={currentScore}
                                        generatedAt={storedReport.generatedAt}
                                        report={storedReport.report}
                                    />
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

                            {report && reportConversation.length === 0 && (
                                <ReportArticle currentScore={currentScore} generatedAt={generatedAt} report={report} />
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
