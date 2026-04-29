import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { staggerContainer, fadeSlideUp } from "../utils/motionVariants.js";
import { STORAGE_KEYS } from "../constants/storageKeys.js";

const panelVariants = fadeSlideUp;

function readProfileStats() {
  const fallback = {
    totalAnswered: 0,
    totalCorrect: 0,
    totalStreak: 0,
    quizzesCreated: 0,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE_STATS);
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

function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setValue(target);
        clearInterval(timer);
      } else {
        setValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}


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

  const badges = [
    {
      id: "first-quiz",
      label: "First Quiz",
      desc: "Created your first quiz",
      earned: stats.quizzesCreated >= 1,
    },
    {
      id: "getting-started",
      label: "Getting Started",
      desc: "Answered your first question",
      earned: stats.totalAnswered >= 1,
    },
    {
      id: "sharp-mind",
      label: "Sharp Mind",
      desc: "80%+ accuracy",
      earned: accuracy >= 80,
    },
  ];

  return (
    <section className="page-card" aria-labelledby="profile-heading">
      <p className="kicker">Profile</p>
      <h2 id="profile-heading" className="page-title">
        Player Profile
      </h2>
      <p className="page-subtitle">
        Your learning journey at a glance. Play quizzes to grow your stats.
      </p>
      <motion.div
        className="grid-panels"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.article className="panel" variants={fadeSlideUp}>
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
          {stats.totalAnswered > 0 && (
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
                  initial={{ width: "0%" }}
                  animate={{ width: `${accuracy}%` }}
                  transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </motion.article>

        <motion.article className="panel" variants={panelVariants}>
          <h3>Achievements</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {badges.map((badge, i) => (
              <motion.div
                key={badge.id}
                style={{
                  padding: "0.6rem",
                  borderRadius: "0.6rem",
                  border: "1px solid",
                  borderColor: badge.earned ? "#8fe8b5" : "var(--soft-border)",
                  background: badge.earned ? "#ebfff3" : "#f8fafc",
                  textAlign: "center",
                  opacity: badge.earned ? 1 : 0.45,
                }}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: badge.earned ? 1 : 0.45, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.35 }}
              >
                <p style={{ margin: 0, fontWeight: 700, fontSize: "0.85rem" }}>
                  {badge.earned ? "✓ " : ""}
                  {badge.label}
                </p>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#4a5976" }}>
                  {badge.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.article>
      </motion.div>

      {stats.totalAnswered === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          style={{ marginTop: "1.2rem" }}
          className="hero-callout"
        >
          <p style={{ margin: "0 0 0.6rem", fontWeight: 700 }}>🎯 Ready to start?</p>
          <p style={{ margin: "0 0 0.85rem", fontSize: "0.9rem", color: "#4a5976" }}>
            Play your first quiz to unlock stats, build a streak, and earn badges.
          </p>
          <Link to="/quiz" className="button-primary button-link">
            Play a Quiz Now
          </Link>
        </motion.div>
      )}
    </section>
  );
}
