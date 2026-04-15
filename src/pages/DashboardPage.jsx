import { Link } from "react-router-dom";

export default function DashboardPage({ user }) {
  const displayName = user?.displayName || user?.email || "Learner";

  return (
    <section className="page-card" aria-labelledby="dashboard-heading">
      <p className="kicker">Authenticated Dashboard</p>
      <h2 id="dashboard-heading" className="page-title">
        Welcome back, {displayName}
      </h2>
      <p className="page-subtitle">
        Quick links to your active workflows while we progressively rebuild full feature
        parity.
      </p>

      <div className="grid-panels">
        <article className="panel">
          <h3>Create Quizzizz</h3>
          <p>
            Draft and publish new quiz sets with required fields and local draft
            resilience.
          </p>
          <Link
            to="/create-quizzizz"
            className="button-primary button-link"
            style={{ marginTop: "0.6rem" }}
          >
            Open Builder
          </Link>
        </article>

        <article className="panel">
          <h3>Community Gallery</h3>
          <p>See recently created quizzes and verify they persist in the app gallery.</p>
          <Link
            to="/community"
            className="button-secondary button-link"
            style={{ marginTop: "0.6rem" }}
          >
            View Gallery
          </Link>
        </article>

        <article className="panel">
          <h3>Friends Chat</h3>
          <p>
            Use room chat and the mini dock popup in the lower-right for fast check-ins.
          </p>
          <Link
            to="/friends"
            className="button-secondary button-link"
            style={{ marginTop: "0.6rem" }}
          >
            Open Chat
          </Link>
        </article>

        <article className="panel">
          <h3>Play a Quiz</h3>
          <p>
            Answer 10 randomised math questions against the clock. Track your streak and
            accuracy in your profile.
          </p>
          <Link
            to="/quiz"
            className="button-primary button-link"
            style={{ marginTop: "0.6rem" }}
          >
            Start Playing
          </Link>
        </article>
      </div>
    </section>
  );
}
