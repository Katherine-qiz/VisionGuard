type MetricCardProps = {
    icon?: string;
    title: string;
    value: string | number;
    unit: string;
    status: string;
    statusType?: "good" | "attention" | "warning" | "neutral";
    helper?: string;
};

function MetricCard({
    icon,
    title,
    value,
    unit,
    status,
    statusType = "neutral",
    helper,
}: MetricCardProps) {
    return (
        <article className="metric-card">
            <div className="metric-card-top">
                <div className="metric-title-row">
                    {icon && <span className="metric-icon">{icon}</span>}
                    <span>{title}</span>
                </div>
                <span className={`status-badge ${statusType}-status`}>{status}</span>
            </div>

            <div className="metric-value">
                <strong>{value}</strong>
                <span>{unit}</span>
            </div>
            {helper && <p className="metric-helper">{helper}</p>}
        </article>
    );
}

export default MetricCard;
