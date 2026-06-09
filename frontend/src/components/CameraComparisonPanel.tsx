// frontend/src/components/CameraComparisonPanel.tsx
import { useEffect, useRef, useState } from "react";

import { analyzeFrame } from "../api/client";
import type { EyeMetrics } from "../types/metrics";

type CameraComparisonPanelProps = {
    onAnalysisResult?: (metrics: EyeMetrics) => void;
};

function CameraComparisonPanel({ onAnalysisResult }: CameraComparisonPanelProps) {
    const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
    const [isMonitoring, setIsMonitoring] = useState(false);

    const rawVideoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // 开启摄像头
    const startCamera = async () => {
        try {
            // 避免重复点击 Start 时创建多个 stream
            if (videoStream) {
                setIsMonitoring(true);
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setVideoStream(stream);

            if (rawVideoRef.current) {
                rawVideoRef.current.srcObject = stream;
            }

            setIsMonitoring(true);
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("无法访问摄像头，请检查权限。");
        }
    };

    // 停止摄像头
    const stopCamera = () => {
        setIsMonitoring(false);

        if (videoStream) {
            videoStream.getTracks().forEach((track) => track.stop());
            setVideoStream(null);
        }

        if (rawVideoRef.current) {
            rawVideoRef.current.srcObject = null;
        }
    };

    // videoStream 改变后，把 stream 重新绑定到 video
    useEffect(() => {
        if (rawVideoRef.current && videoStream) {
            rawVideoRef.current.srcObject = videoStream;
        }
    }, [videoStream]);

    // 每 2 秒截取一帧，发送到 Flask /api/analyze
    useEffect(() => {
        if (!isMonitoring || !videoStream) return;

        const intervalId = window.setInterval(async () => {
            const video = rawVideoRef.current;
            const canvas = canvasRef.current;

            if (!video || !canvas) return;
            if (video.videoWidth === 0 || video.videoHeight === 0) return;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageBase64 = canvas.toDataURL("image/jpeg", 0.75);

            try {
                const result = await analyzeFrame(imageBase64);
                console.log("Analyze result:", result);
                onAnalysisResult?.(result);
            } catch (err) {
                console.error("Analyze frame failed:", err);
            }
        }, 2000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [isMonitoring, videoStream, onAnalysisResult]);

    // 组件卸载时关闭摄像头，避免摄像头一直占用
    useEffect(() => {
        return () => {
            if (videoStream) {
                videoStream.getTracks().forEach((track) => track.stop());
            }
        };
    }, [videoStream]);

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

                {/* Processing Step */}
                <div className="processing-step" aria-label="Backend computer vision processing">
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

            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} style={{ display: "none" }} />
        </section>
    );
}

export default CameraComparisonPanel;
