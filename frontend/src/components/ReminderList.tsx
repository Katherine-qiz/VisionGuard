import { useEffect, useMemo, useState } from "react";

import type { Reminder } from "../types/reminder";
import { readReminderEvents } from "../utils/reminderStorage";
import { subscribeLocalData } from "../utils/localData";

type ReminderListProps = {
    reminders: Reminder[];
};

type VisibleReminder = Reminder & {
    triggeredAt: number;
};

const RECENT_REMINDER_WINDOW_MS = 30 * 60 * 1000;

function ReminderList({ reminders }: ReminderListProps) {
    const [storedReminderVersion, setStoredReminderVersion] = useState(0);

    useEffect(() => subscribeLocalData(() => {
        setStoredReminderVersion((version) => version + 1);
    }), []);

    const visibleReminders = useMemo(() => {
        const now = Date.now();
        const recentStoredReminders = readReminderEvents()
            .filter((event) => now - event.triggeredAt <= RECENT_REMINDER_WINDOW_MS)
            .map((event) => ({
                ...event,
                triggeredAt: event.triggeredAt,
            }));
        const liveReminders = reminders.map((reminder, index) => ({
            ...reminder,
            triggeredAt: now - index,
        }));
        const reminderMap = new Map<string, VisibleReminder>();

        [...liveReminders, ...recentStoredReminders]
            .forEach((reminder) => {
                const key = `${reminder.type}-${reminder.title}-${reminder.level}`;
                if (!reminderMap.has(key)) {
                    reminderMap.set(key, reminder);
                }
            });

        const mergedReminders = [...reminderMap.values()].sort((a, b) => b.triggeredAt - a.triggeredAt);
        const visibleReminders = mergedReminders.length > 0
            ? mergedReminders
            : [{
            id: "all-good",
            type: "face" as const,
            title: "All good for now",
            message: "Your viewing distance, brightness, and screen-use pattern look comfortable.",
            level: "info" as const,
            deliveryMethod: "card" as const,
            cooldownMs: 0,
            triggeredAt: now,
        }];
        return visibleReminders;
    }, [reminders, storedReminderVersion]);

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
