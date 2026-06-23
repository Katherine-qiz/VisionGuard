import { Link, useNavigate } from "react-router-dom";

import logo from "../assets/VGlogo.png";

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

    function handleConsent() {
        localStorage.setItem("visionguard_camera_consent", "true");
        navigate("/dashboard");
    }

    return (
        <main className="privacy-experience-page">
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

            <section className="privacy-experience-shell">
                <div className="privacy-experience-hero">
                    <div className="privacy-experience-copy">
                        <span>Privacy-first design</span>
                        <h1>Eyecare guidance starts with privacy.</h1>
                        <p>
                            VisionGuard is designed to monitor everyday screen-use behavior without turning camera
                            access into a clinical or surveillance experience.
                        </p>
                    </div>

                    <div className="privacy-device-visual" aria-label="Privacy visual">
                        <div className="privacy-shield">
                            <div className="privacy-eye">
                                <span />
                            </div>
                        </div>
                        <div className="privacy-visual-copy">
                            <strong>Local preview</strong>
                            <p>Camera access supports behavior estimation while raw frames stay out of storage.</p>
                        </div>
                    </div>
                </div>

                <div className="privacy-principle-row">
                    {privacyPrinciples.map(([title, description]) => (
                        <article key={title}>
                            <h2>{title}</h2>
                            <p>{description}</p>
                        </article>
                    ))}
                </div>

                <div className="privacy-disclosure">
                    <div>
                        <h2>What VisionGuard keeps clear</h2>
                        <p>
                            DeepSeek helps translate monitoring data into readable summaries, risks, and practical next
                            steps. AI guidance is not medical diagnosis.
                        </p>
                    </div>
                    <ul>
                        {privacyDetails.map((detail) => (
                            <li key={detail}>{detail}</li>
                        ))}
                    </ul>
                </div>

                <button className="primary-button privacy-consent-button" onClick={handleConsent}>
                    I understand and allow camera access
                </button>
            </section>
        </main>
    );
}

export default PrivacyPage;
