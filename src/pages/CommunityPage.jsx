import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { STORAGE_KEYS, CUSTOM_EVENTS } from "../constants/storageKeys.js";

function readQuizzes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMMUNITY_QUIZZES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function CommunityPage() {
  const [quizzes, setQuizzes] = useState(() => readQuizzes());

  useEffect(() => {
    const refresh = () => setQuizzes(readQuizzes());
    const handleStorage = (event) => {
      if (event.key === STORAGE_KEYS.COMMUNITY_QUIZZES || event.key === null) refresh();
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener(CUSTOM_EVENTS.QUIZ_SAVED, refresh);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(CUSTOM_EVENTS.QUIZ_SAVED, refresh);
    };
  }, []);

  return (
    <section className="page-card" aria-labelledby="community-heading">
      <p className="kicker">Community</p>
      <h2 id="community-heading" className="page-title">
        Quizzizz Gallery
      </h2>
      <p className="page-subtitle">
        Browse quizzes created by the community. Jump in and play one, or build your own.
      </p>

      {quizzes.length === 0 ? (
        <div className="panel">
          <h3>No quizzes yet</h3>
          <p style={{ marginBottom: "0.85rem" }}>
            Create your first quiz to populate this gallery — or jump straight into a
            randomly-generated quiz right now.
          </p>
          <div className="inline-row">
            <Link to="/create-quizzizz" className="button-primary button-link">
              Create a Quiz
            </Link>
            <Link to="/quiz" className="button-secondary button-link">
              Play Quick Quiz
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="inline-row" style={{ marginBottom: "1rem" }}>
            <Link to="/create-quizzizz" className="button-primary button-link">
              + Create Quiz
            </Link>
            <Link to="/quiz" className="button-secondary button-link">
              Play Quick Quiz
            </Link>
          </div>
          <ul className="data-list" aria-label="Community quizzes">
            {quizzes.map((quiz) => (
              <li key={quiz.id}>
                <div className="inline-row" style={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: "0 0 0.3rem" }}>{quiz.title}</h4>
                    <p style={{ margin: 0 }}>
                      Topic: <strong>{quiz.topic}</strong> | Difficulty:{" "}
                      <strong style={{ textTransform: "capitalize" }}>{quiz.difficulty}</strong> | Questions:{" "}
                      <strong>{quiz.questionCount}</strong>
                    </p>
                    <p style={{ marginTop: "0.35rem" }}>{quiz.description}</p>
                    <p className="helper-text" style={{ marginTop: "0.42rem" }}>
                      by {quiz.author} · {new Date(quiz.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Link
                    to="/quiz"
                    className="button-secondary button-link"
                    style={{ flexShrink: 0 }}
                  >
                    Play ▶
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
