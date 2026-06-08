type TopBarProps = {
    username: string;
};

function TopBar({ username }: TopBarProps) {
    return (
        <header className="topbar">
            <div>
                <p className="eyebrow">Dashboard</p>
                <h1>Hi, {username}</h1>
                <p className="topbar-subtitle">Let’s protect your eyes today.</p>
            </div>

            <div className="topbar-actions">
                <div className="search-box">Search reports or eye-care tips</div>
                <span className="status-badge active-status">Active</span>
                <div className="avatar">{username.charAt(0).toUpperCase()}</div>
            </div>
        </header>
    );
}

export default TopBar;