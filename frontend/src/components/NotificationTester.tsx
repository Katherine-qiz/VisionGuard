import { useEffect, useState } from "react";

type NotificationStatus = "not-supported" | "default" | "granted" | "denied";

const statusLabel: Record<NotificationStatus, string> = {
    "not-supported": "Not supported",
    default: "Not requested",
    granted: "Granted",
    denied: "Denied",
};

function getNotificationStatus(): NotificationStatus {
    if (!("Notification" in window)) return "not-supported";
    return Notification.permission;
}

function NotificationTester() {
    const [status, setStatus] = useState(getNotificationStatus);

    useEffect(() => {
        const handleVisibility = () => setStatus(getNotificationStatus());
        document.addEventListener("visibilitychange", handleVisibility);
        window.addEventListener("focus", handleVisibility);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("focus", handleVisibility);
        };
    }, []);

    async function requestNotificationPermission() {
        if (!("Notification" in window)) {
            setStatus("not-supported");
            return;
        }

        const permission = await Notification.requestPermission();
        setStatus(permission);
    }

    function testNotification() {
        if (!("Notification" in window)) {
            alert("Notification API is not supported in this browser.");
            setStatus("not-supported");
            return;
        }

        if (Notification.permission !== "granted") {
            console.warn(`Cannot send test notification. Current permission: ${Notification.permission}`);
            alert("Please enable browser notifications first.");
            setStatus(getNotificationStatus());
            return;
        }

        new Notification("VisionGuard Test", {
            body: "Browser notification is working.",
            silent: false,
            tag: "visionguard-test",
        });

        setStatus(getNotificationStatus());
    }

    return (
        <div className="notification-tester">
            <div className="notification-status">
                Notification Status: <strong>{statusLabel[status]}</strong>
            </div>
            <div className="notification-actions">
                <button type="button" className="secondary-button" onClick={requestNotificationPermission}>
                    Enable notifications
                </button>
                <button type="button" className="secondary-button" onClick={testNotification}>
                    Test notification
                </button>
            </div>
        </div>
    );
}

export default NotificationTester;
