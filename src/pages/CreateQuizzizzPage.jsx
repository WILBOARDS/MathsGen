import { useState } from "react";
import { useNavigate } from "react-router-dom";

const STORAGE_KEY = "mqz_community_quizzes";

function readExistingQuizzes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function CreateQuizzizzPage({ user }) {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [form, setForm] = useState({
    title: "",
    topic: "",
    difficulty: "medium",
    questionCount: 10,
    description: "",
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    setStatus({ type: "", text: "" });
    setIsSaving(true);

    const normalizedTitle = form.title.trim();
    const normalizedTopic = form.topic.trim();
    const normalizedDescription = form.description.trim();

    if (!normalizedTitle || !normalizedTopic || !normalizedDescription) {
      setStatus({
        type: "error",
        text: "Please complete every required field before saving.",
      });
      setIsSaving(false);
      return;
    }

    const nextQuiz = {
      id: `quiz-${Date.now()}`,
      title: normalizedTitle,
      topic: normalizedTopic,
      difficulty: form.difficulty,
      questionCount: Number(form.questionCount),
      description: normalizedDescription,
      author: user?.displayName || user?.email || "Unknown creator",
      createdAt: new Date().toISOString(),
    };

    const existing = readExistingQuizzes();
    const updated = [nextQuiz, ...existing].slice(0, 80);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      try {
        const statsRaw = localStorage.getItem("mqz_profile_stats");
        const stats = statsRaw ? JSON.parse(statsRaw) : {};
        stats.quizzesCreated = (Number(stats.quizzesCreated) || 0) + 1;
        localStorage.setItem("mqz_profile_stats", JSON.stringify(stats));
      } catch {
        // Stats update is best-effort, don't block the main flow
      }
      setStatus({
        type: "success",
        text: "Quizzizz saved. Redirecting to community gallery...",
      });
      setTimeout(() => {
        navigate("/community", { replace: true });
      }, 600);
    } catch {
      setStatus({
        type: "error",
        text: "Could not save quiz locally. Try again in normal browser mode.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="page-card" aria-labelledby="create-quizzizz-heading">
      <p className="kicker">Builder</p>
      <h2 id="create-quizzizz-heading" className="page-title">
        Create Quizzizz
      </h2>
      <p className="page-subtitle">
        Required fields are marked in red. Saved quizzes appear in Community immediately.
      </p>

      {status.text ? (
        <p className={`status-block ${status.type === "success" ? "success" : "error"}`}>
          {status.text}
        </p>
      ) : null}

      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Quiz Title <span className="required-mark">*</span>
          <input
            type="text"
            required
            value={form.title}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="Quadratic Mastery Sprint"
          />
        </label>

        <label>
          Topic <span className="required-mark">*</span>
          <input
            type="text"
            required
            value={form.topic}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, topic: event.target.value }))
            }
            placeholder="Algebra"
          />
        </label>

        <label>
          Difficulty
          <select
            value={form.difficulty}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, difficulty: event.target.value }))
            }
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>

        <label>
          Number of Questions
          <input
            type="number"
            min={5}
            max={50}
            value={form.questionCount}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, questionCount: event.target.value }))
            }
          />
        </label>

        <label>
          Description <span className="required-mark">*</span>
          <textarea
            required
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
            placeholder="What skills does this quiz test?"
          />
        </label>

        <button type="submit" disabled={isSaving} className="button-primary">
          {isSaving ? "Saving..." : "Save Quizzizz"}
        </button>
      </form>
    </section>
  );
}
