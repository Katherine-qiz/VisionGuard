import { useEffect, useState } from "react";
import "./App.css";

type EyeMetrics = {
  blinkRate: number;
  distanceCm: number;
  brightnessLux: number;
  useTimeSeconds: number;
  eyeHealthScore: number;
};

function App() {
  const [metrics, setMetrics] = useState<EyeMetrics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/stats")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch stats");
        }
        return response.json();
      })
      .then((data) => {
        setMetrics(data);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  return (
    <div className="app">
      <header className="hero">
        <p className="eyebrow">VisionGuard MVP</p>
        <h1>AI-powered Eye-care Habit Monitoring</h1>
        <p className="subtitle">
          Track blink rate, viewing distance, ambient brightness and screen time.
        </p>
      </header>

      {error && <p className="error">Error: {error}</p>}

      {metrics ? (
        <section className="dashboard">
          <div className="card">
            <span className="label">Blink Rate</span>
            <strong>{metrics.blinkRate}</strong>
            <span className="unit">/ min</span>
          </div>

          <div className="card">
            <span className="label">Viewing Distance</span>
            <strong>{metrics.distanceCm}</strong>
            <span className="unit">cm</span>
          </div>

          <div className="card">
            <span className="label">Brightness</span>
            <strong>{metrics.brightnessLux}</strong>
            <span className="unit">lux</span>
          </div>

          <div className="card">
            <span className="label">Use Time</span>
            <strong>{Math.round(metrics.useTimeSeconds / 60)}</strong>
            <span className="unit">min</span>
          </div>

          <div className="card score-card">
            <span className="label">Eye Health Score</span>
            <strong>{metrics.eyeHealthScore}</strong>
            <span className="unit">/ 100</span>
          </div>
        </section>
      ) : (
        <p className="loading">Loading metrics...</p>
      )}
    </div>
  );
}

export default App;