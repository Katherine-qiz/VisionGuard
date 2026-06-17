import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";

import { analyzeFrame, fetchEyeMetrics, resetAnalyzerSession } from "../api/client";
import type { EyeMetrics } from "../types/metrics";
import type { Reminder } from "../types/reminder";
import { dateKey, saveMetricSample } from "../utils/metricsStorage";
import { sendBrowserNotification } from "../utils/notification";
import { evaluateReminders, resetReminderEngineState } from "../utils/reminderEngine";
import { evaluateRisk, resetSustainedRiskState, type RiskResult } from "../utils/riskEngine";
import { getCurrentUserId } from "../utils/user";

const ANALYZE_INTERVAL_MS = 180;
const ANALYZE_FRAME_WIDTH = 480;
const ANALYZE_FRAME_HEIGHT = 360;

const DEFAULT_METRICS: EyeMetrics = {
    blinkRate: 0,
    rawBlinkRate: 0,
    smoothedBlinkRate: 0,
    blinkCount: 0,
    distanceCm: 0,
    brightnessLux: 0,
    useTimeSeconds: 0,
    sessionUseTimeSeconds: 0,
    totalUseTimeSeconds: 0,
    avgSessionUseTimeSeconds: 0,
    activeScreenTimeSeconds: 0,
    continuousUseTimeSeconds: 0,
    breakDurationSeconds: 0,
    isCalibrating: true,
    eyeHealthScore: 80,
    scoreLevel: "Good",
    useTimeStatus: "normal",
    scoreIssue: "none",
    fps: 0,
    ear: 0,
    earBaseline: 0.25,
    blinkThreshold: 0,
    isBlinking: false,
    blinkEventsInWindow: 0,
    blinkWindowSeconds: 0,
    faceDetected: false,
    alerts: [],
};

type MonitoringContextValue = {
    isMonitoring: boolean;
    isStarting: boolean;
    errorMessage: string | null;
    metrics: EyeMetrics;
    processedFrame: string | null;
    rawStream: MediaStream | null;
    riskResult: RiskResult;
    cardReminders: Reminder[];
    notificationPermission: NotificationPermission | "unsupported";
    startMonitoring: () => Promise<void>;
    stopMonitoring: () => void;
    setPreviewVideoElement: (video: HTMLVideoElement | null) => void;
};

const MonitoringContext = createContext<MonitoringContextValue | null>(null);

function getNotificationPermission(): NotificationPermission | "unsupported" {
    if (typeof window === "undefined" || !("Notification" in window)) {
        return "unsupported";
    }

    return Notification.permission;
}

export function MonitoringProvider({ children }: { children: ReactNode }) {
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [metrics, setMetrics] = useState<EyeMetrics>(DEFAULT_METRICS);
    const [processedFrame, setProcessedFrame] = useState<string | null>(null);
    const [rawStream, setRawStream] = useState<MediaStream | null>(null);
    const [cardReminders, setCardReminders] = useState<Reminder[]>([]);
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(
        getNotificationPermission(),
    );
    const [riskResult, setRiskResult] = useState<RiskResult>(() => evaluateRisk(DEFAULT_METRICS));

    const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const isAnalyzingRef = useRef(false);
    const monitoringStartedAtRef = useRef<number | null>(null);
    const lastSampleSavedAtRef = useRef(0);
    const lastVideoNotReadyLogRef = useRef(0);
    const lastAnalyzeTickLogRef = useRef(0);
    const rawStreamRef = useRef<MediaStream | null>(null);
    const previewVideoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        hiddenVideoRef.current = document.createElement("video");
        hiddenVideoRef.current.muted = true;
        hiddenVideoRef.current.playsInline = true;
        hiddenVideoRef.current.autoplay = true;
        hiddenVideoRef.current.style.position = "fixed";
        hiddenVideoRef.current.style.left = "-9999px";
        hiddenVideoRef.current.style.top = "0";
        hiddenVideoRef.current.style.width = "1px";
        hiddenVideoRef.current.style.height = "1px";
        hiddenVideoRef.current.setAttribute("aria-hidden", "true");
        hiddenVideoRef.current.onloadedmetadata = () => {
            const video = hiddenVideoRef.current;
            if (!video) return;

            console.log("[Monitoring] hidden video metadata loaded", {
                width: video.videoWidth,
                height: video.videoHeight,
                readyState: video.readyState,
            });

            void video.play().catch((err) => {
                console.warn("[Monitoring] hidden video play failed after metadata", err);
            });
        };
        document.body.appendChild(hiddenVideoRef.current);
        canvasRef.current = document.createElement("canvas");

        fetchEyeMetrics()
            .then((data) => {
                const nextRiskResult = evaluateRisk(data);
                setMetrics({
                    ...data,
                    debugBackendScore: data.debugBackendScore ?? data.eyeHealthScore,
                    eyeHealthScore: nextRiskResult.score,
                    scoreLevel: nextRiskResult.scoreLevel,
                });
                setRiskResult(nextRiskResult);
            })
            .catch((err) => {
                console.warn("Initial metrics fetch failed:", err);
            });

        return () => {
            rawStreamRef.current?.getTracks().forEach((track) => track.stop());
            hiddenVideoRef.current?.remove();
        };
    }, []);

    useEffect(() => {
        rawStreamRef.current = rawStream;
    }, [rawStream]);

    useEffect(() => {
        const video = hiddenVideoRef.current;
        if (!video) return;

        if (rawStream) {
            video.srcObject = rawStream;
            video.onloadedmetadata = () => {
                console.log("[Monitoring] hidden video metadata loaded", {
                    width: video.videoWidth,
                    height: video.videoHeight,
                    readyState: video.readyState,
                });

                void video.play().catch((err) => {
                    console.warn("[Monitoring] hidden video play failed after metadata", err);
                });
            };

            void video.play().catch((err) => {
                console.warn("[Monitoring] hidden video play failed", err);
            });
            return;
        }

        video.srcObject = null;
    }, [rawStream]);

    const setPreviewVideoElement = useCallback((video: HTMLVideoElement | null) => {
        previewVideoRef.current = video;
    }, []);

    const stopMonitoring = useCallback(() => {
        setIsMonitoring(false);
        monitoringStartedAtRef.current = null;
        isAnalyzingRef.current = false;
        setCardReminders([]);
        resetReminderEngineState();
        resetSustainedRiskState();

        setRawStream((stream) => {
            stream?.getTracks().forEach((track) => track.stop());
            return null;
        });
    }, []);

    const startMonitoring = useCallback(async () => {
        console.log("[Monitoring] start clicked");
        setIsStarting(true);
        setErrorMessage(null);

        try {
            if (isMonitoring && rawStream) {
                setIsStarting(false);
                return;
            }

            const stream = rawStream ?? await navigator.mediaDevices.getUserMedia({ video: true });
            console.log("[Monitoring] camera stream received", stream);

            setRawStream(stream);
            setIsMonitoring(true);
            setIsStarting(false);
            setCardReminders([]);
            monitoringStartedAtRef.current = Date.now();
            lastSampleSavedAtRef.current = 0;
            resetReminderEngineState();
            resetSustainedRiskState();
            void resetAnalyzerSession().catch((err) => {
                console.warn("[Monitoring] backend reset failed, monitoring continues", err);
            });

            if ("Notification" in window && Notification.permission === "default") {
                const permission = await Notification.requestPermission();
                setNotificationPermission(permission);
            } else {
                setNotificationPermission(getNotificationPermission());
            }
        } catch (err) {
            setIsStarting(false);
            setErrorMessage("Unable to access camera. Please check browser permission.");
            console.error("Error accessing camera:", err);
            alert("无法访问摄像头，请检查权限。");
        }
    }, [isMonitoring, rawStream]);

    useEffect(() => {
        if (!isMonitoring || !rawStream) return;

        const intervalId = window.setInterval(async () => {
            if (isAnalyzingRef.current) return;

            const sourceVideo = previewVideoRef.current ?? hiddenVideoRef.current;
            const canvas = canvasRef.current;

            if (Date.now() - lastAnalyzeTickLogRef.current > 2000) {
                console.log("[Monitoring] analyze loop alive", {
                    isMonitoring,
                    hasRawStream: Boolean(rawStream),
                    videoReadyState: sourceVideo?.readyState,
                    videoWidth: sourceVideo?.videoWidth,
                    videoHeight: sourceVideo?.videoHeight,
                });
                lastAnalyzeTickLogRef.current = Date.now();
            }

            if (!sourceVideo || !canvas) return;
            if (sourceVideo.videoWidth === 0 || sourceVideo.videoHeight === 0) {
                if (Date.now() - lastVideoNotReadyLogRef.current > 2000) {
                    console.warn("[Monitoring] hidden video not ready", {
                        readyState: sourceVideo.readyState,
                        videoWidth: sourceVideo.videoWidth,
                        videoHeight: sourceVideo.videoHeight,
                        hasStream: Boolean(rawStream),
                        usingPreviewVideo: sourceVideo === previewVideoRef.current,
                    });
                    lastVideoNotReadyLogRef.current = Date.now();
                }
                return;
            }

            canvas.width = ANALYZE_FRAME_WIDTH;
            canvas.height = ANALYZE_FRAME_HEIGHT;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            ctx.drawImage(sourceVideo, 0, 0, ANALYZE_FRAME_WIDTH, ANALYZE_FRAME_HEIGHT);
            const imageBase64 = canvas.toDataURL("image/jpeg", 0.55);
            // TODO: remove debug logs after monitoring startup is stable.
            console.log("[Monitoring] sending frame to backend");

            isAnalyzingRef.current = true;

            try {
                const result = await analyzeFrame(imageBase64);
                console.log("[Monitoring] analyze result", {
                    success: result.success,
                    faceDetected: result.faceDetected,
                    distanceCm: result.distanceCm,
                    brightnessLux: result.brightnessLux,
                    blinkRate: result.blinkRate,
                    hasProcessedFrame: Boolean(result.processedFrame),
                });
                if (result.processedFrame) {
                    setProcessedFrame(result.processedFrame);
                }

                const nextRiskResult = evaluateRisk(result);
                const scoredMetrics: EyeMetrics = {
                    ...result,
                    debugBackendScore: result.debugBackendScore ?? result.eyeHealthScore,
                    eyeHealthScore: nextRiskResult.score,
                    scoreLevel: nextRiskResult.scoreLevel,
                };

                setMetrics(scoredMetrics);
                setRiskResult(nextRiskResult);

                const startedAt = monitoringStartedAtRef.current;
                const userId = getCurrentUserId();
                if (startedAt) {
                    const monitoringDurationSeconds = Math.floor((Date.now() - startedAt) / 1000);
                    const reminderResult = evaluateReminders(scoredMetrics, {
                        monitoringDurationSeconds,
                        reminders: nextRiskResult.reminders,
                        userId,
                        allowFocusedNotification: true,
                    });

                    console.log("browser reminders:", reminderResult.browserReminders);
                    console.log("card reminders:", reminderResult.cardReminders);

                    setCardReminders(reminderResult.cardReminders);
                    reminderResult.browserReminders.forEach((reminder) => {
                        sendBrowserNotification(reminder, true);
                    });
                }

                if (scoredMetrics.faceDetected && !scoredMetrics.isCalibrating && Date.now() - lastSampleSavedAtRef.current >= 5000) {
                    saveMetricSample(
                        userId,
                        scoredMetrics,
                        nextRiskResult.risks,
                        nextRiskResult.reminders,
                    );
                    console.log("[Storage] metric sample saved", {
                        userId,
                        date: dateKey(),
                        score: scoredMetrics.eyeHealthScore,
                        faceDetected: scoredMetrics.faceDetected,
                    });
                    lastSampleSavedAtRef.current = Date.now();
                }
            } catch (err) {
                console.error("Analyze frame failed:", err);
            } finally {
                isAnalyzingRef.current = false;
            }
        }, ANALYZE_INTERVAL_MS);

        return () => {
            window.clearInterval(intervalId);
            isAnalyzingRef.current = false;
        };
    }, [isMonitoring, rawStream]);

    const value = useMemo<MonitoringContextValue>(() => ({
        isMonitoring,
        isStarting,
        errorMessage,
        metrics,
        processedFrame,
        rawStream,
        riskResult,
        cardReminders,
        notificationPermission,
        startMonitoring,
        stopMonitoring,
        setPreviewVideoElement,
    }), [
        isMonitoring,
        isStarting,
        errorMessage,
        metrics,
        processedFrame,
        rawStream,
        riskResult,
        cardReminders,
        notificationPermission,
        startMonitoring,
        stopMonitoring,
        setPreviewVideoElement,
    ]);

    return (
        <MonitoringContext.Provider value={value}>
            {children}
        </MonitoringContext.Provider>
    );
}

export function useMonitoring() {
    const context = useContext(MonitoringContext);
    if (!context) {
        throw new Error("useMonitoring must be used within MonitoringProvider");
    }

    return context;
}
