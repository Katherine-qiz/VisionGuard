import { useEffect, useRef, useState, type ReactNode } from "react";

import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import {
    clearLocalTrendData,
    exportLocalData,
    getLocalDataStats,
    importLocalData,
} from "../utils/localData";

type SettingsTab = "general" | "data" | "permissions" | "account" | "disclaimer";
type NotificationStatus = "unsupported" | NotificationPermission;

const tabs: Array<{ id: SettingsTab; icon: string; label: string }> = [
    { id: "general", icon: "⚙️", label: "General" },
    { id: "data", icon: "🗂", label: "Data & Privacy" },
    { id: "permissions", icon: "🔔", label: "Permissions" },
    { id: "account", icon: "👤", label: "Account" },
    { id: "disclaimer", icon: "🛡", label: "Disclaimer" },
];

function notificationStatus(): NotificationStatus {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
}

function SettingsPage() {
    const [activeTab, setActiveTab] = useState<SettingsTab>("data");
    const [statusMessage, setStatusMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [stats, setStats] = useState(getLocalDataStats);
    const [permission, setPermission] = useState<NotificationStatus>(notificationStatus);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const username = localStorage.getItem("visionguard_username") || "demo_user";
    const userId = localStorage.getItem("visionguard_user_id") || username || "demo_user";

    const refreshStats = () => setStats(getLocalDataStats());

    useEffect(() => {
        const refresh = () => {
            refreshStats();
            setPermission(notificationStatus());
        };

        refresh();
        window.addEventListener("focus", refresh);
        window.addEventListener("storage", refresh);
        window.addEventListener("visionguard-storage-updated", refresh);

        return () => {
            window.removeEventListener("focus", refresh);
            window.removeEventListener("storage", refresh);
            window.removeEventListener("visionguard-storage-updated", refresh);
        };
    }, []);

    const showStatus = (message: string) => {
        setStatusMessage(message);
        setErrorMessage("");
    };

    const showError = (message: string) => {
        setErrorMessage(message);
        setStatusMessage("");
    };

    const handleExport = () => {
        exportLocalData();
        showStatus("Export successful.");
    };

    const handleImport = async (file: File | undefined) => {
        if (!file) return;

        try {
            await importLocalData(file);
            refreshStats();
            showStatus("Local data imported successfully.");
        } catch {
            showError("Import failed. Please select a valid VisionGuard local data file.");
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleClear = () => {
        const confirmed = window.confirm("Clear local trend history? This will keep your username and local demo account.");
        if (!confirmed) return;

        clearLocalTrendData();
        refreshStats();
        showStatus("Local trend history cleared.");
    };

    const handleNotificationTest = async () => {
        if (!("Notification" in window)) {
            setPermission("unsupported");
            showError("Notifications are not supported in this browser.");
            return;
        }

        let nextPermission = Notification.permission;
        if (nextPermission === "default") {
            nextPermission = await Notification.requestPermission();
            setPermission(nextPermission);
        }

        if (nextPermission === "denied") {
            showError("Notifications are blocked. Please enable them in browser settings.");
            return;
        }

        if (nextPermission === "granted") {
            new Notification("VisionGuard notification test", {
                body: "Browser notifications are working.",
                tag: "visionguard-settings-test",
            });
            showStatus("Notification test sent.");
            setPermission("granted");
        }
    };

    const renderContent = () => {
        if (activeTab === "general") {
            return (
                <section className="settings-section">
                    <h2>General</h2>
                    <p className="settings-section-description">Basic prototype mode and storage behavior for this local VisionGuard MVP.</p>

                    <SettingRow title="Local Web MVP" description="VisionGuard is running as a browser-based local prototype.">
                        <span className="settings-badge">Local-first</span>
                    </SettingRow>
                    <SettingRow title="Storage" description="Monitoring history is stored locally in this browser.">
                        <span className="settings-stat">localStorage</span>
                    </SettingRow>
                    <SettingRow title="Cloud sync" description="Cloud sync is not connected in this MVP.">
                        <span className="settings-badge neutral">Not enabled</span>
                    </SettingRow>
                </section>
            );
        }

        if (activeTab === "data") {
            return (
                <section className="settings-section">
                    <h2>Data & Privacy</h2>
                    <p className="settings-section-description">
                        VisionGuard stores monitoring history locally in this browser. Clearing browser data will remove your trend history.
                        You can export your local data as a backup.
                    </p>
                    <p className="settings-section-description">
                        Raw camera frames are processed in real time and are not stored by this MVP.
                    </p>

                    <SettingRow title="Local metric samples" description="Saved eye-care metric snapshots used by the Trend page.">
                        <span className="settings-stat">{stats.metricSamplesCount} samples</span>
                    </SettingRow>
                    <SettingRow title="Reminder events" description="Saved reminder events generated by local monitoring.">
                        <span className="settings-stat">{stats.reminderEventsCount} events</span>
                    </SettingRow>
                    <SettingRow title="Latest saved sample" description="Most recent local monitoring sample in this browser.">
                        <span className="settings-stat">{stats.latestSampleReadable}</span>
                    </SettingRow>
                    <SettingRow title="Export local data" description="Download your local monitoring samples and reminder events as a JSON backup.">
                        <button className="primary-button" onClick={handleExport} type="button">Export</button>
                    </SettingRow>
                    <SettingRow title="Import local data" description="Restore a VisionGuard local data JSON backup into this browser.">
                        <input
                            accept="application/json"
                            hidden
                            onChange={(event) => void handleImport(event.target.files?.[0])}
                            ref={fileInputRef}
                            type="file"
                        />
                        <button className="secondary-button" onClick={() => fileInputRef.current?.click()} type="button">Import</button>
                    </SettingRow>
                    <SettingRow title="Clear local trend data" description="Remove samples, summaries, reminders, and cooldowns while keeping your local account.">
                        <button className="danger-button" onClick={handleClear} type="button">Clear</button>
                    </SettingRow>
                </section>
            );
        }

        if (activeTab === "permissions") {
            return (
                <section className="settings-section">
                    <h2>Permissions</h2>
                    <p className="settings-section-description">Review browser permissions used by the local monitoring experience.</p>

                    <SettingRow
                        title="Camera access"
                        description="Camera access is requested when you click Start Monitoring. Raw frames are processed during the session and are not stored."
                    >
                        <span className="settings-badge neutral">Requested on start</span>
                    </SettingRow>
                    <SettingRow title="Notification permission" description="Browser notification permission for quiet eye-care reminders.">
                        <span className="settings-stat">{permission}</span>
                    </SettingRow>
                    <SettingRow title="Test notification" description="Send a browser notification to confirm permissions are working.">
                        <button className="secondary-button" onClick={() => void handleNotificationTest()} type="button">Test</button>
                    </SettingRow>
                </section>
            );
        }

        if (activeTab === "account") {
            return (
                <section className="settings-section">
                    <h2>Account</h2>
                    <p className="settings-section-description">
                        This MVP uses a local demo account. No real authentication or cloud account is connected yet.
                    </p>

                    <SettingRow title="Username" description="Name shown in the local VisionGuard interface.">
                        <span className="settings-stat">{username}</span>
                    </SettingRow>
                    <SettingRow title="User ID" description="Local identifier used to separate stored samples.">
                        <span className="settings-stat">{userId}</span>
                    </SettingRow>
                    <SettingRow title="Account type" description="This account exists only in your browser.">
                        <span className="settings-badge">Local demo account</span>
                    </SettingRow>
                    <SettingRow title="Authentication" description="Cloud sign-in is not connected in this MVP.">
                        <span className="settings-badge neutral">Not connected in MVP</span>
                    </SettingRow>
                </section>
            );
        }

        return (
            <section className="settings-section">
                <h2>Medical Disclaimer</h2>
                <div className="disclaimer-box">
                    <strong>This is not medical diagnosis.</strong>
                    <p>
                        VisionGuard provides behavior-based eye-care guidance using camera-derived screen-use signals such as blink rate,
                        viewing distance, lighting, and continuous screen time. It does not diagnose eye disease or replace professional
                        medical advice.
                    </p>
                    <p>If you experience persistent discomfort, consult an eye-care professional.</p>
                </div>
            </section>
        );
    };

    return (
        <div className="dashboard-shell">
            <Sidebar />
            <main className="dashboard-main settings-main">
                <TopBar username={username} />
                <div className="settings-page">
                    <section className="settings-modal-card">
                        <header className="settings-modal-header">
                            <div>
                                <p className="eyebrow">Settings</p>
                                <h1>Preferences & Data</h1>
                                <p>Manage local data, permissions, and privacy settings for this VisionGuard MVP.</p>
                            </div>
                        </header>

                        <div className="settings-modal-body">
                            <aside className="settings-tabs" aria-label="Settings tabs">
                                {tabs.map((tab) => (
                                    <button
                                        className={`settings-tab${activeTab === tab.id ? " active" : ""}`}
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            setStatusMessage("");
                                            setErrorMessage("");
                                        }}
                                        type="button"
                                    >
                                        <span aria-hidden="true">{tab.icon}</span>
                                        {tab.label}
                                    </button>
                                ))}
                            </aside>

                            <section className="settings-content">
                                {statusMessage && <div className="status-message">{statusMessage}</div>}
                                {errorMessage && <div className="error-message">{errorMessage}</div>}
                                {renderContent()}
                            </section>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

function SettingRow({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <div className="settings-row">
            <div className="settings-row-main">
                <strong>{title}</strong>
                <p>{description}</p>
            </div>
            <div className="settings-row-action">{children}</div>
        </div>
    );
}

export default SettingsPage;
