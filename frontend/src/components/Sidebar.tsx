import { Link, useLocation } from "react-router-dom";

const navItems = [
    { label: "Dashboard", to: "/dashboard" },
    { label: "AI Assistant", to: "/ai-assistant" },
    { label: "AI Report", to: "/ai-report" },
    { label: "Trend", to: "/trend" },
    { label: "Settings", to: "/settings" },
];

function Sidebar() {
    const location = useLocation();

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-mark">VG</div>
                <div>
                    <strong>VisionGuard</strong>
                    <span>Eye-care AI</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <Link
                        className={`nav-item${location.pathname === item.to ? " active" : ""}`}
                        key={item.to}
                        to={item.to}
                    >
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="sidebar-footer">
                <span className="nav-item disabled">Logout</span>
            </div>
        </aside>
    );
}

export default Sidebar;
