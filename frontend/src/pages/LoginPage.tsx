import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

import logo from "../assets/VGlogo.png";
import robotIllustration from "../assets/robot.png";

const loginProofs = [
    "Real-time eye-use monitoring",
    "Daily screen habit summaries",
    "Privacy-conscious camera workflow",
];

function LoginPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(false);
    const [privacyError, setPrivacyError] = useState("");

    function handleLogin() {
        if (!hasAcceptedPrivacy) {
            setPrivacyError("Please review and agree to the privacy and camera-use notice before continuing.");
            return;
        }

        const finalUsername = username.trim() || "demo_user";
        localStorage.setItem("visionguard_username", finalUsername);
        localStorage.setItem("visionguard_camera_consent", "true");
        navigate("/dashboard");
    }

    return (
        <main className="auth-split-page">
            <header className="auth-split-nav">
                <Link className="auth-experience-brand" to="/">
                    <img src={logo} alt="VisionGuard logo" />
                    <span>
                        <strong>VisionGuard</strong>
                        <small>AI-powered eye-care monitoring</small>
                    </span>
                </Link>

                <Link className="auth-experience-home" to="/">
                    Back to home
                </Link>
            </header>

            <section className="auth-split-layout">
                <aside className="auth-visual-panel">
                    <div className="auth-visual-inner">
                        <div className="auth-experience-copy">
                            <h1>Welcome back to healthier screen habits.</h1>
                            <p>
                                Pick up where you left off with real-time monitoring, gentle reminders, and daily
                                eye-care guidance.
                            </p>
                        </div>

                        <div className="auth-proof-list">
                            {loginProofs.map((proof) => (
                                <span key={proof}>{proof}</span>
                            ))}
                        </div>

                        <div className="auth-hero-art" aria-hidden="true">
                            <img className="auth-hero-icon" src={robotIllustration} alt="" />
                        </div>
                    </div>
                </aside>

                <section className="auth-content-panel">
                    <div className="auth-form-shell">
                        <div className="auth-form-header">
                            <h1>Sign in</h1>
                            <p>Access your dashboard, reminders, and daily eye-care report.</p>
                        </div>

                        <div className="auth-form">
                            <label>Username or Email</label>
                            <input
                                className="input"
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                                placeholder="Katherine"
                            />

                            <label>Password</label>
                            <input className="input" type="password" placeholder="••••••••" />

                            <label className="checkbox-row auth-privacy-checkbox">
                                <input
                                    type="checkbox"
                                    checked={hasAcceptedPrivacy}
                                    onChange={(event) => {
                                        setHasAcceptedPrivacy(event.target.checked);
                                        if (event.target.checked) setPrivacyError("");
                                    }}
                                />
                                <span>
                                    I have reviewed and agree to VisionGuard&apos;s{" "}
                                    <Link to="/privacy?from=login">privacy and camera-use notice</Link>.
                                </span>
                            </label>

                            {privacyError && <p className="auth-form-error">{privacyError}</p>}

                            <button className="primary-button full-width" onClick={handleLogin}>
                                Login
                            </button>
                        </div>

                        <p className="auth-form-footer">
                            New to VisionGuard? <Link to="/register">Create an account</Link>
                        </p>
                    </div>
                </section>
            </section>
        </main>
    );
}

export default LoginPage;
