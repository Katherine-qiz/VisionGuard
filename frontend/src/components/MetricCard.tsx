type MetricCardProps = {
    title: string;
    value: string | number;
    unit: string;
    status: string;
    statusType?: "good" | "attention" | "warning" | "neutral";
};

function MetricCard({
    title,
    value,
    unit,
    status,
    statusType = "neutral",
}: MetricCardProps) {
    return (
        <article className="metric-card">
            <div className="metric-card-top">
                <span>{title}</span>
                <span className={`status-badge ${statusType}-status`}>{status}</span>
            </div>

            <div className="metric-value">
                <strong>{value}</strong>
                <span>{unit}</span>
            </div>
        </article>
    );
}

export default MetricCard;