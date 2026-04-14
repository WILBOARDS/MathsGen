import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Link } from "react-router-dom";
import { auth, isFirebaseConfigured } from "../firebaseClient.js";
import { mapAuthError } from "../utils/mapAuthError.js";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", text: "" });

    if (!isFirebaseConfigured) {
      setStatus({
        type: "error",
        text: "Firebase is not configured yet. Update .env values and reload.",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setStatus({
        type: "error",
        text: "Please enter your email address.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      setStatus({
        type: "success",
        text: "If an account exists for this email, a password reset link will be sent.",
      });
    } catch (error) {
      const message = mapAuthError(
        error.code,
        "Could not send reset link right now. Please try again.",
      );
      setStatus({ type: "error", text: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page-card compact" aria-labelledby="reset-heading">
      <h2 id="reset-heading" className="page-title">
        Reset Your Password
      </h2>
      <p className="page-subtitle">
        Enter your account email and we will send you a secure reset link.
      </p>

      {status.text ? (
        <p className={`status-block ${status.type === "success" ? "success" : "error"}`}>
          {status.text}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          Account Email
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <button type="submit" disabled={isSubmitting} className="button-primary">
          {isSubmitting ? "Sending Reset Link..." : "Send Reset Link"}
        </button>

        <Link to="/auth" className="button-secondary" style={{ textAlign: "center" }}>
          Back to Sign In
        </Link>
      </form>
    </section>
  );
}
