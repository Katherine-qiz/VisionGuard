import type { Reminder } from "../types/reminder";

export function sendBrowserNotification(reminder: Reminder, force = false) {
    if (!("Notification" in window)) {
        console.warn("Browser notifications are not supported.");
        return false;
    }

    if (Notification.permission !== "granted") {
        console.warn(`Browser notification skipped. Current permission: ${Notification.permission}`);
        return false;
    }

    if (!force && document.visibilityState === "visible" && document.hasFocus()) {
        console.info("Browser notification skipped because VisionGuard is visible and focused.");
        return false;
    }

    try {
        const notification = new Notification(reminder.title, {
            body: reminder.message,
            silent: false,
            tag: `visionguard-${reminder.type}`,
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };
        return true;
    } catch (error) {
        console.warn("Browser notification failed:", error);
        return false;
    }
}
