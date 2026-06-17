import { useState } from "react";

import { generateAIReport } from "../api/client";
import { useMonitoring } from "../context/MonitoringContext";

function AIReportCard() {
    const { metrics } = useMonitoring();
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportSummary, setReportSummary] = useState("Your viewing distance and brightness look healthy. Continuous screen time is slightly increasing.");
    const [mainIssue, setMainIssue] = useState("Continuous use time is increasing. Take breaks more frequently.");
    const [recommendations, setRecommendations] = useState([
        "Take a 3-minute break every 20 minutes",
        "Keep screen distance above 40 cm",
        "Maintain ambient light above 200 lux",
    ]);

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        try {
            const response = await generateAIReport(metrics);
            const report = response.report;
            if (report) {
                setReportSummary(report.summary ?? reportSummary);
                setMainIssue(report.issues?.[0] ?? report.score_explanation ?? mainIssue);
                setRecommendations(report.recommendations ?? recommendations);
            }
        } catch (error) {
            console.warn("Failed to generate AI report:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <section className="panel ai-report-card">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">AI Insight</p>
                    <h2>AI Eye-care Report</h2>
                </div>
                <span className="status-badge ai-status">LLM Generated</span>
            </div>

            <div className="ai-report-card-content">
                <div className="ai-report-cards">
                    <div className="report-section report-summary">
                        <h3>Summary</h3>
                        <p>{reportSummary}</p>
                    </div>

                    <div className="report-section report-main">
                        <h3>Main Issue</h3>
                        <p>{mainIssue}</p>
                    </div>

                    <div className="report-section report-suggestions">
                        <h3>Suggestions</h3>
                        <ul>
                            {recommendations.map((recommendation) => (
                                <li key={recommendation}>{recommendation}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="risk-notice highlighted">
                    This is not medical diagnosis.
                </div>
            </div>

            <div className="card-action-row">
                <button className="primary-button" disabled={isGenerating} onClick={() => void handleGenerateReport()} type="button">
                    {isGenerating ? "Generating..." : "Generate Report"}
                </button>
            </div>
        </section>
    );
}

export default AIReportCard;
