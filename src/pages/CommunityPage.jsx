import { useEffect, useState } from "react";

const STORAGE_KEY = "mqz_community_quizzes";

function readQuizzes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
      if (event.key === STORAGE_KEY || event.key === null) refresh();
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("mqz-quiz-saved", refresh);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("mqz-quiz-saved", refresh);
    };
  }, []);

  return (
    <section className="page-card" aria-labelledby="community-heading">
      <p className="kicker">Community</p>
      <h2 id="community-heading" className="page-title">
        Quizzizz Gallery
      </h2>
      <p className="page-subtitle">
        New quizzes from the builder appear here immediately so authors can verify publish
        success.
      </p>

      {quizzes.length === 0 ? (
        <div className="panel">
          <h3>No quizzes yet</h3>
          <p>
            Create your first quiz from the Create Quizzizz page to populate this gallery.
          </p>
        </div>
      ) : (
        <ul className="data-list" aria-label="Community quizzes">
          {quizzes.map((quiz) => (
            <li key={quiz.id}>
              <h4>{quiz.title}</h4>
              <p>
                Topic: <strong>{quiz.topic}</strong> | Difficulty:{" "}
                <strong>{quiz.difficulty}</strong> | Questions:{" "}
                <strong>{quiz.questionCount}</strong>
              </p>
              <p style={{ marginTop: "0.35rem" }}>{quiz.description}</p>
              <p className="helper-text" style={{ marginTop: "0.42rem" }}>
                by {quiz.author} | {new Date(quiz.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
