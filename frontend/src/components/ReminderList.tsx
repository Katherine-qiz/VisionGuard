import type { Reminder } from "../types/reminder";

type ReminderListProps = {
    reminders: Reminder[];
};

function ReminderList({ reminders }: ReminderListProps) {
    const visibleReminders = reminders.length > 0
        ? reminders
        : [{
            id: "all-good",
            type: "face" as const,
            title: "All good for now",
            message: "Your viewing distance, brightness, and screen-use pattern look comfortable.",
            level: "info" as const,
            deliveryMethod: "card" as const,
            cooldownMs: 0,
        }];

    return (
        <section className="panel reminder-card">
            <div className="panel-header compact">
                <div>
                    <p className="eyebrow">Reminders</p>
                    <h2>Recent Reminders</h2>
                </div>
            </div>

            <div className="reminder-list">
                {visibleReminders.map((item) => (
                    <div className="reminder-item" key={item.id}>
                        <span className={`dot ${item.level}`} />
                        <div>
                            <p className="reminder-title">{item.title}</p>
                            <p className="reminder-message">{item.message}</p>
                        </div>
                    </div>
                ))}
            </div>

        </section>
    );
}

export default ReminderList;
