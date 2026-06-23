import { Link, useNavigate } from "react-router-dom";

import logo from "../assets/VGlogo.png";

const registerProofs = [
    "Local camera-based monitoring workflow",
    "DeepSeek-powered daily report",
    "Trend review for long-term habits",
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

function RegisterPage() {
    const navigate = useNavigate();

    function handleRegister() {
        localStorage.setItem("visionguard_username", "new_user");
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
                        <h1>Start building healthier screen habits.</h1>
                        <p>
                            Create your VisionGuard account to monitor blink rhythm, viewing distance, lighting, and
                            focus duration.
                        </p>
                    </div>

                    <div className="auth-proof-list">
                        {registerProofs.map((proof) => (
                            <span key={proof}>{proof}</span>
                        ))}
                    </div>

                    <AuthProductMock />
                </div>

                <section className="auth-experience-form">
                    <div className="auth-form-header">
                        <span className="auth-deepseek-badge">Powered by DeepSeek</span>
                        <h1>Create your account</h1>
                        <p>Set up your VisionGuard workspace for daily screen habit guidance.</p>
                    </div>

                    <div className="auth-form">
                        <label>Username</label>
                        <input className="input" placeholder="Katherine" />

                        <label>Email</label>
                        <input className="input" type="email" placeholder="you@example.com" />

                        <label>Password</label>
                        <input className="input" type="password" placeholder="••••••••" />

                        <label>Confirm Password</label>
                        <input className="input" type="password" placeholder="••••••••" />

                        <label className="checkbox-row">
                            <input type="checkbox" />
                            <span>I agree to the privacy policy and camera-use notice.</span>
                        </label>

                        <button className="primary-button full-width" onClick={handleRegister}>
                            Create account
                        </button>
                    </div>

                    <p className="auth-form-footer">
                        Already have an account? <Link to="/login">Sign in</Link>
                    </p>
                </section>
            </section>
        </main>
    );
}

export default RegisterPage;
