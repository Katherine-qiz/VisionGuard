import { Link } from "react-router-dom";

function LandingPage() {
    return (
        <main className="page">
            <section className="simple-card">
                <p className="eyebrow">VisionGuard</p>
                <h1>Build better eye-care habits with AI</h1>
                <p className="subtitle">
                    Monitor blink rate, viewing distance, ambient brightness, and screen
                    time. Get AI-powered reports that help you build healthier screen
                    habits.
                </p>

                <div className="actions">
                    <Link className="primary-button" to="/login">
                        Get Started
                    </Link>
                    <Link className="secondary-button" to="/dashboard">
                        Try Demo
                    </Link>
                </div>
            </section>
        </main>
    );
}

export default LandingPage;