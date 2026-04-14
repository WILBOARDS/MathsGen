import { useMemo, useState } from "react";

function buildDebugLog(user) {
  const payload = {
    generatedAt: new Date().toISOString(),
    currentPath: window.location.pathname,
    userAgent: navigator.userAgent,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    signedInUser: user?.email || "anonymous",
  };

  return JSON.stringify(payload, null, 2);
}

export default function ContactAdminPage({ user }) {
  const debugLog = useMemo(() => buildDebugLog(user), [user]);
  const [status, setStatus] = useState("");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(debugLog);
      setStatus("Log copied. Paste it in your support message.");
    } catch {
      setStatus("Clipboard failed. Copy manually from the log box below.");
    }
  };

  return (
    <section className="page-card" aria-labelledby="contact-admin-heading">
      <p className="kicker">Support</p>
      <h2 id="contact-admin-heading" className="page-title">
        Contact Admin
      </h2>
      <p className="page-subtitle">
        Use this page when reporting profile or loading issues. Include copied logs for
        faster debugging.
      </p>

      <div className="grid-panels">
        <article className="panel">
          <h3>How to report</h3>
          <ol>
            <li>Describe what you clicked and what went wrong.</li>
            <li>Press Copy Debug Log.</li>
            <li>Email or message admin with your report and copied log.</li>
          </ol>

          <button type="button" className="button-primary" onClick={handleCopy}>
            Copy Debug Log
          </button>
          {status ? <p className="helper-text">{status}</p> : null}
        </article>

        <article className="panel">
          <h3>Debug Log</h3>
          <textarea
            readOnly
            className="mono"
            value={debugLog}
            style={{ minHeight: "230px" }}
          />
        </article>
      </div>
    </section>
  );
}
