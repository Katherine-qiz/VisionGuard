import { Link, useNavigate, useSearchParams } from "react-router-dom";

import logo from "../assets/VGlogo.png";
import robotIllustration from "../assets/robot.png";

const privacyPrinciples = [
    [
        "Local camera preview",
        "Your camera is used to estimate eye-use behavior during active monitoring.",
    ],
    [
        "Numerical metrics only",
        "VisionGuard focuses on blink rhythm, distance, brightness, and focus duration instead of storing raw video frames.",
    ],
    [
        "Guidance, not diagnosis",
        "AI reports explain everyday screen habits and do not replace professional eye-care advice.",
    ],
];

const privacyDetails = [
    "We do not save raw video frames.",
    "We do not upload face images.",
    "We only store numerical metrics.",
    "You can stop monitoring anytime.",
    "AI guidance is not medical diagnosis.",
];

function PrivacyPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const from = searchParams.get("from");

    function handleUnderstand() {
        if (from === "login") {
            navigate("/login");
            return;
        }

        if (from === "register") {
            navigate("/register");
            return;
        }

        navigate("/");
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

            <section className="auth-split-layout privacy-split-layout">
                <aside className="auth-visual-panel privacy-visual-panel">
                    <div className="auth-visual-inner">
                        <div className="privacy-experience-copy">
                            <h1>Privacy-first screen habit guidance.</h1>
                            <p>
                                VisionGuard focuses on behavior signals and daily guidance without storing raw camera
                                frames.
                            </p>
                        </div>

                        <div className="auth-proof-list">
                            <span>Local camera preview</span>
                            <span>Numerical metrics only</span>
                            <span>Guidance, not diagnosis</span>
                        </div>

                        <div className="auth-hero-art privacy-hero-art" aria-hidden="true">
                            <img className="auth-hero-icon" src={robotIllustration} alt="" />
                        </div>
                    </div>
                </aside>

                <section className="auth-content-panel privacy-content-panel">
                    <div className="auth-privacy-shell">
                        <div className="auth-form-header privacy-content-header">
                            <h1>Review privacy and camera-use notice</h1>
                            <p>
                                Before using VisionGuard&apos;s camera-based monitoring, please review how the product
                                handles eye-use behavior signals.
                            </p>
                        </div>

                        <div className="privacy-principle-row">
                            {privacyPrinciples.map(([title, description]) => (
                                <article className="privacy-consent-row" key={title}>
                                    <h2>{title}</h2>
                                    <p>{description}</p>
                                </article>
                            ))}
                        </div>

                        <div className="privacy-disclosure">
                            <div>
                                <h2>What VisionGuard keeps clear</h2>
                            </div>
                            <ul>
                                {privacyDetails.map((detail) => (
                                    <li key={detail}>{detail}</li>
                                ))}
                            </ul>
                        </div>

                        <button className="primary-button privacy-consent-button" onClick={handleUnderstand}>
                            I understand
                        </button>
                    </div>
                </section>
            </section>
        </main>
    );
}

export default PrivacyPage;
