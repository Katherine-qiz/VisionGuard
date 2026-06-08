import { useEffect, useState } from "react";
import { fetchEyeMetrics } from "../api/client";
import type { EyeMetrics } from "../types/metrics";

function DashboardPage() {
    const [metrics, setMetrics] = useState<EyeMetrics | null>(null);

    useEffect(() => {
        fetchEyeMetrics().then(setMetrics);
    }, []);

    return (
        <main className="page">
            <section className="simple-card">
                <p className="eyebrow">Dashboard</p>
                <h1>Hi, {localStorage.getItem("visionguard_username") || "Katherine"}</h1>
                <p className="subtitle">Let’s protect your eyes today.</p>

                {metrics ? (
                    <div className="mini-grid">
                        <div>Blink Rate: {metrics.blinkRate} / min</div>
                        <div>Distance: {metrics.distanceCm} cm</div>
                        <div>Brightness: {metrics.brightnessLux} lux</div>
                        <div>Use Time: {Math.round(metrics.useTimeSeconds / 60)} min</div>
                        <div>Score: {metrics.eyeHealthScore} / 100</div>
                    </div>
                ) : (
                    <p>Loading metrics...</p>
                )}
            </section>
        </main>
    );
}

export default DashboardPage;