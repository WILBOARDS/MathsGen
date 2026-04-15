import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { fadeSlideUp } from "../utils/motionVariants.js";

const headerVariants = fadeSlideUp;
const cardVariants = fadeSlideUp;

const CARDS = [
  {
    title: "Step-by-step explanations",
    body: "Ask for worked solutions and concept-first reasoning.",
  },
  {
    title: "Targeted revision plans",
    body: "Build weekly checklists based on mistakes and difficulty level.",
  },
  {
    title: "Context-aware hints",
    body: "Unlock hints without revealing full answers too early.",
  },
];

const DEMO = {
  problem: "Solve for x: 2x + 5 = 13",
  hint: "Try subtracting 5 from both sides first. What do you get?",
  answer: "x = 4",
};

export default function StudyAssistantPage({ isAuthenticated }) {
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <section className="page-card" aria-labelledby="assistant-heading">
      <motion.p
        className="kicker"
        variants={headerVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.4 }}
      >
        Core Feature
      </motion.p>

      <motion.h2
        id="assistant-heading"
        className="page-title"
        variants={headerVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        AI Study Assistant
      </motion.h2>

      <motion.p
        className="page-subtitle"
        variants={headerVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        Publicly visible feature page with explainers, revision planning, and guided study
        patterns.
      </motion.p>

      <div className="grid-panels">
        {CARDS.map((card, index) => (
          <motion.article
            key={card.title}
            className="panel"
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.15 }}
            whileHover={{ scale: 1.02, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
            whileTap={{ scale: 0.98 }}
          >
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </motion.article>
        ))}
      </div>

      <motion.div
        className="panel"
        style={{ marginTop: "1.5rem" }}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <h3 style={{ marginBottom: "0.5rem" }}>Try a hint</h3>
        <p style={{ marginBottom: "1rem" }}>
          <strong>{DEMO.problem}</strong>
        </p>

        <div className="inline-row" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
          <motion.button
            className="button-primary"
            onClick={() => setShowHint(true)}
            disabled={showHint}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            Get a Hint
          </motion.button>

          {showHint && (
            <motion.button
              className="button-primary"
              onClick={() => setShowAnswer(true)}
              disabled={showAnswer}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              Show Answer
            </motion.button>
          )}
        </div>

        <AnimatePresence>
          {showHint && (
            <motion.p
              key="hint"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35 }}
              style={{ marginTop: "0.75rem", fontStyle: "italic" }}
            >
              Hint: {DEMO.hint}
            </motion.p>
          )}

          {showAnswer && (
            <motion.p
              key="answer"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35 }}
              style={{ marginTop: "0.5rem", fontWeight: "bold" }}
            >
              Answer: {DEMO.answer}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

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
