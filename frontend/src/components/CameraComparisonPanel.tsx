// frontend/src/components/CameraComparisonPanel.tsx
import { useRef, useState } from "react";

function CameraComparisonPanel() {
    const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
    const rawVideoRef = useRef<HTMLVideoElement>(null);

    // 开启摄像头
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setVideoStream(stream);
            if (rawVideoRef.current) rawVideoRef.current.srcObject = stream;
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("无法访问摄像头，请检查权限。");
        }
    };

    // 停止摄像头
    const stopCamera = () => {
        if (videoStream) {
            videoStream.getTracks().forEach((track) => track.stop());
            setVideoStream(null);
        }
        if (rawVideoRef.current) rawVideoRef.current.srcObject = null;
    };

    return (
        <section className="panel camera-panel">
            <div className="panel-header">
                <div>
                    <p className="eyebrow">Camera Analysis</p>
                    <h2>Raw input to backend processing</h2>
                </div>
                <span className="status-badge active-status">Monitoring</span>
            </div>

            <div className="camera-comparison">
                {/* Raw Camera Feed */}
                <article className="camera-card">
                    <div className="camera-card-header">
                        <span>Raw Camera Feed</span>
                        <span className="status-badge neutral-status">Original input</span>
                    </div>
                    <div className="camera-preview raw-preview">
                        {!videoStream && (
                            <div className="raw-avatar" aria-hidden="true">
                                <div className="raw-avatar-head" />
                                <div className="raw-avatar-body" />
                            </div>
                        )}
                        <video
                            className={`raw-video${videoStream ? " active" : ""}`}
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

                {/* 处理箭头 */}
                <div className="processing-step">
                    <span>Backend CV</span>
                    <span>Processing</span>
                    <strong>→</strong>
                </div>

                {/* Processed Camera Feed 占位 */}
                <article className="camera-card">
                    <div className="camera-card-header">
                        <span>Processed by Backend</span>
                        <span className="status-badge ai-status">Computer vision</span>
                    </div>
                    <div className="camera-preview processed-placeholder">
                        <div className="processed-avatar" aria-hidden="true">
                            <div className="processed-avatar-head" />
                            <div className="processed-face-boundary" />
                            <div className="processed-eye-box processed-left-eye" />
                            <div className="processed-eye-box processed-right-eye" />
                            <div className="processed-avatar-body" />
                        </div>
                    </div>
                    <div className="tag-row">
                        <span>Face detected</span>
                        <span>Eye landmarks active</span>
                        <span>Distance estimated</span>
                    </div>
                </article>
            </div>

            <div className="camera-actions">
                <button className="primary-button" onClick={startCamera}>
                    Start Monitoring
                </button>
                <button className="secondary-button" onClick={stopCamera}>
                    Stop
                </button>
            </div>
        </section>
    );
}

export default CameraComparisonPanel;
