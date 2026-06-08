type EyeBuddyCardProps = {
    score: number;
};

function getBuddyStatus(score: number) {
    if (score >= 85) {
        return {
            emoji: "😊",
            status: "Happy",
            message: "Great job! Your eye-care habits look good today.",
        };
    }

    if (score >= 70) {
        return {
            emoji: "🙂",
            status: "Okay",
            message: "You are doing fine. A short break will help you stay fresh.",
        };
    }

    if (score >= 50) {
        return {
            emoji: "😵‍💫",
            status: "Tired",
            message: "Your eyes may need a rest. Try stepping away for a few minutes.",
        };
    }

    return {
        emoji: "😴",
        status: "Needs rest",
        message: "Your eye-care score is low. Please take a break now.",
    };
}

function EyeBuddyCard({ score }: EyeBuddyCardProps) {
    const buddy = getBuddyStatus(score);

    return (
        <section className="panel eye-buddy-card">
            <div className="panel-header compact">
                <div>
                    <p className="eyebrow">Eye Buddy</p>
                    <h2>{buddy.status}</h2>
                </div>
                <span className="status-badge good-status">Energy {score}%</span>
            </div>

            <div className="buddy-body">
                <div className="buddy-avatar">{buddy.emoji}</div>
                <p>{buddy.message}</p>
            </div>
        </section>
    );
}

export default EyeBuddyCard;