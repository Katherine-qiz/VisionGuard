import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

import logo from "../assets/VGlogo.png";

const loginProofs = [
    "Real-time eye-use monitoring",
    "DeepSeek-powered AI report",
    "Daily trend and reminder review",
];

function AuthProductMock() {
    return (
        <div className="auth-device-visual" aria-label="VisionGuard product preview">
            <div className="auth-device-window">
                <div className="auth-device-topbar">
                    <span />
                    <span />
                    <span />
                </div>
                <div className="auth-device-body">
                    <div className="auth-device-score">
                        <span>Eye Health Score</span>
                        <strong>92</strong>
                    </div>
                    <div className="auth-device-report">
                        <span className="auth-deepseek-badge">Powered by DeepSeek</span>
                        <h3>DeepSeek AI Report</h3>
                        <p>Readable summaries, risks, and practical next steps from monitoring data.</p>
                    </div>
                    <div className="auth-device-chart">
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                    </div>
                </div>
            </div>
        </div>
    );
}

function LoginPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");

    function handleLogin() {
        const finalUsername = username.trim() || "demo_user";
        localStorage.setItem("visionguard_username", finalUsername);
        navigate("/privacy");
    }

    return (
        <main className="auth-experience-page">
            <header className="auth-experience-nav">
                <Link className="auth-experience-brand" to="/">
                    <img src={logo} alt="VisionGuard logo" />
                    <span>
                        <strong>VisionGuard</strong>
                        <small>DeepSeek-powered eye-care AI</small>
                    </span>
                </Link>

                <Link className="auth-experience-home" to="/">
                    Back to home
                </Link>
            </header>

            <section className="auth-experience-shell">
                <div className="auth-experience-hero">
                    <div className="auth-experience-copy">
                        <h1>Welcome back to VisionGuard.</h1>
                        <p>
                            Continue monitoring your screen habits and reviewing DeepSeek-powered daily eye-care
                            guidance.
                        </p>
                    </div>

                    <div className="auth-proof-list">
                        {loginProofs.map((proof) => (
                            <span key={proof}>{proof}</span>
                        ))}
                    </div>

                    <AuthProductMock />
                </div>

                <section className="auth-experience-form">
                    <div className="auth-form-header">
                        <span className="auth-deepseek-badge">Powered by DeepSeek</span>
                        <h1>Sign in</h1>
                        <p>Access your VisionGuard dashboard and daily eye-care report.</p>
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

                        <button className="primary-button full-width" onClick={handleLogin}>
                            Login
                        </button>

                        <button className="secondary-button full-width" onClick={handleLogin}>
                            Continue as Demo User
                        </button>
                    </div>

                    <p className="auth-form-footer">
                        New to VisionGuard? <Link to="/register">Create an account</Link>
                    </p>
                </section>
            </section>
        </main>
    );
}

export default LoginPage;
