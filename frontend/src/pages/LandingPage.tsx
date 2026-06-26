import { useEffect } from "react";
import { Link } from "react-router-dom";

import logo from "../assets/VGlogo.png";

const featureRows = [
    {
        title: "Monitor real-time eye-use signals",
        description: "Track blink rhythm, viewing distance, lighting, and continuous screen time as you work.",
    },
    {
        title: "Detect behavior patterns",
        description: "VisionGuard identifies when your habits drift from comfortable ranges.",
    },
    {
        title: "Generate AI-powered reports",
        description: "Turn monitoring data into clear summaries, risk explanations, and practical next steps.",
    },
    {
        title: "Improve with smart guidance",
        description: "Receive timely reminders and personalized suggestions before discomfort builds up.",
    },
];

const signalStats = [
    ["Blink rhythm", "Recent 60s estimate"],
    ["Viewing distance", "Comfort range 50-100 cm"],
    ["Ambient light", "Target 300-750 lux"],
    ["Focus duration", "Break-aware sessions"],
];

const workflowSteps = [
    ["Capture", "Real-time eye-use signals are collected during active monitoring."],
    ["Analyze", "VisionGuard evaluates blink rhythm, distance, light, and focus duration."],
    ["Interpret", "AI turns the data into plain-language explanations and risk context."],
    ["Guide", "Users receive reminders, reports, and action plans for healthier routines."],
];

const productMoments = [
    ["Live comfort view", "See eye-use signals as a calm product surface instead of a clinical dashboard."],
    ["Daily AI summary", "Review what changed, what stayed healthy, and what to improve tomorrow."],
    ["Routine guidance", "Use light-touch reminders to protect focus without breaking your work rhythm."],
];

const privacyPrinciples = [
    [
        "Local camera preview",
        "Your monitoring view is designed to stay close to your device experience.",
    ],
    [
        "Behavioral guidance, not medical diagnosis",
        "VisionGuard explains everyday screen habits and does not replace professional eye-care advice.",
    ],
    [
        "Designed for calmer routines",
        "Use reminders, reports, and action plans to build healthier screen habits over time.",
    ],
];

function useRevealOnScroll() {
    useEffect(() => {
        const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

        if (!("IntersectionObserver" in window)) {
            elements.forEach((element) => element.classList.add("is-visible"));
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.16 },
        );

        elements.forEach((element) => observer.observe(element));
        return () => observer.disconnect();
    }, []);
}

function BrandLogo() {
    return (
        <Link className="marketing-brand" to="/">
            <img src={logo} alt="VisionGuard logo" />
            <span>
                <strong>VisionGuard</strong>
                <small>AI-powered eye-care monitoring</small>
            </span>
        </Link>
    );
}

function ProductPreview() {
    return (
        <div className="product-preview" aria-label="VisionGuard product preview">
            <div className="preview-surface-head">
                <span>Eye Health Score</span>
                <strong>92</strong>
            </div>
            <div className="preview-surface-body">
                <div className="score-ring" aria-hidden="true">
                    <span>Good</span>
                </div>
                <div className="preview-surface-copy">
                    <div>
                        <span>AI Insight</span>
                        <p>Your recent blink rhythm is lower than your usual baseline during long focus sessions.</p>
                    </div>
                    <div>
                        <span>Recommended Action</span>
                        <p>Take a 20-second visual break and sit slightly farther from your screen.</p>
                    </div>
                    <div>
                        <span>Daily AI Report</span>
                        <p>Review plain-language risk context and tomorrow's healthier routine plan.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AIReportPreview() {
    return (
        <div className="ai-report-preview">
            <div className="report-shimmer" />
            <div className="report-preview-header">
                <span>AI Report</span>
                <em>Powered by DeepSeek</em>
                <strong>Daily summary</strong>
            </div>
            <dl>
                <div>
                    <dt>Summary</dt>
                    <dd>Your screen habits were mostly stable today, but blink rhythm dropped during longer focus periods.</dd>
                </div>
                <div>
                    <dt>Main issue</dt>
                    <dd>Blink rate decreased after continuous screen use.</dd>
                </div>
                <div>
                    <dt>What looks good</dt>
                    <dd>Your viewing distance and lighting stayed within comfortable ranges.</dd>
                </div>
                <div>
                    <dt>Needs attention</dt>
                    <dd>Blink rhythm dropped during focused work sessions.</dd>
                </div>
                <div>
                    <dt>Action plan</dt>
                    <dd>Take a short visual reset, keep your screen at arm's length, and review the daily report.</dd>
                </div>
            </dl>
        </div>
    );
}

function ProductNarrative() {
    return (
        <section className="product-narrative-section" data-reveal>
            <div className="narrative-visual" aria-hidden="true">
                <div className="narrative-device">
                    <div className="device-score">92</div>
                    <div className="device-wave">
                        <span />
                        <span />
                        <span />
                    </div>
                    <div className="device-note">
                        <strong>AI Guidance</strong>
                        <p>Blink rhythm improved after your last break.</p>
                    </div>
                </div>
                <div className="floating-chip chip-one">Blink rhythm</div>
                <div className="floating-chip chip-two">Comfort distance</div>
                <div className="floating-chip chip-three">Daily summary</div>
            </div>
            <div className="narrative-copy">
                <h2>A calmer way to understand your screen routine.</h2>
                <p>
                    VisionGuard keeps the product experience light, readable, and action-oriented so eye-care guidance
                    feels like part of your day rather than another dashboard to manage.
                </p>
                <div className="narrative-points">
                    {productMoments.map(([title, description]) => (
                        <article key={title}>
                            <div>
                                <h3>{title}</h3>
                                <p>{description}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}

function LandingPage() {
    useRevealOnScroll();

    return (
        <main className="marketing-page">
            <nav className="marketing-nav" aria-label="Main navigation">
                <BrandLogo />
                <div className="marketing-nav-links">
                    <a href="#features">Features</a>
                    <a href="#ai-guidance">AI Guidance</a>
                    <a href="#privacy">Privacy</a>
                    <a href="mailto:qiz7712222@gmail.com">Contact</a>
                </div>
                <Link className="nav-cta" to="/register">
                    Create Account
                </Link>
            </nav>

            <section className="landing-hero">
                <div className="hero-orbit" aria-hidden="true" />
                <div className="hero-copy hero-animate">
                    <h1>AI-powered eye-care monitoring for healthier screen habits.</h1>
                    <p>
                        VisionGuard tracks your eye-use behavior in real time and turns blink rhythm, viewing
                        distance, lighting, and focus time into AI-powered reminders, reports, and daily guidance.
                    </p>
                    <div className="hero-actions">
                        <Link className="primary-button marketing-button" to="/login">
                            Get Started
                        </Link>
                        <Link className="secondary-button marketing-button" to="/register">
                            Create Account
                        </Link>
                    </div>
                </div>
                <div className="hero-visual hero-animate delayed">
                    <ProductPreview />
                </div>
            </section>

            <section className="feature-story-section" id="features" data-reveal>
                <div className="section-heading">
                    <h2>Understand your screen habits before they become fatigue.</h2>
                </div>
                <div className="feature-row-list">
                    {featureRows.map((feature) => (
                        <article className="feature-row" key={feature.title}>
                            <span aria-hidden="true" />
                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="ai-guidance-section" id="ai-guidance" data-reveal>
                <div className="ai-guidance-copy">
                    <h2>From raw signals to AI-powered guidance.</h2>
                    <p>
                        VisionGuard translates real-time eye-use data into readable insights, personalized reminders,
                        and structured daily reports.
                        DeepSeek helps translate monitoring data into summaries, risks, and practical next steps.
                    </p>
                    <p className="boundary-note">
                        AI guidance, not medical diagnosis. VisionGuard provides behavioral insights for everyday
                        screen habits. It does not replace professional eye-care advice.
                    </p>
                </div>
                <AIReportPreview />
            </section>

            <ProductNarrative />

            <section className="workflow-section" data-reveal>
                <div className="section-heading">
                    <h2>How VisionGuard uses AI</h2>
                </div>
                <div className="workflow-line">
                    {workflowSteps.map(([title, description]) => (
                        <article className="workflow-step" key={title}>
                            <span aria-hidden="true" />
                            <h3>{title}</h3>
                            <p>{description}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="signal-section" data-reveal>
                <div className="signal-heading">
                    <h2>Four signals. One calmer screen routine.</h2>
                    <p>VisionGuard understands screen habits through real-time behavioral signals.</p>
                </div>
                <div className="signal-grid">
                    {signalStats.map(([title, description]) => (
                        <article className="signal-stat" key={title}>
                            <span />
                            <strong>{title}</strong>
                            <p>{description}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="privacy-section" id="privacy" data-reveal>
                <div className="privacy-copy">
                    <h2>Built for everyday digital wellness.</h2>
                    <p>
                        Privacy-conscious local monitoring, behavior guidance, and daily summaries for healthier
                        screen routines.
                    </p>
                    <p className="privacy-boundary">
                        AI guidance, not medical diagnosis. VisionGuard provides behavioral insights for everyday
                        screen habits. It does not replace professional eye-care advice.
                    </p>
                </div>
                <div className="privacy-principles">
                    {privacyPrinciples.map(([title, description]) => (
                        <article className="privacy-row" key={title}>
                            <span aria-hidden="true" />
                            <div>
                                <h3>{title}</h3>
                                <p>{description}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section className="final-cta" data-reveal>
                <h2>Start building healthier screen habits with AI-powered guidance.</h2>
                <div className="hero-actions">
                    <Link className="primary-button marketing-button" to="/login">
                        Get Started
                    </Link>
                    <Link className="secondary-button marketing-button" to="/register">
                        Create Account
                    </Link>
                </div>
            </section>

            <footer className="marketing-footer">
                <div className="marketing-footer-inner">
                    <BrandLogo />
                    <div className="marketing-footer-links">
                        <a href="#features">Product</a>
                        <a href="#ai-guidance">AI Guidance</a>
                        <a href="#privacy">Privacy</a>
                        <a href="mailto:qiz7712222@gmail.com">Contact</a>
                    </div>
                    <p>© 2026 VisionGuard. All rights reserved.</p>
                </div>
            </footer>
        </main>
    );
}

export default LandingPage;
