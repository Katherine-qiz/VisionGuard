import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function LoginPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");

    function handleLogin() {
        const finalUsername = username.trim() || "demo_user";
        localStorage.setItem("visionguard_username", finalUsername);
        navigate("/privacy");
    }

    return (
        <main className="page">
            <section className="simple-card auth-card">
                <p className="eyebrow">Login</p>
                <h1>Welcome back</h1>
                <p className="subtitle">Continue your eye-care monitoring journey.</p>

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

                <p className="small-text">
                    Don’t have an account? <Link to="/register">Create one</Link>
                </p>
            </section>
        </main>
    );
}

export default LoginPage;