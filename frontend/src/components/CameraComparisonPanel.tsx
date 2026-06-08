function CameraComparisonPanel() {
    return (
        <section className="panel camera-panel">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">Camera Analysis</p>
                    <h2>Raw input to backend processing</h2>
                </div>
                <span className="status-badge active-status">Analyzing in real time</span>
            </div>

            <div className="camera-comparison">
                <div className="camera-card raw-camera">
                    <div className="camera-card-header">
                        <span>Raw Camera Feed</span>
                        <span className="status-badge neutral-status">Original input</span>
                    </div>

                    <div className="camera-placeholder">
                        <div className="face-placeholder">
                            <div className="face-head" />
                            <div className="face-body" />
                        </div>
                    </div>

                    <p className="camera-note">
                        Raw frames are processed in real time and are not stored.
                    </p>
                </div>

                <div className="processing-arrow">
                    <span>Backend CV Processing</span>
                    <strong>→</strong>
                </div>

                <div className="camera-card processed-camera">
                    <div className="camera-card-header">
                        <span>Processed by Backend</span>
                        <span className="status-badge ai-status">Computer vision analysis</span>
                    </div>

                    <div className="camera-placeholder processed-view">
                        <div className="face-placeholder">
                            <div className="face-head" />
                            <div className="eye-box left-eye" />
                            <div className="eye-box right-eye" />
                            <div className="face-boundary" />
                            <div className="face-body" />
                        </div>
                    </div>

                    <div className="tag-row">
                        <span>Face detected</span>
                        <span>Eye landmarks active</span>
                        <span>Distance estimated</span>
                    </div>
                </div>
            </div>

            <div className="camera-actions">
                <button className="primary-button">Start Monitoring</button>
                <button className="secondary-button">Stop</button>
            </div>
        </section>
    );
}

export default CameraComparisonPanel;