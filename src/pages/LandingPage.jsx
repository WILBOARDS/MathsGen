import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <section className="page-card" aria-labelledby="landing-heading">
      <div className="hero-grid">
        <div>
          <p className="kicker">Public Landing</p>
          <h2 id="landing-heading" className="page-title">
            Practice Math Like A Game, Not A Chore
          </h2>
          <p className="page-subtitle">
            Adaptive quiz experiences, social study loops, and AI-guided explanations in
            one learning platform.
          </p>
          <div className="inline-row">
            <Link to="/auth" className="button-primary button-link">
              Get Started
            </Link>
            <Link to="/ai-study-assistant" className="button-secondary button-link">
              Explore AI Study Assistant
            </Link>
          </div>
        </div>

        <aside className="hero-callout">
          <h3>Launch Notes</h3>
          <ul>
            <li>Route persistence is now enabled.</li>
            <li>AI Study Assistant has a public route.</li>
            <li>Community and Create Quizzizz are live behind auth.</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
