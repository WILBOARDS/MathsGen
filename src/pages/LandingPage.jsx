import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { staggerContainer, fadeSlideUp } from "../utils/motionVariants.js";

/* ─── Motion helpers ─────────────────────────────────────────────────────── */

function PressableLink({ to, className, children }) {
  return (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
      <Link to={to} className={className}>
        {children}
      </Link>
    </motion.div>
  );
}

function SectionLabel({ children }) {
  return (
    <motion.p
      className="kicker"
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.p>
  );
}

/* ─── Static data ────────────────────────────────────────────────────────── */

const FLOATING = [
  { s: "+", x: "4%",  y: "12%", d: 0,    size: "2.2rem" },
  { s: "×", x: "90%", y: "8%",  d: 0.4,  size: "2rem"   },
  { s: "÷", x: "94%", y: "72%", d: 0.7,  size: "1.8rem" },
  { s: "=", x: "2%",  y: "78%", d: 1.0,  size: "2.4rem" },
  { s: "π", x: "48%", y: "3%",  d: 0.2,  size: "1.9rem" },
  { s: "∑", x: "80%", y: "40%", d: 0.55, size: "1.6rem" },
  { s: "√", x: "18%", y: "90%", d: 0.85, size: "1.7rem" },
];

const STATS = [
  { value: "50 K+",  label: "Questions answered" },
  { value: "12 K+",  label: "Active learners"    },
  { value: "98 %",   label: "Would recommend"    },
  { value: "4.9 ★",  label: "Average rating"     },
];

const FEATURES = [
  {
    emoji: "🎯",
    title: "Adaptive Difficulty",
    body: "The engine tracks every answer in real time and shifts question difficulty on the fly — so you're always in the sweet spot between bored and overwhelmed.",
  },
  {
    emoji: "🤖",
    title: "AI Study Assistant",
    body: "Stuck on a problem? Ask for a hint that explains the 'why', not just the answer. Get full step-by-step breakdowns, targeted revision plans, and concept maps.",
  },
  {
    emoji: "⏱️",
    title: "Timed Challenges",
    body: "Race the clock. Each question gives you 15 seconds. Under pressure you build real fluency — not just recognition — which is what tests actually measure.",
  },
  {
    emoji: "👥",
    title: "Social Study Rooms",
    body: "Challenge a friend, share a quiz link, or join a live leaderboard sprint. Learning sticks better when there's a friendly rival pushing you.",
  },
  {
    emoji: "📊",
    title: "Progress Dashboard",
    body: "See your accuracy, best streak, and accuracy trend across every session. Your profile evolves as you improve — badges unlock, stats climb.",
  },
  {
    emoji: "🏆",
    title: "Leaderboard & Badges",
    body: "Earn achievement badges for milestones: first quiz, 80 % accuracy, 10-streak. Climb the weekly leaderboard and see your name at the top.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Create your free account",
    body: "Sign up in under 30 seconds — just an email and password. No credit card, no long forms.",
  },
  {
    n: "02",
    title: "Pick a topic and difficulty",
    body: "Choose from easy mental maths to hard algebra and beyond. Or let the AI recommend where to start.",
  },
  {
    n: "03",
    title: "Answer, learn, repeat",
    body: "Get instant feedback, unlock hints when you're stuck, and watch your stats grow with every session.",
  },
];

const TESTIMONIALS = [
  {
    name: "Aisha K.",
    role: "Year 10 student",
    quote: "I went from dreading maths to looking forward to it. The timed questions make it feel like a game.",
  },
  {
    name: "Mr. Reeves",
    role: "Secondary school teacher",
    quote: "I recommend MathQuizzizz to every student who wants daily practice without it feeling like homework.",
  },
  {
    name: "Dani T.",
    role: "A-Level student",
    quote: "The AI hints are surprisingly good. It nudges you toward the answer rather than just giving it away.",
  },
];

/* ─── Mini demo quiz ─────────────────────────────────────────────────────── */

const DEMO_QUESTION = {
  problem: "What is  12 × 9?",
  correct: 108,
  options: [96, 108, 112, 99],
};

function DemoQuiz() {
  const [picked, setPicked] = useState(null);

  const handlePick = (opt) => {
    if (picked !== null) return;
    setPicked(opt);
  };

  const reset = () => setPicked(null);

  const isAnswered = picked !== null;
  const isRight    = picked === DEMO_QUESTION.correct;

  return (
    <motion.div
      className="panel"
      style={{ maxWidth: 520, margin: "0 auto", padding: "1.5rem" }}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <p className="kicker" style={{ marginBottom: "0.5rem" }}>Live preview — try it now</p>
      <p style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.5rem 0 1.25rem", fontFamily: "var(--mono)" }}>
        {DEMO_QUESTION.problem}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
        {DEMO_QUESTION.options.map((opt) => {
          const isSelected = picked === opt;
          const isCorrect  = opt === DEMO_QUESTION.correct;

          let bg = "#fff";
          let border = "var(--soft-border)";
          let color = "var(--ink)";

          if (isAnswered) {
            if (isCorrect)        { bg = "#ebfff3"; border = "#4ade80"; color = "#166534"; }
            else if (isSelected)  { bg = "#fff3f2"; border = "#f87171"; color = "#b42318"; }
          }

          return (
            <motion.button
              key={opt}
              type="button"
              onClick={() => handlePick(opt)}
              disabled={isAnswered}
              animate={
                isAnswered && isSelected && isCorrect   ? { scale: [1, 1.06, 1] } :
                isAnswered && isSelected && !isCorrect  ? { x: [0, -6, 6, -6, 0] } :
                {}
              }
              transition={{ duration: 0.35 }}
              style={{
                padding: "0.85rem",
                border: `2px solid ${border}`,
                borderRadius: "0.65rem",
                background: bg,
                color,
                fontFamily: "var(--mono)",
                fontSize: "1.1rem",
                fontWeight: 700,
                cursor: isAnswered ? "default" : "pointer",
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              {opt}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {isAnswered && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            style={{ marginTop: "1rem", textAlign: "center" }}
          >
            <p style={{ fontWeight: 700, fontSize: "1.05rem", color: isRight ? "#166534" : "#b42318" }}>
              {isRight ? "✓ Correct! Great work." : `✗ Not quite — the answer is ${DEMO_QUESTION.correct}.`}
            </p>
            <motion.button
              type="button"
              className="button-secondary"
              onClick={reset}
              style={{ marginTop: "0.6rem" }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              Try again
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <p style={{ marginTop: "1rem", fontSize: "0.82rem", color: "#7a8ba8", textAlign: "center" }}>
        No account needed for this preview. Sign up to track your score.
      </p>
    </motion.div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <section
      className="page-card"
      aria-labelledby="landing-heading"
      style={{ position: "relative", overflow: "hidden", padding: "2rem 1.5rem" }}
    >

      {/* ── Floating bg symbols ── */}
      {FLOATING.map((sym) => (
        <motion.span
          key={sym.s}
          aria-hidden="true"
          style={{
            position: "absolute",
            left: sym.x,
            top: sym.y,
            fontSize: sym.size,
            color: "rgba(202, 91, 31, 0.09)",
            fontFamily: "var(--mono)",
            fontWeight: 700,
            userSelect: "none",
            pointerEvents: "none",
            zIndex: 0,
          }}
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 3.5 + sym.d, repeat: Infinity, delay: sym.d, ease: "easeInOut" }}
        >
          {sym.s}
        </motion.span>
      ))}

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ══════════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════════ */}
        <div className="hero-grid" style={{ marginBottom: "3.5rem", alignItems: "center" }}>
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            <motion.p className="kicker" variants={fadeSlideUp}>
              The Math Practice Platform
            </motion.p>

            <motion.h2
              id="landing-heading"
              variants={fadeSlideUp}
              style={{
                margin: "0.4rem 0 0.8rem",
                fontSize: "clamp(1.8rem, 5vw, 3rem)",
                lineHeight: 1.15,
                letterSpacing: "-0.04em",
              }}
            >
              Stop memorising.<br />
              <span style={{ color: "var(--accent)" }}>Start understanding.</span>
            </motion.h2>

            <motion.p
              className="page-subtitle"
              variants={fadeSlideUp}
              style={{ fontSize: "1.05rem", maxWidth: 480 }}
            >
              Adaptive quizzes, an AI tutor that actually explains things, and social study
              rooms — all in one free platform built for serious learners.
            </motion.p>

            <motion.div className="inline-row" variants={fadeSlideUp} style={{ marginTop: "1.4rem" }}>
              <PressableLink to="/auth" className="button-primary button-link">
                Start for free →
              </PressableLink>
              <PressableLink to="/ai-study-assistant" className="button-secondary button-link">
                See the AI Tutor
              </PressableLink>
            </motion.div>

            <motion.p
              variants={fadeSlideUp}
              style={{ fontSize: "0.8rem", color: "#7a8ba8", marginTop: "0.75rem" }}
            >
              Free forever · No credit card · Takes 30 seconds
            </motion.p>
          </motion.div>

          <motion.aside
            className="hero-callout"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
            style={{ fontSize: "0.97rem" }}
          >
            <p style={{ fontWeight: 700, marginBottom: "0.75rem", fontSize: "1.05rem" }}>
              🚀 What you get, instantly
            </p>
            <ul style={{ margin: 0, padding: "0 0 0 1.2rem", lineHeight: 2 }}>
              <li>Unlimited adaptive math quizzes</li>
              <li>AI-powered step-by-step hints</li>
              <li>Real-time leaderboards & badges</li>
              <li>Friends chat + challenge mode</li>
              <li>Progress dashboard & accuracy tracker</li>
              <li>Works on phone, tablet, desktop</li>
            </ul>
          </motion.aside>
        </div>

        {/* ══════════════════════════════════════════════════════
            STATS BAR
        ══════════════════════════════════════════════════════ */}
        <motion.div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "0.85rem",
            marginBottom: "3.5rem",
            padding: "1.4rem",
            background: "var(--ink)",
            borderRadius: "1rem",
          }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              style={{ textAlign: "center" }}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <p style={{ margin: 0, fontSize: "1.7rem", fontWeight: 700, color: "#fff", fontFamily: "var(--mono)" }}>
                {stat.value}
              </p>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", marginTop: "0.2rem" }}>
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* ══════════════════════════════════════════════════════
            DEMO QUIZ
        ══════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: "3.5rem", textAlign: "center" }}>
          <SectionLabel>Interactive preview</SectionLabel>
          <motion.h3
            style={{ fontSize: "clamp(1.3rem, 3vw, 1.9rem)", letterSpacing: "-0.02em", margin: "0.3rem 0 0.5rem" }}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.1 }}
          >
            See how it feels — answer a question right now
          </motion.h3>
          <motion.p
            style={{ color: "#455676", marginBottom: "1.5rem" }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            No sign-in required for this preview.
          </motion.p>
          <DemoQuiz />
        </div>

        {/* ══════════════════════════════════════════════════════
            FEATURES
        ══════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: "3.5rem" }}>
          <SectionLabel>Everything you need</SectionLabel>
          <motion.h3
            style={{ fontSize: "clamp(1.3rem, 3vw, 1.9rem)", letterSpacing: "-0.02em", margin: "0.3rem 0 1.2rem" }}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.1 }}
          >
            Built for learners who actually want to improve
          </motion.h3>

          <motion.div
            className="grid-panels"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
          >
            {FEATURES.map((f) => (
              <motion.article
                key={f.title}
                className="panel"
                variants={fadeSlideUp}
                whileHover={{ y: -5, boxShadow: "0 14px 36px rgba(39,53,86,0.14)" }}
                style={{ transition: "box-shadow 0.2s" }}
              >
                <p style={{ fontSize: "2rem", margin: "0 0 0.5rem" }}>{f.emoji}</p>
                <h4 style={{ margin: "0 0 0.4rem", fontSize: "1rem" }}>{f.title}</h4>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "#4a5976", lineHeight: 1.6 }}>{f.body}</p>
              </motion.article>
            ))}
          </motion.div>
        </div>

        {/* ══════════════════════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: "3.5rem" }}>
          <SectionLabel>How it works</SectionLabel>
          <motion.h3
            style={{ fontSize: "clamp(1.3rem, 3vw, 1.9rem)", letterSpacing: "-0.02em", margin: "0.3rem 0 1.5rem" }}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.1 }}
          >
            Up and running in under a minute
          </motion.h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.2rem" }}>
            {STEPS.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.45 }}
                style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 44,
                    height: 44,
                    borderRadius: "0.75rem",
                    background: "var(--accent)",
                    color: "#fff",
                    fontFamily: "var(--mono)",
                    fontWeight: 700,
                    fontSize: "1rem",
                    lineHeight: "44px",
                    textAlign: "center",
                  }}
                >
                  {step.n}
                </span>
                <h4 style={{ margin: 0, fontSize: "1rem" }}>{step.title}</h4>
                <p style={{ margin: 0, fontSize: "0.88rem", color: "#4a5976", lineHeight: 1.6 }}>{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            TESTIMONIALS
        ══════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: "3.5rem" }}>
          <SectionLabel>What learners say</SectionLabel>
          <motion.h3
            style={{ fontSize: "clamp(1.3rem, 3vw, 1.9rem)", letterSpacing: "-0.02em", margin: "0.3rem 0 1.2rem" }}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.1 }}
          >
            Real results from real students
          </motion.h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
            {TESTIMONIALS.map((t, i) => (
              <motion.blockquote
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.45 }}
                style={{
                  margin: 0,
                  padding: "1.2rem",
                  background: "#fff",
                  border: "1px solid var(--soft-border)",
                  borderRadius: "0.85rem",
                  boxShadow: "0 4px 16px rgba(34,51,84,0.06)",
                }}
              >
                <p style={{ margin: "0 0 1rem", fontSize: "0.95rem", lineHeight: 1.65, color: "#2d3a52" }}>
                  "{t.quote}"
                </p>
                <footer style={{ fontSize: "0.82rem" }}>
                  <strong>{t.name}</strong>
                  <span style={{ color: "#7a8ba8", marginLeft: "0.4rem" }}>— {t.role}</span>
                </footer>
              </motion.blockquote>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            FINAL CTA
        ══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{
            textAlign: "center",
            padding: "2.5rem 1.5rem",
            background: "linear-gradient(135deg, #fff8ea 0%, #fff3f2 100%)",
            border: "1px dashed #dab678",
            borderRadius: "1.1rem",
          }}
        >
          <p style={{ fontSize: "2rem", margin: "0 0 0.4rem" }}>🧠</p>
          <h3
            style={{
              margin: "0 0 0.6rem",
              fontSize: "clamp(1.3rem, 3vw, 2rem)",
              letterSpacing: "-0.03em",
            }}
          >
            Your best maths score is still ahead of you.
          </h3>
          <p style={{ color: "#455676", maxWidth: 460, margin: "0 auto 1.5rem", lineHeight: 1.7 }}>
            Join thousands of learners who use MathQuizzizz daily to sharpen their skills,
            ace their exams, and actually enjoy the process.
          </p>
          <div className="inline-row" style={{ justifyContent: "center" }}>
            <PressableLink to="/auth" className="button-primary button-link">
              Create free account →
            </PressableLink>
            <PressableLink to="/ai-study-assistant" className="button-secondary button-link">
              Learn more
            </PressableLink>
          </div>
          <p style={{ marginTop: "0.85rem", fontSize: "0.78rem", color: "#9aa8bf" }}>
            No credit card · Cancel never (it's free) · Join in 30 seconds
          </p>
        </motion.div>

      </div>
    </section>
  );
}
