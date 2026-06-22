import type { EyeMetrics, ScoreLevel } from "../types/metrics";

type EyeHealthScoreCardProps = {
    score: number;
    level?: ScoreLevel;
    metrics?: EyeMetrics;
    feedback?: {
        emoji: string;
        title: string;
        message: string;
    };
};

function EyeHealthScoreCard({
    score,
    level = "Good",
    metrics,
    feedback,
}: EyeHealthScoreCardProps) {
    const scoreStatusType =
        level === "Good"
            ? "good"
            : level === "Attention"
              ? "attention"
              : "warning";
    const fallbackFeedback =
        score >= 85
            ? {
                emoji: "😊",
                title: "Looking strong",
                message: "Great rhythm today. Keep your screen distance and blinking steady.",
            }
            : score >= 70
              ? {
                  emoji: "🙂",
                  title: "Nice progress",
                  message: "You are close to a healthy pattern. A short break can lift your score.",
              }
              : score >= 50
                ? {
                    emoji: "😌",
                    title: "Small reset time",
                    message: "Your eyes could use a little care. Adjust distance, lighting, or take a pause.",
                }
                : {
                    emoji: "🥺",
                    title: "Let's help your eyes",
                    message: "Take a real break now. VisionGuard will be here when you come back.",
                };
    const displayFeedback = feedback ?? fallbackFeedback;

    return (
        <article className="metric-card score-card">
            <div className="metric-card-top">
                <span>Eye Health Score</span>
                <span className={`status-badge ${scoreStatusType}-status`}>{level}</span>
            </div>

            <div className="metric-value">
                <strong>{score}</strong>
                <span>/ 100</span>
            </div>

            <div className="score-bar">
                <div style={{ width: `${score}%` }} />
            </div>

            <div className="score-feedback">
                <span className="score-mood" aria-hidden="true">{displayFeedback.emoji}</span>
                <div>
                    <strong>{displayFeedback.title}</strong>
                    <p>{displayFeedback.message}</p>
                </div>
            </div>

            <p className="score-summary">
                {metrics?.faceDetected
                    ? "Great job! Your eye-care habits are being monitored in real time."
                    : "Start monitoring and keep your face visible for a more accurate score."}
            </p>
        </article>
    );
}

export default EyeHealthScoreCard;
