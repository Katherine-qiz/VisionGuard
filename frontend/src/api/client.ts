// src/api/client.ts
import type { EyeMetrics } from "../types/metrics";

const API_BASE_URL = "http://127.0.0.1:5000";

type AnalyzeAlert = {
    type: string;
    level: string;
    message: string;
};

export type AnalyzeFrameResponse = EyeMetrics & {
    success: boolean;
    alerts: AnalyzeAlert[];
    faceDetected: boolean;
    processedFrame: string | null;
};

export async function fetchEyeMetrics(): Promise<EyeMetrics> {
    const res = await fetch(`${API_BASE_URL}/api/stats`);

    if (!res.ok) {
        throw new Error("Failed to fetch metrics");
    }

    return res.json();
}

export async function analyzeFrame(imageBase64: string): Promise<AnalyzeFrameResponse> {
    const res = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            image: imageBase64,
        }),
    });

    if (!res.ok) {
        throw new Error("Failed to analyze frame");
    }

    return res.json();
}
