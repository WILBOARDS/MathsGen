import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { auth } from "./firebaseClient.js";
import AuthPage from "./pages/AuthPage.jsx";
import CommunityPage from "./pages/CommunityPage.jsx";
import ContactAdminPage from "./pages/ContactAdminPage.jsx";
import CreateQuizzizzPage from "./pages/CreateQuizzizzPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import FriendsPage from "./pages/FriendsPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import StudyAssistantPage from "./pages/StudyAssistantPage.jsx";
import QuizPage from "./pages/QuizPage.jsx";
import "./styles.css";

const NAV_ITEMS = [
  { to: "/landing", label: "Landing", requiresAuth: false },
  { to: "/ai-study-assistant", label: "AI Study Assistant", requiresAuth: false },
  { to: "/dashboard", label: "Dashboard", requiresAuth: true },
  { to: "/quiz", label: "Play Quiz", requiresAuth: true },
  { to: "/create-quizzizz", label: "Create Quizzizz", requiresAuth: true },
  { to: "/community", label: "Community", requiresAuth: true },
  { to: "/friends", label: "Friends Chat", requiresAuth: true },
  { to: "/profile", label: "Profile", requiresAuth: true },
  { to: "/contact-admin", label: "Contact Admin", requiresAuth: false },
];

function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/landing" replace />;
  }

  return children;
}

function GuestOnlyRoute({ isAuthenticated, children }) {
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function MiniChatDock({ visible }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [messages, setMessages] = useState(() => {
    try {
      const cached = localStorage.getItem("mqz_chat_dock_messages");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore parsing issues and fall back to defaults.
    }

    return [
      {
        id: "welcome",
        sender: "Coach",
        text: "Team chat is live. Open /friends for full conversation rooms.",
      },
    ];
  });

  useEffect(() => {
    if (!visible) {
      return;
    }

    try {
      const recent = messages.slice(-18);
      localStorage.setItem("mqz_chat_dock_messages", JSON.stringify(recent));
    } catch {
      // Ignore storage quotas in private modes.
    }
  }, [messages, visible]);

  if (!visible) {
    return null;
  }

  const handleSend = () => {
    const text = draftMessage.trim();
    if (!text) {
      return;
    }

    const id = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setMessages((current) => [...current, { id, sender: "You", text }]);
    setDraftMessage("");
  };

  return (
    <aside className={`chat-dock ${isOpen ? "open" : ""}`} aria-live="polite">
      <button
        type="button"
        className="chat-dock-trigger"
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? "Hide Mini Chat" : "Open Mini Chat"}
      </button>
      {isOpen ? (
        <div className="chat-dock-panel">
          <p className="chat-dock-title">Friends Mini Chat</p>
          <div className="chat-dock-messages">
            {messages.slice(-6).map((message) => (
              <p key={message.id}>
                <strong>{message.sender}:</strong> {message.text}
              </p>
            ))}
          </div>
          <div className="chat-dock-composer">
            <input
              type="text"
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              placeholder="Type message"
            />
            <button type="button" className="button-secondary" onClick={handleSend}>
              Send
            </button>
          </div>
          <p className="helper-text">
            Need full conversation view? Open the Friends Chat page from the top nav.
          </p>
        </div>
      ) : null}
    </aside>
  );
}

function RoutedApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setCurrentUser(nextUser);
      setIsAuthReady(true);
    });

    return unsubscribe;
  }, []);

  const isAuthenticated = Boolean(currentUser);

  const visibleNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => (item.requiresAuth ? isAuthenticated : true)),
    [isAuthenticated],
  );

  const handleSignOut = async () => {
    setStatusMessage("");
    try {
      await signOut(auth);
      setStatusMessage("Signed out successfully.");
    } catch {
      setStatusMessage("Could not sign out right now. Please retry.");
    }
  };

  if (!isAuthReady) {
    return (
      <main className="boot-splash">
        <section className="page-card compact">
          <h1>MathQuizzizz</h1>
          <p>Preparing your learning space...</p>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="kicker">MathQuizzizz Platform</p>
          <h1>Learn Fast. Play Smart.</h1>
        </div>
        <nav className="top-nav" aria-label="Main navigation">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="auth-strip">
          {isAuthenticated ? (
            <>
              <p className="helper-text">
                Signed in as {currentUser.displayName || currentUser.email}
              </p>
              <button type="button" className="button-secondary" onClick={handleSignOut}>
                Sign Out
              </button>
            </>
          ) : (
            <NavLink to="/auth" className="button-primary button-link">
              Sign In / Sign Up
            </NavLink>
          )}
        </div>
      </header>

      {statusMessage ? <p className="status-message">{statusMessage}</p> : null}

      <main className="app-main" data-route={location.pathname}>
        <Routes>
          <Route
            path="/"
            element={
              <Navigate to={isAuthenticated ? "/dashboard" : "/landing"} replace />
            }
          />
          <Route path="/landing" element={<LandingPage />} />
          <Route
            path="/ai-study-assistant"
            element={<StudyAssistantPage isAuthenticated={isAuthenticated} />}
          />
          <Route
            path="/contact-admin"
            element={<ContactAdminPage user={currentUser} />}
          />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/auth"
            element={
              <GuestOnlyRoute isAuthenticated={isAuthenticated}>
                <AuthPage />
              </GuestOnlyRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <DashboardPage user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-quizzizz"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <CreateQuizzizzPage user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <CommunityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/friends"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <FriendsPage user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <ProfilePage user={currentUser} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <QuizPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <MiniChatDock visible={isAuthenticated && location.pathname !== "/friends"} />

      <footer className="app-footer">
        <p>
          Built for active math learners. Route-aware and ready for feature expansion.
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RoutedApp />
    </BrowserRouter>
  );
}
