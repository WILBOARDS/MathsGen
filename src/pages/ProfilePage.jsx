import { useState, useEffect } from "react";
import { motion } from "framer-motion";

function readProfileStats() {
  const fallback = {
    totalAnswered: 0,
    totalCorrect: 0,
    totalStreak: 0,
    quizzesCreated: 0,
  };

  try {
    const raw = localStorage.getItem("mqz_profile_stats");
    if (!raw) return fallback;
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

function useCountUp(target, duration = 1200) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const steps = 40;
    const increment = target / steps;
    const interval = duration / steps;
    let count = 0;
    const timer = setInterval(() => {
      count += 1;
      setCurrent(Math.min(Math.round(increment * count), target));
      if (count >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, [target, duration]);
  return current;
}

const BADGES = [
  { id: "first-quiz", label: "First Quiz", desc: "Created your first quiz", earned: (s) => s.quizzesCreated >= 1 },
  { id: "10-correct", label: "10 Correct", desc: "Answered 10 questions right", earned: (s) => s.totalCorrect >= 10 },
  { id: "streak-5", label: "Streak 5", desc: "5-question streak", earned: (s) => s.totalStreak >= 5 },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const panelVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function ProfilePage({ user }) {
  const [stats] = useState(readProfileStats);

  const displayAnswered = useCountUp(stats.totalAnswered);
  const displayCorrect = useCountUp(stats.totalCorrect);
  const displayStreak = useCountUp(stats.totalStreak);
  const displayCreated = useCountUp(stats.quizzesCreated);

  const accuracy =
    stats.totalAnswered > 0
      ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
      : 0;

  return (
    <section className="page-card" aria-labelledby="profile-heading">
      <p className="kicker">Profile</p>
      <h2 id="profile-heading" className="page-title">
        Player Profile
      </h2>
      <motion.div
        className="grid-panels"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.article className="panel" variants={panelVariants}>
          <h3>Identity</h3>
          <p>Name: {user?.displayName || "No display name set"}</p>
          <p>Email: {user?.email || "No email available"}</p>
        </motion.article>

        <motion.article className="panel" variants={panelVariants}>
          <h3>Progress Stats</h3>
          <p>Total Answered: {displayAnswered}</p>
          <p>Total Correct: {displayCorrect}</p>
          <p>Best Streak: {displayStreak}</p>
          <p>Quizzes Created: {displayCreated}</p>
          <div style={{ marginTop: "0.6rem" }}>
            <p style={{ fontSize: "0.82rem", marginBottom: "0.3rem" }}>
              Accuracy: {accuracy}%
            </p>
            <div
              style={{
                background: "#e8ecf4",
                borderRadius: "999px",
                height: "8px",
                overflow: "hidden",
              }}
            >
              <motion.div
                style={{
                  background: "var(--accent)",
                  height: "100%",
                  borderRadius: "999px",
                }}
                initial={{ width: 0 }}
                animate={{ width: `${accuracy}%` }}
                transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.article>

        <motion.article className="panel" variants={panelVariants}>
          <h3>Achievements</h3>
          <div className="grid-panels" style={{ gap: "0.5rem" }}>
            {BADGES.map((badge, i) => {
              const earned = badge.earned(stats);
              return (
                <motion.div
                  key={badge.id}
                  style={{
                    padding: "0.6rem",
                    borderRadius: "0.6rem",
                    border: "1px solid",
                    borderColor: earned ? "#8fe8b5" : "var(--soft-border)",
                    background: earned ? "#ebfff3" : "#f8fafc",
                    textAlign: "center",
                  }}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: earned ? 1 : 0.55, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.35 }}
                >
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "0.85rem" }}>
                    {earned ? "✓ " : ""}{badge.label}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "#4a5976" }}>
                    {badge.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.article>
      </motion.div>
    </section>
  );
}
