function TrendCard() {
    return (
        <section className="panel trend-card">
            <div className="panel-header compact">
                <div>
                    <p className="eyebrow">Trend</p>
                    <h2>Eye Health Trend</h2>
                </div>
            </div>

            <div className="trend-bars">
                <span style={{ height: "42%" }} />
                <span style={{ height: "56%" }} />
                <span style={{ height: "48%" }} />
                <span style={{ height: "68%" }} />
                <span style={{ height: "74%" }} />
                <span style={{ height: "62%" }} />
                <span style={{ height: "88%" }} />
            </div>

            <p className="trend-note">Weekly score is improving.</p>
        </section>
    );
}

export default TrendCard;