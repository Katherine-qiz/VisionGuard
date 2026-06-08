function ReminderList() {
    const reminders = [
        {
            label: "Blink rate too low",
            type: "warning",
        },
        {
            label: "Viewing distance too close",
            type: "attention",
        },
        {
            label: "Low ambient brightness",
            type: "neutral",
        },
    ];

    return (
        <section className="panel reminder-card">
            <div className="panel-header compact">
                <div>
                    <p className="eyebrow">Reminders</p>
                    <h2>Recent Reminders</h2>
                </div>
            </div>

            <div className="reminder-list">
                {reminders.map((item) => (
                    <div className="reminder-item" key={item.label}>
                        <span className={`dot ${item.type}`} />
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}

export default ReminderList;