import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { readUserProfile, subscribeLocalData } from "../utils/localData";

const pageLabels: Record<string, string> = {
    "/dashboard": "DASHBOARD",
    "/ai-report": "AI REPORT",
    "/trend": "TREND",
    "/settings": "SETTINGS",
};

type TopBarProps = {
    username: string;
};

function TopBar({ username }: TopBarProps) {
    const location = useLocation();
    const [profileName, setProfileName] = useState(() => readUserProfile().username || username);
    const displayName = profileName || username;
    const pageLabel = pageLabels[location.pathname] ?? "VISIONGUARD";

    useEffect(() => {
        const updateProfileName = () => {
            setProfileName(readUserProfile().username || username);
        };

        updateProfileName();
        return subscribeLocalData(updateProfileName);
    }, [username]);

    return (
        <header className="topbar">
            <div>
                <p className="eyebrow">{pageLabel}</p>
                <h1>Hi, {displayName}</h1>
                <p className="topbar-subtitle">Let’s protect your eyes today.</p>
            </div>

            <div className="topbar-actions">
                <span className="status-badge active-status">Active</span>
                <div className="avatar">{displayName.charAt(0).toUpperCase()}</div>
            </div>
        </header>
    );
}

export default TopBar;
