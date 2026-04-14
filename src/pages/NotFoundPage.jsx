import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section className="page-card compact" aria-labelledby="not-found-heading">
      <p className="kicker">404</p>
      <h2 id="not-found-heading" className="page-title">
        Route Not Found
      </h2>
      <p className="page-subtitle">
        The page you requested does not exist in the current route map.
      </p>
      <div className="inline-row">
        <Link to="/landing" className="button-primary button-link">
          Go to Landing
        </Link>
        <Link to="/dashboard" className="button-secondary button-link">
          Go to Dashboard
        </Link>
      </div>
    </section>
  );
}
