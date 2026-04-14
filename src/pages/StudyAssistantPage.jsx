import { Link } from "react-router-dom";

export default function StudyAssistantPage({ isAuthenticated }) {
  return (
    <section className="page-card" aria-labelledby="assistant-heading">
      <p className="kicker">Core Feature</p>
      <h2 id="assistant-heading" className="page-title">
        AI Study Assistant
      </h2>
      <p className="page-subtitle">
        Publicly visible feature page with explainers, revision planning, and guided study
        patterns.
      </p>

      <div className="grid-panels">
        <article className="panel">
          <h3>Step-by-step explanations</h3>
          <p>Ask for worked solutions and concept-first reasoning.</p>
        </article>
        <article className="panel">
          <h3>Targeted revision plans</h3>
          <p>Build weekly checklists based on mistakes and difficulty level.</p>
        </article>
        <article className="panel">
          <h3>Context-aware hints</h3>
          <p>Unlock hints without revealing full answers too early.</p>
        </article>
      </div>

      <div className="inline-row" style={{ marginTop: "1rem" }}>
        {isAuthenticated ? (
          <Link to="/dashboard" className="button-primary button-link">
            Continue to Dashboard
          </Link>
        ) : (
          <Link to="/auth" className="button-primary button-link">
            Sign In to Use AI Tools
          </Link>
        )}
      </div>
    </section>
  );
}
