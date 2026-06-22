import { useEffect, useRef, useState, type ReactNode } from "react";

import {
    deleteLocalAccountData,
    exportLocalData,
    getLocalDataStats,
    importLocalData,
    readSettings,
    readUserProfile,
    saveSettings,
    saveUserProfile,
    type VisionGuardSettings,
} from "../utils/localData";

type SettingsTab = "general" | "account" | "notifications" | "data" | "about";
type NotificationStatus = "unsupported" | NotificationPermission;

type SettingsModalProps = {
    open: boolean;
    onClose: () => void;
};

const tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: "general", label: "General" },
    { id: "account", label: "Account" },
    { id: "notifications", label: "Notifications" },
    { id: "data", label: "Data & Privacy" },
    { id: "about", label: "About" },
];

function getNotificationStatus(): NotificationStatus {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
}

function SettingsModal({ open, onClose }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<SettingsTab>("general");
    const [settings, setSettings] = useState(readSettings);
    const [stats, setStats] = useState(getLocalDataStats);
    const [notificationPermission, setNotificationPermission] = useState<NotificationStatus>(getNotificationStatus);
    const [displayName, setDisplayName] = useState(readUserProfile().username);
    const [email, setEmail] = useState(readUserProfile().email);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!open) return;

        setSettings(readSettings());
        setStats(getLocalDataStats());
        setNotificationPermission(getNotificationStatus());
        const profile = readUserProfile();
        setDisplayName(profile.username);
        setEmail(profile.email);
        setStatusMessage("");
        setErrorMessage("");
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose, open]);

    if (!open) return null;

    const showStatus = (message: string) => {
        setStatusMessage(message);
        setErrorMessage("");
    };

    const showError = (message: string) => {
        setErrorMessage(message);
        setStatusMessage("");
    };

    const updateSettings = (partialSettings: Partial<VisionGuardSettings>) => {
        setSettings(saveSettings(partialSettings));
        showStatus("Settings saved.");
    };

    const handleSaveAccount = () => {
        saveUserProfile({
            username: displayName.trim() || "demo_user",
            email: email.trim(),
        });
        showStatus("Account details saved.");
    };

    const handlePasswordUpdate = () => {
        updateSettings({ passwordUpdatedAt: Date.now() });
        setPasswordOpen(false);
        showStatus("Password settings updated.");
    };

    const requestNotificationPermission = async () => {
        if (!("Notification" in window)) {
            setNotificationPermission("unsupported");
            showError("Notifications are not supported in this browser.");
            return;
        }

        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        updateSettings({ notificationsEnabled: permission === "granted" });
    };

    const handleTestNotification = async () => {
        if (!("Notification" in window)) {
            setNotificationPermission("unsupported");
            showError("Notifications are not supported in this browser.");
            return;
        }

        let permission = Notification.permission;
        if (permission === "default") {
            permission = await Notification.requestPermission();
            setNotificationPermission(permission);
        }

        if (permission === "denied") {
            showError("Notifications are blocked. Please enable them in browser settings.");
            return;
        }

        new Notification("VisionGuard notification test", {
            body: "Browser notifications are working.",
            tag: "visionguard-settings-test",
        });
        updateSettings({ notificationsEnabled: true });
        showStatus("Notification test sent.");
    };

    const handleExport = () => {
        exportLocalData();
        showStatus("Export ready.");
    };

    const handleImport = async (file: File | undefined) => {
        if (!file) return;

        try {
            await importLocalData(file);
            setStats(getLocalDataStats());
            setSettings(readSettings());
            showStatus("Data imported.");
        } catch {
            showError("Import failed. Please select a valid VisionGuard backup file.");
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDeleteAccount = () => {
        const confirmation = window.prompt("Type DELETE to confirm.");
        if (confirmation !== "DELETE") {
            showError("Delete cancelled. Type DELETE to confirm.");
            return;
        }

        deleteLocalAccountData();
        onClose();
        window.location.href = "/";
    };

    const renderContent = () => {
        if (activeTab === "general") {
            return (
                <section className="settings-section">
                    <h2>General</h2>
                    <SettingRow title="Appearance" description="Choose how VisionGuard should look.">
                        <select
                            className="settings-select"
                            onChange={(event) => updateSettings({ appearance: event.target.value as VisionGuardSettings["appearance"] })}
                            value={settings.appearance}
                        >
                            <option value="system">System</option>
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                    </SettingRow>
                    <SettingRow title="Language" description="Choose your preferred interface language.">
                        <select
                            className="settings-select"
                            onChange={(event) => updateSettings({ language: event.target.value as VisionGuardSettings["language"] })}
                            value={settings.language}
                        >
                            <option value="en">English</option>
                            <option value="zh">简体中文</option>
                        </select>
                    </SettingRow>
                    <SettingRow title="Reminder mode" description="Strict mode keeps break prompts a little harder to dismiss.">
                        <select
                            className="settings-select"
                            onChange={(event) => updateSettings({ reminderMode: event.target.value as VisionGuardSettings["reminderMode"] })}
                            value={settings.reminderMode}
                        >
                            <option value="gentle">Gentle</option>
                            <option value="strict">Strict</option>
                        </select>
                    </SettingRow>
                    <SettingRow title="Start behavior" description="Start monitoring only when you choose to.">
                        <Toggle
                            checked={settings.startManually}
                            label="Start monitoring manually"
                            onChange={(checked) => updateSettings({ startManually: checked })}
                        />
                    </SettingRow>
                </section>
            );
        }

        if (activeTab === "account") {
            return (
                <section className="settings-section">
                    <h2>Account</h2>
                    <SettingRow title="Display name" description="This name appears in the top bar.">
                        <input
                            className="settings-input"
                            onChange={(event) => setDisplayName(event.target.value)}
                            value={displayName}
                        />
                    </SettingRow>
                    <SettingRow title="Email" description="Optional email for this browser profile.">
                        <input
                            className="settings-input"
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="you@example.com"
                            type="email"
                            value={email}
                        />
                    </SettingRow>
                    <SettingRow title="Password" description="Update your local password settings.">
                        <button className="secondary-button" onClick={() => setPasswordOpen((value) => !value)} type="button">
                            Change password
                        </button>
                    </SettingRow>
                    {passwordOpen && (
                        <div className="settings-password-box">
                            <input className="settings-input" placeholder="Current password" type="password" />
                            <input className="settings-input" placeholder="New password" type="password" />
                            <input className="settings-input" placeholder="Confirm new password" type="password" />
                            <p>Password settings are simulated for this local version.</p>
                            <button className="primary-button" onClick={handlePasswordUpdate} type="button">Save password</button>
                        </div>
                    )}
                    <div className="settings-actions-row">
                        <span>Local user ID: {readUserProfile().userId || displayName || "demo_user"}</span>
                        <button className="primary-button" onClick={handleSaveAccount} type="button">Save changes</button>
                    </div>
                </section>
            );
        }

        if (activeTab === "notifications") {
            return (
                <section className="settings-section">
                    <h2>Notifications</h2>
                    <SettingRow title="Browser notifications" description="Use browser notifications for eye-care reminders.">
                        {notificationPermission === "granted" ? (
                            <span className="settings-pill">Enabled</span>
                        ) : notificationPermission === "denied" ? (
                            <span className="settings-pill warning">Blocked</span>
                        ) : notificationPermission === "unsupported" ? (
                            <span className="settings-pill neutral">Unsupported</span>
                        ) : (
                            <button className="secondary-button" onClick={() => void requestNotificationPermission()} type="button">Enable</button>
                        )}
                    </SettingRow>
                    <SettingRow title="Break reminders" description="Prompt you when it is time for a short eye break.">
                        <Toggle checked={settings.breakReminders} onChange={(checked) => updateSettings({ breakReminders: checked })} />
                    </SettingRow>
                    <SettingRow title="Blink reminders" description="Encourage blinking when focus sessions get dry.">
                        <Toggle checked={settings.blinkReminders} onChange={(checked) => updateSettings({ blinkReminders: checked })} />
                    </SettingRow>
                    <SettingRow title="Distance reminders" description="Remind you when you sit too close to the screen.">
                        <Toggle checked={settings.distanceReminders} onChange={(checked) => updateSettings({ distanceReminders: checked })} />
                    </SettingRow>
                    <SettingRow title="Brightness reminders" description="Help you notice dim or glaring lighting.">
                        <Toggle checked={settings.brightnessReminders} onChange={(checked) => updateSettings({ brightnessReminders: checked })} />
                    </SettingRow>
                    <SettingRow title="Test notification" description="Send a quick test notification.">
                        <button className="secondary-button" onClick={() => void handleTestNotification()} type="button">Test</button>
                    </SettingRow>
                </section>
            );
        }

        if (activeTab === "data") {
            return (
                <section className="settings-section">
                    <h2>Data & Privacy</h2>
                    <p className="settings-section-description">
                        Your monitoring history is saved on this browser. You can export a backup or delete your local account data.
                    </p>
                    <SettingRow title="Local history" description="Saved monitoring records for trends.">
                        <span className="settings-stat">{stats.metricSamplesCount} records</span>
                    </SettingRow>
                    <SettingRow title="Reminder history" description="Saved reminder events.">
                        <span className="settings-stat">{stats.reminderEventsCount} reminders</span>
                    </SettingRow>
                    <SettingRow title="Latest saved record" description="Most recent saved monitoring record.">
                        <span className="settings-stat">{stats.latestSampleReadable}</span>
                    </SettingRow>
                    <SettingRow title="Export data" description="Download a backup file.">
                        <button className="primary-button" onClick={handleExport} type="button">Export</button>
                    </SettingRow>
                    <SettingRow title="Import data" description="Restore a VisionGuard backup file.">
                        <input
                            accept="application/json"
                            hidden
                            onChange={(event) => void handleImport(event.target.files?.[0])}
                            ref={fileInputRef}
                            type="file"
                        />
                        <button className="secondary-button" onClick={() => fileInputRef.current?.click()} type="button">Import</button>
                    </SettingRow>
                    <SettingRow title="Camera data" description="Camera frames are processed during monitoring and are not saved in this version.">
                        <span className="settings-pill neutral">Not stored</span>
                    </SettingRow>
                    <div className="settings-danger-zone">
                        <h3>Danger Zone</h3>
                        <div className="settings-row">
                            <div className="settings-row-main">
                                <strong>Delete local account and data</strong>
                                <p>This removes local profile settings, trend history, and reminder history from this browser.</p>
                            </div>
                            <div className="settings-row-control">
                                <button className="danger-button" onClick={handleDeleteAccount} type="button">Delete local account</button>
                            </div>
                        </div>
                    </div>
                </section>
            );
        }

        return (
            <section className="settings-section">
                <h2>About</h2>
                <SettingRow title="Product" description="Your eye-care monitoring companion.">
                    <span className="settings-stat">VisionGuard</span>
                </SettingRow>
                <SettingRow title="Version" description="Current local release.">
                    <span className="settings-stat">Local MVP</span>
                </SettingRow>
                <SettingRow title="What VisionGuard does" description="VisionGuard helps you understand screen-use habits such as blink rate, viewing distance, lighting, and continuous focus time.">
                    <span className="settings-pill">Eye-care guidance</span>
                </SettingRow>
                <div className="disclaimer-box">
                    <strong>This is not medical diagnosis.</strong>
                    <p>VisionGuard provides behavior-based guidance and does not diagnose eye disease or replace professional medical advice.</p>
                </div>
                <SettingRow title="Feedback" description="Feedback channel coming soon.">
                    <span className="settings-pill neutral">Coming soon</span>
                </SettingRow>
            </section>
        );
    };

    return (
        <div className="settings-overlay" onClick={onClose}>
            <section className="settings-dialog" onClick={(event) => event.stopPropagation()}>
                <header className="settings-dialog-header">
                    <h2>Settings</h2>
                    <button className="settings-close-button" onClick={onClose} type="button" aria-label="Close settings">
                        ×
                    </button>
                </header>

                <div className="settings-dialog-body">
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
                                {tab.label}
                            </button>
                        ))}
                    </aside>

                    <section className="settings-panel-content">
                        {statusMessage && <div className="settings-inline-message">{statusMessage}</div>}
                        {errorMessage && <div className="settings-inline-message error">{errorMessage}</div>}
                        {renderContent()}
                    </section>
                </div>
            </section>
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
            <div className="settings-row-control">{children}</div>
        </div>
    );
}

function Toggle({
    checked,
    label,
    onChange,
}: {
    checked: boolean;
    label?: string;
    onChange: (checked: boolean) => void;
}) {
    return (
        <button
            aria-pressed={checked}
            className={`settings-toggle${checked ? " active" : ""}`}
            onClick={() => onChange(!checked)}
            type="button"
        >
            <span />
            {label && <strong>{label}</strong>}
        </button>
    );
}

export default SettingsModal;
