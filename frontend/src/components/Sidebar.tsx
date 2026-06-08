import { Link } from "react-router-dom";

function Sidebar() {
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
                <Link className="nav-item active" to="/dashboard">
                    Dashboard
                </Link>
                <span className="nav-item disabled">Reports</span>
                <span className="nav-item disabled">History</span>
                <span className="nav-item disabled">Settings</span>
            </nav>

            <div className="sidebar-footer">
                <span className="nav-item disabled">Logout</span>
            </div>
        </aside>
    );
}

export default Sidebar;