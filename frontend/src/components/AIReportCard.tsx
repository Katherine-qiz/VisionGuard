function AIReportCard() {
    return (
        <section className="panel ai-report-card">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">AI Insight</p>
                    <h2>AI Eye-care Report</h2>
                </div>
                <span className="status-badge ai-status">LLM Generated</span>
            </div>

            <div className="report-grid">
                <div className="report-section report-summary">
                    <h3>Summary</h3>
                    <p>
                        Your viewing distance and brightness look healthy. Your continuous
                        screen time is increasing, so a short break is recommended.
                    </p>
                </div>

                <div className="report-section">
                    <h3>Main Issue</h3>
                    <p>Continuous use time is increasing.</p>
                </div>

                <div className="report-section">
                    <h3>Suggestions</h3>
                    <ul>
                        <li>Take a 3-minute break.</li>
                        <li>Keep screen distance above 40 cm.</li>
                        <li>Maintain ambient light above 200 lux.</li>
                    </ul>
                </div>
            </div>

            <div className="report-footer">
                <div className="risk-notice">This is not medical diagnosis.</div>
                <button className="primary-button report-button">Generate Report</button>
            </div>
        </section>
    );
}

export default AIReportCard;
