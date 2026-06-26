import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

import logo from "../assets/VGlogo.png";
import aiIllustration from "../assets/AI.png";

const registerProofs = [
    "Monitor blink rhythm and viewing distance",
    "Review daily eye-care summaries",
    "Build better screen routines over time",
];

function RegisterPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(false);
    const [privacyError, setPrivacyError] = useState("");

    function handleRegister() {
        if (!hasAcceptedPrivacy) {
            setPrivacyError("Please review and agree to the privacy and camera-use notice before creating your account.");
            return;
        }

        const finalUsername = username.trim() || "new_user";
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
                            <h1>Start building healthier screen habits.</h1>
                            <p>
                                Create a VisionGuard account to understand your screen routine and turn everyday
                                signals into calmer guidance.
                            </p>
                        </div>

                        <div className="auth-proof-list">
                            {registerProofs.map((proof) => (
                                <span key={proof}>{proof}</span>
                            ))}
                        </div>

                        <div className="auth-hero-art" aria-hidden="true">
                            <img className="auth-hero-icon" src={aiIllustration} alt="" />
                        </div>
                    </div>
                </aside>

                <section className="auth-content-panel">
                    <div className="auth-form-shell">
                        <div className="auth-form-header">
                            <h1>Create your account</h1>
                            <p>Start your VisionGuard workspace for healthier screen routines.</p>
                        </div>

                        <div className="auth-form">
                            <label>Username</label>
                            <input
                                className="input"
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                                placeholder="Katherine"
                            />

                            <label>Email</label>
                            <input className="input" type="email" placeholder="you@example.com" />

                            <label>Password</label>
                            <input className="input" type="password" placeholder="••••••••" />

                            <label>Confirm Password</label>
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
                                    <Link to="/privacy?from=register">privacy and camera-use notice</Link>.
                                </span>
                            </label>

                            {privacyError && <p className="auth-form-error">{privacyError}</p>}

                            <button className="primary-button full-width" onClick={handleRegister}>
                                Create account
                            </button>
                        </div>

                        <p className="auth-form-footer">
                            Already have an account? <Link to="/login">Sign in</Link>
                        </p>
                    </div>
                </section>
            </section>
        </main>
    );
}

export default RegisterPage;
