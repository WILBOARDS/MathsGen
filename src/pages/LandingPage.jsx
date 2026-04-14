import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const floatingSymbols = [
  { symbol: "+", x: "5%", y: "15%", delay: 0 },
  { symbol: "×", x: "88%", y: "10%", delay: 0.3 },
  { symbol: "÷", x: "92%", y: "75%", delay: 0.6 },
  { symbol: "=", x: "3%", y: "80%", delay: 0.9 },
  { symbol: "π", x: "50%", y: "5%", delay: 0.45 },
];

const features = [
  { title: "🎯 Adaptive Quizzes", desc: "Questions adjust to your skill level in real time." },
  { title: "🤖 AI Tutor", desc: "Step-by-step explanations and revision planning powered by AI." },
  { title: "👥 Social Learning", desc: "Challenge friends and study together in shared rooms." },
];

export default function LandingPage() {
  return (
    <section
      className="page-card"
      aria-labelledby="landing-heading"
      style={{ position: "relative", overflow: "hidden" }}
    >
      {floatingSymbols.map((sym) => (
        <motion.span
          key={sym.symbol}
          style={{
            position: "absolute",
            left: sym.x,
            top: sym.y,
            fontSize: "2rem",
            color: "rgba(202, 91, 31, 0.12)",
            fontFamily: "var(--mono)",
            fontWeight: 700,
            userSelect: "none",
            pointerEvents: "none",
          }}
          animate={{ y: [0, -12, 0] }}
          transition={{
            duration: 3 + sym.delay,
            repeat: Infinity,
            delay: sym.delay,
            ease: "easeInOut",
          }}
        >
          {sym.symbol}
        </motion.span>
      ))}

      <div className="hero-grid">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.p className="kicker" variants={itemVariants}>
            Public Landing
          </motion.p>
          <motion.h2 id="landing-heading" className="page-title" variants={itemVariants}>
            Practice Math Like A Game, Not A Chore
          </motion.h2>
          <motion.p className="page-subtitle" variants={itemVariants}>
            Adaptive quiz experiences, social study loops, and AI-guided explanations in one
            learning platform.
          </motion.p>
          <motion.div className="inline-row" variants={itemVariants}>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link to="/auth" className="button-primary button-link">
                Get Started
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link to="/ai-study-assistant" className="button-secondary button-link">
                Explore AI Study Assistant
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.aside
          className="hero-callout"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
        >
          <h3>Launch Notes</h3>
          <ul>
            <li>Route persistence is now enabled.</li>
            <li>AI Study Assistant has a public route.</li>
            <li>Community and Create Quizzizz are live behind auth.</li>
          </ul>
        </motion.aside>
      </div>

      <motion.div
        className="grid-panels"
        style={{ marginTop: "1.5rem" }}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {features.map((feature) => (
          <motion.article
            key={feature.title}
            className="panel"
            variants={itemVariants}
            whileHover={{ y: -4, boxShadow: "0 12px 32px rgba(39,53,86,0.13)" }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <h3>{feature.title}</h3>
            <p>{feature.desc}</p>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}
