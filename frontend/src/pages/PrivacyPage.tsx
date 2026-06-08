import { useNavigate } from "react-router-dom";

function PrivacyPage() {
    const navigate = useNavigate();

    function handleConsent() {
        localStorage.setItem("visionguard_camera_consent", "true");
        navigate("/dashboard");
    }

    return (
        <main className="page">
            <section className="simple-card privacy-card">
                <p className="eyebrow">Privacy-first design</p>
                <h1>Camera access & privacy</h1>
                <p className="subtitle">
                    VisionGuard uses your webcam only to estimate eye-use behavior in real time.
                </p>

                <ul className="promise-list">
                    <li>We do not save raw video frames.</li>
                    <li>We do not upload face images.</li>
                    <li>We only store numerical metrics.</li>
                    <li>You can stop monitoring anytime.</li>
                    <li>AI reports are not medical diagnosis.</li>
                </ul>

                <button className="primary-button full-width" onClick={handleConsent}>
                    I understand and allow camera access
                </button>
            </section>
        </main>
    );
}

export default PrivacyPage;