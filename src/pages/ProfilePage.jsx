function readProfileStats() {
  const fallback = {
    totalAnswered: 0,
    totalCorrect: 0,
    totalStreak: 0,
    quizzesCreated: 0,
  };

  try {
    const raw = localStorage.getItem("mqz_profile_stats");
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);

    return {
      totalAnswered: Number(parsed?.totalAnswered) || 0,
      totalCorrect: Number(parsed?.totalCorrect) || 0,
      totalStreak: Number(parsed?.totalStreak) || 0,
      quizzesCreated: Number(parsed?.quizzesCreated) || 0,
    };
  } catch {
    return fallback;
  }
}

export default function ProfilePage({ user }) {
  const stats = readProfileStats();

  return (
    <section className="page-card" aria-labelledby="profile-heading">
      <p className="kicker">Profile</p>
      <h2 id="profile-heading" className="page-title">
        Player Profile
      </h2>
      <p className="page-subtitle">
        Stats are null-safe and default to zero to prevent rendering crashes.
      </p>

      <div className="grid-panels">
        <article className="panel">
          <h3>Identity</h3>
          <p>Name: {user?.displayName || "No display name set"}</p>
          <p>Email: {user?.email || "No email available"}</p>
        </article>

        <article className="panel">
          <h3>Progress Stats</h3>
          <p>Total Answered: {stats.totalAnswered}</p>
          <p>Total Correct: {stats.totalCorrect}</p>
          <p>Best Streak: {stats.totalStreak}</p>
          <p>Quizzes Created: {stats.quizzesCreated}</p>
        </article>
      </div>
    </section>
  );
}
