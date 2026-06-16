import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

type PlaceholderPageProps = {
    eyebrow: string;
    title: string;
    description: string;
};

function PlaceholderPage({ eyebrow, title, description }: PlaceholderPageProps) {
    const username = localStorage.getItem("visionguard_username") || "Katherine";

    return (
        <div className="dashboard-shell">
            <Sidebar />
            <main className="dashboard-main">
                <TopBar username={username} />
                <div className="dashboard-content">
                    <section className="panel">
                        <p className="eyebrow">{eyebrow}</p>
                        <h2>{title}</h2>
                        <p className="panel-helper">{description}</p>
                    </section>
                </div>
            </main>
        </div>
    );
}

export default PlaceholderPage;
