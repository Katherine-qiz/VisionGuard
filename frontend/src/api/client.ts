// src/api/client.ts
import type { EyeMetrics } from "../types/metrics";

const API_BASE_URL = "http://127.0.0.1:5000";

export type AnalyzeFrameResponse = EyeMetrics & {
    success: boolean;
    processedFrame: string | null;
};

export async function fetchEyeMetrics(): Promise<EyeMetrics> {
    const res = await fetch(`${API_BASE_URL}/api/stats`);

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch metrics: ${res.status} ${errorText}`);
    }

    return res.json();
}

export async function resetAnalyzerSession(): Promise<void> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/reset`, {
            method: "POST",
        });

        if (!res.ok) {
            console.warn(`Backend reset returned ${res.status}`);
        }
    } catch (err) {
        console.warn("Failed to reset analyzer session:", err);
    }
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
