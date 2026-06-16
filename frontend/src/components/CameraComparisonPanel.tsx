import { useEffect, useRef } from "react";

import { useMonitoring } from "../context/MonitoringContext";

function CameraComparisonPanel() {
    const {
        isMonitoring,
        isStarting,
        errorMessage,
        rawStream,
        processedFrame,
        startMonitoring,
        stopMonitoring,
        setPreviewVideoElement,
    } = useMonitoring();

    const rawVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        setPreviewVideoElement(rawVideoRef.current);
        return () => setPreviewVideoElement(null);
    }, [setPreviewVideoElement]);

    useEffect(() => {
        const video = rawVideoRef.current;
        if (!video) return;

        video.srcObject = rawStream;

        if (rawStream) {
            void video.play().catch((err) => {
                console.warn("Raw preview video failed to play:", err);
            });
        }
    }, [rawStream]);

    return (
        <section className="panel camera-panel">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">Camera Analysis</p>
                    <h2>Raw input to backend processing</h2>
                </div>
                <span className="status-badge active-status">
                    {isMonitoring ? "Monitoring" : "Standby"}
                </span>
            </div>

            <div className="camera-comparison">
                <article className="camera-card">
                    <div className="camera-card-header">
                        <span>Raw Camera Feed</span>
                        <span className="status-badge neutral-status">Original input</span>
                    </div>

                    <div className="camera-preview raw-preview">
                        {!rawStream && (
                            <div className="raw-avatar" aria-hidden="true">
                                <div className="raw-avatar-head" />
                                <div className="raw-avatar-body" />
                            </div>
                        )}

                        <video
                            className={`raw-video${rawStream ? " active" : ""}`}
                            ref={rawVideoRef}
                            autoPlay
                            playsInline
                            muted
                        />
                    </div>

                    <p className="camera-note">
                        Raw frames are processed in real time and are not stored.
                    </p>
                </article>

                <div className="processing-step" aria-label="Backend computer vision processing">
                    <span>Backend CV</span>
                    <span>Processing</span>
                    <strong>→</strong>
                </div>

                <article className="camera-card">
                    <div className="camera-card-header">
                        <span>Processed by Backend</span>
                        <span className="status-badge ai-status">Computer vision</span>
                    </div>

                    <div className="camera-preview processed-placeholder">
                        {processedFrame ? (
                            <img
                                className="processed-frame"
                                src={processedFrame}
                                alt="Processed camera frame"
                            />
                        ) : (
                            <div className="processed-avatar" aria-hidden="true">
                                <div className="processed-avatar-head" />
                                <div className="processed-face-boundary" />
                                <div className="processed-eye-box processed-left-eye" />
                                <div className="processed-eye-box processed-right-eye" />
                                <div className="processed-avatar-body" />
                            </div>
                        )}
                    </div>

                    <div className="tag-row">
                        <span>Face detected</span>
                        <span>Eye landmarks active</span>
                        <span>Distance estimated</span>
                    </div>
                </article>
            </div>

            <div className="camera-actions">
                <button
                    className="primary-button"
                    disabled={isStarting}
                    onClick={startMonitoring}
                    type="button"
                >
                    {isStarting ? "Starting..." : isMonitoring ? "Monitoring" : "Start Monitoring"}
                </button>

                <button className="secondary-button" onClick={stopMonitoring} type="button">
                    Stop
                </button>
            </div>

            {errorMessage && (
                <p className="camera-note error-text">{errorMessage}</p>
            )}
        </section>
    );
}

export default CameraComparisonPanel;
