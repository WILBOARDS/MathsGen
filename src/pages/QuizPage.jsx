import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { STORAGE_KEYS } from "../constants/storageKeys.js";

function generateOptions(correct) {
  const offsets = [1, 2, 3, 4, 5, -1, -2, -3, -4, -5].sort(() => Math.random() - 0.5);
  const wrong = [];
  for (const offset of offsets) {
    const candidate = correct + offset;
    if (candidate !== correct && candidate >= 0 && !wrong.includes(candidate)) {
      wrong.push(candidate);
      if (wrong.length === 3) break;
    }
  }
  return [...wrong, correct].sort(() => Math.random() - 0.5);
}

function generateQuestion(difficulty, id) {
  let a, b, problem, correct;
  if (difficulty === "easy") {
    a = Math.floor(Math.random() * 20) + 1;
    b = Math.floor(Math.random() * 20) + 1;
    const op = Math.random() > 0.5 ? "+" : "-";
    if (op === "-" && b > a) [a, b] = [b, a];
    correct = op === "+" ? a + b : a - b;
    problem = `${a} ${op} ${b} = ?`;
  } else if (difficulty === "medium") {
    a = Math.floor(Math.random() * 11) + 2;
    b = Math.floor(Math.random() * 11) + 2;
    const op = Math.random() > 0.5 ? "×" : "+";
    if (op === "+") {
      const c = Math.floor(Math.random() * 10) + 1;
      correct = a + b + c;
      problem = `${a} + ${b} + ${c} = ?`;
    } else {
      correct = a * b;
      problem = `${a} × ${b} = ?`;
    }
  } else {
    a = Math.floor(Math.random() * 50) + 10;
    b = Math.floor(Math.random() * 50) + 10;
    const ops = ["+", "-", "×"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    if (op === "-" && b > a) [a, b] = [b, a];
    correct = op === "+" ? a + b : op === "-" ? a - b : a * b;
    problem = `${a} ${op} ${b} = ?`;
  }
  return { id, problem, correct, options: generateOptions(correct) };
}

function buildQuiz(difficulty) {
  return Array.from({ length: 10 }, (_, i) => generateQuestion(difficulty, `q${i}`));
}

function saveStats(score, total) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE_STATS);
    const stats = raw ? JSON.parse(raw) : {};
    stats.totalAnswered = (Number(stats.totalAnswered) || 0) + total;
    stats.totalCorrect = (Number(stats.totalCorrect) || 0) + score;
    stats.totalStreak = Math.max(Number(stats.totalStreak) || 0, score);
    localStorage.setItem(STORAGE_KEYS.PROFILE_STATS, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

function motivationalMessage(score) {
  if (score === 10) return "Perfect score! You're a math genius!";
  if (score >= 8) return "Excellent work! Almost perfect!";
  if (score >= 6) return "Good job! Keep practicing!";
  if (score >= 4) return "Not bad! You can do better!";
  return "Keep trying — practice makes perfect!";
}

export default function QuizPage() {
  const [difficulty, setDifficulty] = useState("easy");
  const [phase, setPhase] = useState("setup");
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      handleAnswer(null);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft]);

  const startQuiz = () => {
    setQuestions(buildQuiz(difficulty));
    setCurrentIndex(0);
    setScore(0);
    setSelected(null);
    setTimeLeft(15);
    setPhase("playing");
  };

  const handleAnswer = (option) => {
    if (phase !== "playing") return;
    setSelected(option);
    setPhase("answered");
    const isCorrect = option === questions[currentIndex].correct;
    if (isCorrect) setScore((s) => s + 1);
    setTimeout(() => {
      const next = currentIndex + 1;
      if (next >= questions.length) {
        setPhase("finished");
        saveStats(isCorrect ? score + 1 : score, questions.length);
      } else {
        setCurrentIndex(next);
        setSelected(null);
        setTimeLeft(15);
        setPhase("playing");
      }
    }, 1200);
  };

  if (phase === "setup") {
    return (
      <section className="page-card" aria-labelledby="quiz-setup-heading">
        <p className="kicker">Quick Play</p>
        <h2 id="quiz-setup-heading" className="page-title">Start a Math Quiz</h2>
        <p className="page-subtitle">Choose your difficulty and answer 10 questions before the timer runs out.</p>

        <div className="inline-row" style={{ marginTop: "1.5rem", gap: "0.75rem", flexWrap: "wrap" }}>
          {["easy", "medium", "hard"].map((level) => (
            <motion.button
              key={level}
              type="button"
              className={difficulty === level ? "button-primary" : "button-secondary"}
              onClick={() => setDifficulty(level)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ textTransform: "capitalize" }}
            >
              {level}
            </motion.button>
          ))}
        </div>

        <div style={{ marginTop: "2rem" }}>
          <motion.button
            type="button"
            className="button-primary"
            onClick={startQuiz}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Start Quiz
          </motion.button>
        </div>
      </section>
    );
  }

  if (phase === "playing" || phase === "answered") {
    const question = questions[currentIndex];
    const isAnswered = phase === "answered";

    return (
      <section className="page-card" aria-labelledby="quiz-question-heading">
        <p className="kicker">Question {currentIndex + 1} of {questions.length}</p>
        <div className="inline-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 id="quiz-question-heading" className="page-title" style={{ margin: 0 }}>
            Score: {score}
          </h2>
          <div
            className={`quiz-timer${timeLeft <= 5 ? " urgent" : ""}`}
            aria-label={`Time left: ${timeLeft} seconds`}
          >
            {timeLeft}s
          </div>
        </div>

        {/* CSS class handles base styles; only dynamic values go inline */}
        <div className="quiz-progress-bar" style={{ margin: "0.75rem 0" }}>
          <div
            className="quiz-progress-fill"
            style={{
              width: `${(timeLeft / 15) * 100}%`,
              background: timeLeft <= 5 ? "var(--danger)" : "var(--accent)",
            }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <article className="panel" style={{ textAlign: "center", padding: "2rem", marginTop: "1rem" }}>
              <p style={{ fontSize: "2rem", fontWeight: "bold" }}>{question.problem}</p>
            </article>

            <div className="grid-panels" style={{ marginTop: "1rem" }}>
              {question.options.map((option) => {
                const isSelected = selected === option;
                const isCorrect = option === question.correct;
                let animateProps = {};
                if (isAnswered && isSelected && isCorrect) {
                  animateProps = { scale: [1, 1.1, 1] };
                } else if (isAnswered && isSelected && !isCorrect) {
                  animateProps = { x: [0, -8, 8, -8, 0] };
                }

                let buttonStyle = {};
                if (isAnswered) {
                  if (isCorrect) {
                    buttonStyle = {
                      background: "var(--feedback-correct)",
                      color: "white",
                      borderColor: "var(--feedback-correct)",
                    };
                  } else if (isSelected) {
                    buttonStyle = {
                      background: "var(--feedback-wrong)",
                      color: "white",
                      borderColor: "var(--feedback-wrong)",
                    };
                  }
                }

                return (
                  <motion.button
                    key={option}
                    type="button"
                    className="button-secondary"
                    onClick={() => handleAnswer(option)}
                    disabled={isAnswered}
                    whileHover={isAnswered ? {} : { scale: 1.03 }}
                    whileTap={isAnswered ? {} : { scale: 0.97 }}
                    animate={animateProps}
                    transition={{ duration: 0.4 }}
                    style={{
                      width: "100%",
                      padding: "1rem",
                      fontSize: "1.1rem",
                      cursor: isAnswered ? "default" : "pointer",
                      ...buttonStyle,
                    }}
                  >
                    {option}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </section>
    );
  }

  if (phase === "finished") {
    const accuracy = Math.round((score / questions.length) * 100);
    return (
      <section className="page-card" aria-labelledby="quiz-finished-heading">
        <AnimatePresence>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            <p className="kicker">Quiz Complete!</p>
            <h2 id="quiz-finished-heading" className="page-title">
              {score} / {questions.length}
            </h2>
            <p className="page-subtitle">Accuracy: {accuracy}%</p>
            <p style={{ fontSize: "1.1rem", marginTop: "0.5rem" }}>{motivationalMessage(score)}</p>

            <div className="inline-row" style={{ marginTop: "2rem", gap: "0.75rem", flexWrap: "wrap" }}>
              <motion.button
                type="button"
                className="button-primary"
                onClick={() => setPhase("setup")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Play Again
              </motion.button>
              <Link to="/dashboard" className="button-secondary button-link">
                Back to Dashboard
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>
    );
  }

  return null;
}
