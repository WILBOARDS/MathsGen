import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { auth, isFirebaseConfigured } from "../firebaseClient.js";
import { mapAuthError } from "../utils/mapAuthError.js";

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin");
  const [status, setStatus] = useState({ type: "", text: "" });
  const [signup, setSignup] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [signin, setSignin] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const heading = mode === "signin" ? "Welcome Back" : "Create Your Account";

  const handleSignupSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", text: "" });

    if (!isFirebaseConfigured) {
      setStatus({
        type: "error",
        text: "Firebase is not configured yet. Update .env values and reload.",
      });
      return;
    }

    if (signup.password !== signup.confirmPassword) {
      setStatus({ type: "error", text: "Passwords do not match." });
      return;
    }

    setIsSubmitting(true);

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        signup.email.trim(),
        signup.password,
      );
      await updateProfile(credential.user, { displayName: signup.name.trim() });

      await signOut(auth);
      setMode("signin");
      setSignin({ email: signup.email.trim(), password: "" });
      setSignup({ name: "", email: "", password: "", confirmPassword: "" });
      setStatus({
        type: "success",
        text: "Account created successfully. Please sign in with your new account.",
      });
    } catch (error) {
      const message = mapAuthError(
        error.code,
        "Could not create account right now. Please try again.",
      );
      setStatus({ type: "error", text: message });

      if (error.code === "auth/email-already-in-use") {
        setMode("signin");
        setSignin((prev) => ({ ...prev, email: signup.email.trim() }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSigninSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", text: "" });

    if (!isFirebaseConfigured) {
      setStatus({
        type: "error",
        text: "Firebase is not configured yet. Update .env values and reload.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        signin.email.trim(),
        signin.password,
      );
      setStatus({
        type: "success",
        text: `Signed in successfully. Welcome, ${credential.user.displayName || "learner"}.`,
      });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const message = mapAuthError(
        error.code,
        "Sign in failed. Check your email and password.",
      );
      setStatus({ type: "error", text: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.section
      className="page-card compact"
      aria-labelledby="auth-heading"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <h2 id="auth-heading" className="page-title">
        {heading}
      </h2>
      <p className="page-subtitle">
        Use email sign in to access quizzes, profile, and community tools.
      </p>

      <div className="inline-row" style={{ marginBottom: "0.8rem" }}>
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={mode === "signin" ? "button-primary" : "button-secondary"}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={mode === "signup" ? "button-primary" : "button-secondary"}
        >
          Sign Up
        </button>
      </div>

      <AnimatePresence mode="wait">
        {status.text ? (
          <motion.p
            key={`status-${status.type}`}
            className={`status-block ${status.type === "success" ? "success" : "error"}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {status.text}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, x: mode === "signin" ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: mode === "signin" ? 20 : -20 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          {mode === "signin" ? (
            <form onSubmit={handleSigninSubmit} className="form-grid">
              <label>
                Email
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={signin.email}
                  onChange={(event) =>
                    setSignin((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  required
                  placeholder="Your password"
                  value={signin.password}
                  onChange={(event) =>
                    setSignin((prev) => ({ ...prev, password: event.target.value }))
                  }
                />
              </label>

              <button type="submit" disabled={isSubmitting} className="button-primary">
                {isSubmitting ? "Signing In..." : "Sign In"}
              </button>

              <Link
                to="/forgot-password"
                className="button-secondary"
                style={{ textAlign: "center" }}
              >
                Forgot Password?
              </Link>
            </form>
          ) : (
            <form onSubmit={handleSignupSubmit} className="form-grid">
              <label>
                Full Name
                <input
                  type="text"
                  required
                  placeholder="Your full name"
                  value={signup.name}
                  onChange={(event) =>
                    setSignup((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={signup.email}
                  onChange={(event) =>
                    setSignup((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={signup.password}
                  onChange={(event) =>
                    setSignup((prev) => ({ ...prev, password: event.target.value }))
                  }
                />
              </label>
              <label>
                Confirm Password
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Repeat your password"
                  value={signup.confirmPassword}
                  onChange={(event) =>
                    setSignup((prev) => ({ ...prev, confirmPassword: event.target.value }))
                  }
                />
              </label>

              <button type="submit" disabled={isSubmitting} className="button-primary">
                {isSubmitting ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.section>
  );
}
