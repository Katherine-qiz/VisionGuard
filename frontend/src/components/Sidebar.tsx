import { useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, LayoutDashboard, LineChart, LogOut, Settings, Sparkles } from "lucide-react";

const navItems = [
    { Icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
    { Icon: Sparkles, label: "AI Report", to: "/ai-report" },
    { Icon: LineChart, label: "Trend", to: "/trend" },
];

type SidebarProps = {
    onOpenSettings?: () => void;
};

function Sidebar({ onOpenSettings }: SidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const [logoutOpen, setLogoutOpen] = useState(false);

    const handleLogout = () => {
        [
            "visionguard_username",
            "visionguard_user",
            "visionguard_user_id",
            "visionguard_session",
            "visionguard_auth",
            "visionguard_token",
        ].forEach((key) => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        setLogoutOpen(false);
        navigate("/");
    };

    const logoutModal =
        logoutOpen && typeof document !== "undefined"
            ? createPortal(
                  <div
                      aria-modal="true"
                      role="dialog"
                      style={{
                          alignItems: "center",
                          background: "rgba(15, 23, 42, 0.62)",
                          display: "flex",
                          inset: 0,
                          justifyContent: "center",
                          padding: "24px",
                          position: "fixed",
                          zIndex: 9999,
                      }}
                  >
                      <div
                          style={{
                              background: "#ffffff",
                              border: "1px solid rgba(203, 213, 225, 0.9)",
                              borderRadius: "16px",
                              boxShadow: "0 24px 60px rgba(15, 23, 42, 0.24)",
                              color: "#111827",
                              maxWidth: "380px",
                              padding: "22px",
                              position: "relative",
                              width: "100%",
                              zIndex: 10000,
                          }}
                      >
                          <h2 style={{ fontSize: "22px", margin: "0 0 8px" }}>Log out?</h2>
                          <p style={{ color: "#64748b", lineHeight: 1.5, margin: "0 0 20px" }}>
                              Are you sure you want to return to the landing page?
                          </p>
                          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                              <button className="secondary-button" onClick={() => setLogoutOpen(false)} type="button">
                                  Cancel
                              </button>
                              <button className="primary-button" onClick={handleLogout} type="button">
                                  Log out
                              </button>
                          </div>
                      </div>
                  </div>,
                  document.body,
              )
            : null;

    return (
        <>
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="sidebar-brand-mark" aria-hidden="true">
                        <Eye className="sidebar-brand-eye" />
                    </div>
                    <div className="sidebar-brand-copy">
                        <strong>
                            Vision<span>Guard</span>
                        </strong>
                        <small>DeepSeek-powered eye-care AI</small>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(({ Icon, ...item }) => (
                        <Link
                            className={`nav-item${location.pathname === item.to ? " active" : ""}`}
                            key={item.to}
                            to={item.to}
                        >
                            <Icon className="nav-icon" aria-hidden="true" />
                            <span>{item.label}</span>
                        </Link>
                    ))}
                    <button className="nav-item nav-button" onClick={onOpenSettings} type="button">
                        <Settings className="nav-icon" aria-hidden="true" />
                        <span>Settings</span>
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <button className="nav-item nav-button" onClick={() => setLogoutOpen(true)} type="button">
                        <LogOut className="nav-icon" aria-hidden="true" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
            {logoutModal}
        </>
    );
}

export default Sidebar;
