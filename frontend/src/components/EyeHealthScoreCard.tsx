type EyeHealthScoreCardProps = {
    score: number;
};

function EyeHealthScoreCard({ score }: EyeHealthScoreCardProps) {
    return (
        <article className="metric-card score-card">
            <div className="metric-card-top">
                <span>Eye Health Score</span>
                <span className="status-badge good-status">Healthy</span>
            </div>

            <div className="metric-value">
                <strong>{score}</strong>
                <span>/ 100</span>
            </div>

            <div className="score-bar">
                <div style={{ width: `${score}%` }} />
            </div>
        </article>
    );
}

export default EyeHealthScoreCard;