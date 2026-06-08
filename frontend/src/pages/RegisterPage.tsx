import { Link, useNavigate } from "react-router-dom";

function RegisterPage() {
    const navigate = useNavigate();

    function handleRegister() {
        localStorage.setItem("visionguard_username", "new_user");
        navigate("/privacy");
    }

    return (
        <main className="page">
            <section className="simple-card auth-card">
                <p className="eyebrow">Register</p>
                <h1>Create your account</h1>
                <p className="subtitle">Start building better eye-care habits with AI.</p>

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

                <p className="small-text">
                    Already have an account? <Link to="/login">Log in</Link>
                </p>
            </section>
        </main>
    );
}

export default RegisterPage;