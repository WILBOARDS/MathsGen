# 📖 Question Randomizer — Feature Documentation & Showcase

**Version 3.8.0** · _Built for students who want to master math, and teachers who want to track it._

> Question Randomizer is a full-featured mathematics practice platform that combines **adaptive question generation**, **real-time multiplayer competition**, and **deep analytics** into a single, beautifully-crafted web application. Powered by React, Vite, Firebase, and GSAP, it transforms the monotony of math drills into an engaging, social, and data-driven learning experience.

---

## Table of Contents

1. [🎨 Immersive UI & User Experience](#-1-immersive-ui--user-experience)
2. [🎮 Versatile Game Modes](#-2-versatile-game-modes)
3. [📊 Advanced Analytics & Data Visualization](#-3-advanced-analytics--data-visualization)
4. [🧠 Smart Learning Tools](#-4-smart-learning-tools)
5. [👥 Social Ecosystem](#-5-social-ecosystem-phase-3c)
6. [🛠️ Host Management & Administration](#️-6-host-management--administration)
7. [⚙️ Technical Architecture](#️-technical-architecture)

---

## 🎨 1. Immersive UI & User Experience

The visual identity of Question Randomizer is designed to feel **premium and modern** — not like a typical educational tool. Every interaction has been carefully crafted to reduce cognitive friction and maximize focus.

### Glassmorphic Design Language

The entire interface is built on a **Glassmorphic Design System** — a visual language defined by frosted‑glass panels, translucent layers, and luminous gradient borders.

- **Frosted Glass Cards** — Every major container (question cards, stats panels, modals) uses `backdrop-filter: blur(16px)` combined with semi‑transparent backgrounds (`rgba(255, 255, 255, 0.12)`) to create the illusion of frosted glass floating above the content beneath it. This gives the UI a layered, three‑dimensional quality that feels premium without being distracting.
- **Gradient Borders** — Interactive elements like buttons and input fields are outlined with subtle gradient borders (`linear-gradient(135deg, rgba(108, 99, 255, 0.3), rgba(255, 101, 132, 0.1))`) that glow softly on hover, providing a visual cue that differentiates clickable elements from static content.
- **Depth Through Shadows** — Cards and modals cast multi‑layered box shadows (`0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(108, 99, 255, 0.06)`) that shift subtly on hover, reinforcing the sensation of physical depth and interactivity.
- **CSS Custom Properties** — All design tokens (colors, spacing, radii, blur values) are defined as CSS variables under `:root`, making global theming seamless and ensuring every component stays in sync when the theme changes.

**Why it matters for users:** The glassmorphic aesthetic creates a distraction‑free environment that encourages sustained focus. Students report that the premium feel makes the app "feel less like homework and more like a game."

### Motion Design (GSAP 3.12 + CSS Animations)

Static interfaces feel lifeless. Question Randomizer uses **GSAP 3.12** (loaded via CDN) and custom CSS keyframe animations to inject personality and responsiveness into every interaction.

| Interaction              | Animation                                              | Technical Detail                                                                                                   |
| ------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **New Question Appears** | Card slides up from below with a spring‑ease overshoot | `gsap.fromTo('.question-card', {opacity: 0, y: 20}, {opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.5)'})`     |
| **Wrong Answer**         | Input field shakes horizontally                        | CSS `@keyframes shake` — 6‑frame oscillation at ±10px over 500ms, applied via the `.shake` class                   |
| **Correct Answer**       | Score counter animates with a count‑up effect          | GSAP `to()` tween on the score element's `textContent` using `snap: { textContent: 1 }` for crisp integer counting |
| **Sidebar Entry**        | Navigation items cascade in with staggered delays      | `gsap.from('.sidebar-btn', {x: -30, opacity: 0, stagger: 0.05, duration: 0.3})`                                    |
| **Progress Bar Fill**    | Smooth, eased width transition on every answer         | CSS `transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1)` on `.progress-fill`                                      |
| **Modal Open**           | Content scales up from center with fade                | CSS `@keyframes slideUp` — 400ms ease-out from `translateY(30px) scale(0.95)` to `translateY(0) scale(1)`          |
| **Floating Background**  | Ambient gradient orbs drift slowly                     | CSS `@keyframes float` — 6s infinite alternate with subtle Y‑axis translation                                      |

**Why it matters for users:** Motion makes feedback instantaneous. A shake on a wrong answer communicates failure faster than text. A count‑up score creates a dopamine hit that reinforces correct behavior. The result: users stay longer, practice more.

### Theme System

Question Randomizer ships with **three hand‑crafted themes** plus an intelligent auto‑scheduler.

| Theme        | Background                    | Accent                      | Best For                                                 |
| ------------ | ----------------------------- | --------------------------- | -------------------------------------------------------- |
| ☀️ **Light** | `#f0f0ff` soft lavender-white | `#6c63ff` vibrant indigo    | Daytime studying in well‑lit environments                |
| 🌙 **Dark**  | `#020617` near-black slate    | `#818cf8` bright periwinkle | Night sessions; reduces eye strain and blue light        |
| 🧘 **Calm**  | `#f9f8f6` warm off-white      | `#8b7355` earthy brown      | Anxious test-prep; the muted palette reduces stimulation |

- **Manual Toggle** — A single button in the sidebar cycles through Light → Dark → Calm → Light. The active theme is persisted in `localStorage` and restored on every page load.
- **Auto‑Night Mode Scheduler** (`NightModeScheduler` class) — When enabled, the system checks the local time **every 60 seconds** against a user-configurable night window (default: 8:00 PM – 7:00 AM). If the current time falls within the window, the theme automatically switches to Dark Mode. When the window ends, it reverts to Light. This happens transparently with no user action required. The start and end times are fully configurable in the Settings panel, and the schedule persists across sessions via `localStorage`.

**Why it matters for users:** Teachers conducting evening review sessions never need to manually switch themes — the app adapts automatically. Students with sensitivity to bright screens get protection without any setup.

### Feedback Loops

Every action in the app produces **immediately visible, emotionally resonant feedback**:

- **🎊 Confetti System** (`ConfettiManager` class) — When a user reaches their daily question goal, a burst of **80–150 confetti particles** erupts from the top of the screen. Each particle is a randomly colored rectangle (drawn on a dedicated `<canvas>` overlay at `z-index: 9999`) with individual velocity, rotation spin, and gravity simulation. The particles fade out as they pass 70% of the viewport height, ensuring the celebration is dramatic but brief (~2 seconds). The confetti also fires on timed-mode completion, streak milestones, and exam grade reveals.
- **✨ Shimmer Effects** — Primary action buttons (like "Check Answer" and "Start Exam") feature a CSS shimmer animation — a diagonal highlight that sweeps across the button surface every 3 seconds, drawing the user's eye to the most important next action without being intrusive.
- **🔔 Toast Notifications** — Non-blocking, auto-dismissing toasts appear at the top-right of the viewport for events like "Settings saved!", "Daily goal reached!", and "Streak milestone!". Each toast slides in with a 400ms animation, stays visible for 3–5 seconds, then fades out. Toasts are color-coded: green for success, amber for warnings, red for errors.
- **🔊 Sound Effects** (`SoundManager`) — The Web Audio API powers a lightweight, zero-dependency sound engine. Correct answers trigger a bright 880Hz tone (150ms), wrong answers a lower 220Hz tone (200ms), and streak milestones get a unique ascending arpeggio. All sounds are synthesized in real-time — no audio files to load. Sound can be toggled globally from the sidebar.

---

## 🎮 2. Versatile Game Modes

Question Randomizer isn't a single experience — it's **five distinct game modes** that address different learning needs, from casual review to high-pressure testing.

### 📝 Practice Mode (Core Experience)

The default mode and the heart of the application. Users are presented with **infinitely randomized math questions** drawn from a procedural generation engine that covers **26+ mathematical topics** across three difficulty tiers.

- **Difficulty Selector** — A dropdown in the header lets users choose **Easy**, **Medium**, or **Hard**. Each difficulty maps to a curated pool of question types (e.g., Easy covers addition through basic fractions; Hard reaches quadratics, Pythagorean theorem, and sequences).
- **Procedural Question Generation** — Questions are generated purely in code — no question bank to exhaust. The `questionGenerator.js` module uses randomized parameters within difficulty-specific ranges to produce unique questions every time. For example, a Medium algebra question picks random coefficients `a ∈ [2,10]`, a random target `x ∈ [1,15]`, and constructs `ax + b = c` dynamically.
- **Topic Filtering** — Users can narrow questions to a single topic (e.g., "Only Geometry") using the Topic dropdown. The generator retries up to 10 times to produce a matching question, ensuring focused practice without eliminating randomness entirely.
- **Mixed Input Types** — Questions randomly alternate between free‑text input (where the user types a numeric answer) and **multiple-choice** (4 options with one correct answer and 3 procedurally generated distractors). This variety prevents muscle-memory shortcuts.
- **Instant Feedback** — On submission, users receive immediate visual and audio feedback. Correct answers show a green banner with the answer confirmed. Incorrect answers show a red banner with the correct answer revealed. The progress bar, score, and streak update in real-time.
- **Session Persistence** — Score, streak, question count, and accuracy are saved to `localStorage` on every answer, so closing the browser doesn't lose progress.

**Why it matters for users:** Practice mode removes all barriers to starting. There's no setup, no time pressure, and no end point. Users can practice for 30 seconds or 3 hours with equal effectiveness.

### ⚡ Flashcard Mode

A **rapid-fire drill mode** optimized for speed and memorization, inspired by physical flashcard decks but enhanced with digital interactivity.

- **3D Card-Flip Animation** — Each flashcard is rendered as a double-sided card using CSS 3D transforms (`perspective: 1000px`, `rotateY(180deg)`). The front shows the question; clicking the card triggers a smooth flip to reveal the answer on the back. Users self-assess by clicking ✅ (Correct) or ❌ (Incorrect), then advance.
- **Configurable Sessions** — Before starting, users choose the number of cards (5, 10, 15, or 20) and difficulty level (Easy, Medium, Hard, or Mixed).
- **Real-Time Stats** — During the session, a live score counter and accuracy percentage update after each card.
- **Session Summary** — After completing all cards, a detailed summary shows: final score (e.g., 8/10), accuracy percentage, average time per card, total session duration, and difficulty level.
- **Session History** — Up to 50 past sessions are stored in `localStorage`, enabling users to track improvement over time.

**Why it matters for users:** Flashcard mode removes the typing barrier entirely. It's pure recall practice — ideal for quick 2-minute review sessions before class or during break.

### 📋 Exam Mode

A **structured testing environment** that replicates real exam conditions with timers, navigation, and graded results.

- **Pre-Exam Configuration** — Users configure their exam before starting:
  - **Question Count:** 10, 20, 30, or 50 questions
  - **Time Limit:** None, 15, 30, or 60 minutes
  - **Difficulty:** Easy, Medium, Hard, or Mixed
  - **Hints Toggle:** Choose whether hints and step-by-step solutions are available during the exam
- **Exam Rules** — The setup modal clearly displays the rules: questions can be skipped and revisited, final grades are calculated at the end, and results are permanently saved to exam history.
- **Question Navigation** — During the exam, a navigation bar shows colored dots (one per question): gray for unanswered, green for correct, red for incorrect. Clicking a dot jumps directly to that question. Previous (◀) and Next (▶) buttons allow linear navigation. For exams with 15+ questions, the dots collapse into a text summary (e.g., "12/20 answered").
- **Countdown Timer** — If a time limit is set, a persistent timer displays at the top of the exam. The timer turns amber when ≤5 minutes remain and red when ≤1 minute remains. When time expires, the exam automatically ends and unanswered questions are marked incorrect.
- **Grading System** — Results are graded on a standard scale:

  | Percentage | Grade | Label          |
  | ---------- | ----- | -------------- |
  | ≥ 90%      | **A** | Excellent!     |
  | ≥ 80%      | **B** | Great Job!     |
  | ≥ 70%      | **C** | Good           |
  | ≥ 60%      | **D** | Passing        |
  | < 60%      | **F** | Needs Practice |

- **Answer Review** — After the exam, users can review every question with their answer, the correct answer, and whether they got it right. This review modal has scrolling support for long exams.
- **Share Results** — A "Share Results" button generates a formatted text summary (grade, score, time, difficulty) and copies it to the clipboard or triggers the native share sheet on mobile.
- **Exam History** — Past exams are stored with date, score, grade, and difficulty, accessible from the exam setup screen.

**Why it matters for users:** Exam mode provides the closest thing to a real test without the stakes. Teachers can assign a "20-question Hard exam, 30-minute limit, no hints" and students can take it independently with auto-graded results.

### 🔄 Review Mistakes

A dedicated **remediation tool** that specifically targets previously incorrect answers to close learning gaps.

- **Automatic Mistake Logging** (`MistakeReview` module) — Every time a user answers a question incorrectly in any mode (Practice, Exam, Flashcard), the question text, correct answer, user's wrong answer, topic, difficulty, and timestamp are saved to a persistent mistake log in `localStorage`. Duplicates are handled with a deduplication check.
- **Priority Queue** — When the user enters Review mode, their mistakes are sorted by **frequency of error** (most-missed topics first) and **recency** (recent mistakes surface before older ones). This ensures the most problematic areas get the most attention.
- **Correction Tracking** — When a user correctly answers a previously-missed question during review, it's marked as "corrected" with a timestamp. The system tracks an **improvement score** — the ratio of corrected mistakes to total mistakes — giving users a tangible metric for their remediation progress.
- **Weak Topic Analysis** — The module exposes `getMostWeakTopics(limit)`, which identifies the top 3 (or N) weakest mathematical topics based on error frequency. This data feeds into the weekly "Weak-Spot Quiz" prompt that appears every Friday.
- **Statistics Dashboard** — Review mode surfaces stats like: total mistakes logged, corrections made, uncorrected count, improvement percentage, and a topic-by-topic breakdown.

**Why it matters for users:** Most math apps generate infinite new questions but never revisit where you failed. Review Mistakes ensures that learning gaps are identified, surfaced, and systematically closed.

### 🎉 Party Mode (Multiplayer)

A **real-time multiplayer experience** powered by Firebase Realtime Database, allowing a Host to run a live quiz for a room of Guests.

- **Room Creation** — The Host clicks "Host Party" and receives a unique **6-character alphanumeric room code** (generated via `Math.random().toString(36)`). This code is the key to the Firebase Realtime Database path (`/lobbies/{code}`).
- **Guest Joining** — Players enter the room code and a display name. Their entry is written to the Firebase database under `/lobbies/{code}/players/{playerId}`, and all connected clients receive the update in real-time via `onValue()` listeners.
- **Live Question Broadcast** — The Host selects or creates questions and pushes them to `/lobbies/{code}/currentQuestion`. All connected Guests instantly see the new question appear on their screens.
- **Real-Time Answer Submission** — Guests submit answers which are written to `/lobbies/{code}/players/{playerId}/answer`. The Host sees all submitted answers in real-time.
- **Auto-Scoring** — When the Host reveals the answer (`revealAnswer()`), the system automatically compares each Guest's submitted answer against the correct answer and awards points. This is not manual grading — it happens instantly in code, with the updated scores pushed back to Firebase for all clients to see.
- **Disconnect Handling** — Firebase `onDisconnect()` hooks automatically remove a player's entry from the lobby if they close their browser, keeping the room state clean.
- **End Quiz & Results** — The Host can end the session, which sets the lobby status to `'ended'` and triggers all clients to display the final scoreboard.

**Why it matters for users:** Party Mode turns solo math practice into a social event. Teachers can project the host view while students compete on their phones. Friends can challenge each other remotely. The real-time sync means there's zero lag between the Host's actions and what Guests see.

---

## 📊 3. Advanced Analytics & Data Visualization

Question Randomizer doesn't just ask questions — it **learns from every answer** and presents that data through a comprehensive analytics dashboard.

### The Analytics Dashboard

Accessible via the sidebar, the analytics page (`analytics.js`, 1,242 lines) renders a full suite of interactive charts and data panels:

- **Accuracy Over Time** — A line chart (powered by Chart.js) plots daily accuracy percentage over the last 7, 14, or 30 days. Each data point represents `(correctAnswers / totalAnswers) × 100` for that day. The chart includes a gradient fill beneath the line and tooltips showing exact values on hover. Users can toggle between time ranges using filter buttons.
- **Questions Completed** — A bar chart showing the number of questions answered per day, with separate bars for correct (green) and incorrect (red) answers. This makes volume trends immediately visible.
- **Difficulty Distribution** — A doughnut chart showing the proportion of Easy, Medium, and Hard questions answered, helping users understand whether they're challenging themselves sufficiently.
- **Streak History** — A bar chart tracking maximum streak length per day, with gradient colors that intensify for higher streaks (warm orange for long streaks, cool blue for short ones).

### Topic Mastery Heatmap

The dashboard breaks down performance across **26 specific math topics** (e.g., Addition, Subtraction, Multiplication, Division, Fractions, Decimals, Algebra, Geometry, Statistics, Exponents, Ratios, Percentages, Sequences, Roots, Calculus, and more).

- Each topic displays a **mastery percentage bar** that fills based on `(correct / total) × 100` for that topic.
- Topics are sorted by **total attempt count** (most-practiced topics first), with mastery bars color-coded: green (≥80%), amber (50–79%), red (<50%).
- Topic names are formatted from kebab-case to title case (e.g., `basic-algebra` → "Basic Algebra") for readability.

### Time-Based Intelligence

A unique analytics feature that tells users **when they perform best**, based on historical answer data:

- **Time of Day Analysis** — Every answered question is tagged with an hour-of-day timestamp. The analytics dashboard aggregates this into four time slots:
  - 🌅 **Morning** (6 AM – 12 PM)
  - ☀️ **Afternoon** (12 PM – 5 PM)
  - 🌆 **Evening** (5 PM – 9 PM)
  - 🌙 **Night** (9 PM – 6 AM)

  Each slot shows its accuracy percentage and total questions answered. The slot with the highest accuracy is highlighted as the user's **"Peak Performance Time"**, with a personalized insight message like: _"You perform best in the Morning (92% accuracy). Try scheduling practice sessions before noon!"_

- **Day of Week Analysis** — Similar to time-of-day, accuracy is broken down by weekday (Monday through Sunday), identifying the user's best and worst days for math practice.

### Activity Tracking

- **Session Progress Bar** (`SessionProgress` class) — A visual progress bar embedded above the question card that shows how many questions remain in the current session goal. The default goal is 10 questions, but it's user-configurable in Settings. When the goal is reached, the label changes to "🎉 Session goal reached!" and confetti fires.
- **Daily Goal** (`DailyGoalManager` class) — A separate daily target (default: 20 questions) that resets automatically at midnight. Progress is tracked in `localStorage` with the current date as the key. When the daily goal is hit, a toast notification fires, confetti erupts, and the progress bar changes to a "completed" state. The daily goal widget is embedded directly in the sidebar for persistent visibility.

**Why it matters for users:** Analytics transform practice from "I did some math" into "I know exactly where I'm strong, where I'm weak, when I'm most productive, and how I'm improving over time." Teachers can review a student's dashboard to understand their learning patterns without manual record-keeping.

---

## 🧠 4. Smart Learning Tools

Beyond question generation, Question Randomizer includes a suite of **intelligent assistance features** that help users work through problems, not just guess at answers.

### 🤖 AI Study Assistant (Vertex AI + Gemini)

A **document-to-learning** engine built on Google Cloud's Vertex AI and the Gemini Flash model, designed to transform static study materials into interactive practice.

- **PDF/Image Uploads** — Users upload practice papers or worksheets directly to Firebase Storage. This triggers a secure serverless backend process.
- **Method Extraction (Flashcards)** — The AI analyzes the document's mathematical structures and extracts the core formulas and solving methods. It transforms these into digital **Method Flashcards** that highlight the "Trigger" (when to use a formula) rather than just the equation itself.
- **Parallel Question Generation** — Instead of simply extracting the existing questions, the AI generates "Parallel" questions. These maintain the exact same mathematical complexity and structure as the source material but feature completely new narratives and shifted variables, preventing rote memorization.
- **Interactive Evaluation** — Parallel questions are presented as multiple-choice quizzes where the distractors are intelligently generated common mistakes (e.g., forgetting a negative sign).
- **Cost-Optimized Caching** — The backend computes an MD5 hash of every uploaded file. If the same file is uploaded again, the system instantly retrieves the previously generated study suite from the Realtime Database, completely bypassing the AI model to save costs and reduce latency.

**Why it matters for users:** It bridges the gap between static homework and interactive practice. A teacher can upload a single worksheet, and the AI automatically constructs an entire suite of flashcards and parallel questions for students to practice with.

### Topic Filtering

Users can isolate specific mathematical subjects for targeted practice:

- The **Topic Dropdown** in the header dynamically updates its options based on the selected difficulty level. Easy mode shows: Addition, Subtraction, Multiplication, Division, Fractions, Decimals. Medium mode adds: Algebra, Geometry, Statistics, Exponents, Ratios, Percentages. Hard mode adds: Sequences, Roots, Calculus.
- Selecting a topic (e.g., "Only Geometry") constrains the question generator to only produce questions tagged with that topic. The generator retries up to 10 times to find a matching question before falling back.
- Topic selection persists in `localStorage`, so returning users resume with their last-selected filter.

**Why it matters for users:** Students preparing for a specific exam section (e.g., "I need to practice quadratic equations") can drill exactly what they need without wading through unrelated topics.

### Integrated Sketchpad

A **built-in drawing canvas overlay** (`<canvas>` element managed via the Canvas API) that allows users to work out math problems **directly on the screen** — no paper, no external apps.

- **Drawing Tools** — Pen mode draws freehand strokes at the cursor/touch position. The sketchpad tracks `mousedown`, `mousemove`, `mouseup`, and equivalent touch events.
- **Clear Button** — One-click wipe of the canvas, implemented via `ctx.clearRect(0, 0, canvas.width, canvas.height)`.
- **Size Correction** — The canvas internal resolution matches its CSS display size (`canvas.width = canvas.offsetWidth`, `canvas.height = canvas.offsetHeight`) to prevent blurry or zoomed rendering — a common pitfall in canvas-based drawing tools.
- **Overlay Behavior** — The sketchpad opens as a translucent overlay above the quiz interface, so users can see the question underneath while drawing. It can be toggled open/closed from the sidebar or via a keyboard shortcut.

**Why it matters for users:** The sketchpad eliminates the need for scrap paper. Students can sketch diagrams, write out long division, or work through algebraic steps without context-switching away from the app. For tablet users, this is especially powerful with a stylus.

### Answer Preview (`AnswerPreviewer` class)

A **live feedback widget** that appears beneath the answer input as the user types:

- As the user types, the system compares the current input against the correct answer in real-time using normalized string comparison (lowercase, trimmed, whitespace-collapsed).
- If the input matches the correct answer, a green checkmark and "Looks correct!" message appear instantly — before the user even clicks "Check Answer."
- If solution steps are available, a collapsible `<details>` element below the preview lets the user peek at the step-by-step process.
- The previewer can be toggled on/off in Settings and its state persists in `localStorage`.

**Why it matters for users:** The preview provides a subtle confidence boost. Students who are unsure about their answer get a gentle nudge of confirmation before committing, reducing test anxiety and encouraging more attempts.

### Hint System

A **multi-stage guidance system** that offers progressively more detailed help:

- **Stage 1 — General Hint:** A high-level pointer toward the correct approach (e.g., "Think about the relationship between the coefficients").
- **Stage 2 — Step Reveal:** The first step of the solution is revealed, with subsequent steps available on demand. Each click exposes one additional step.
- **Stage 3 — Full Solution:** The complete worked solution is displayed, including intermediate calculations and the final answer.
- The hint system is aware of the current question's topic and difficulty, tailoring hints accordingly.
- In Exam Mode, hints can be globally disabled in the setup, ensuring exam integrity.

**Why it matters for users:** Instead of being stuck and giving up, students get scaffolded help. Each hint level encourages them to think one step further before getting the next reveal, promoting genuine understanding over answer copying.

### Keyboard Shortcuts

For power users, a comprehensive set of keyboard shortcuts accelerates every interaction:

| Shortcut        | Action                                                          |
| --------------- | --------------------------------------------------------------- |
| `Enter`         | Submit answer (or advance to next question if already answered) |
| `Space`         | Next question (when answered)                                   |
| `N` / `→`       | Next question (when answered)                                   |
| `H`             | Show hint                                                       |
| `S`             | Reveal next step                                                |
| `1` `2` `3` `4` | Select multiple-choice option A/B/C/D                           |
| `Escape`        | Close sidebar / close modals                                    |

- All shortcuts are **input-aware**: they are ignored when the cursor is in a text input or textarea, preventing conflicts.
- A "Keyboard Shortcuts" reference modal is accessible from the Settings area.

### Bookmarks (`BookmarkManager` class)

Users can **bookmark questions** for later review:

- A bookmark button appears in the hint control area. Clicking it saves the current question's text, answer, topic, and timestamp to `localStorage`.
- A "Bookmarked Questions" modal (accessible from the sidebar) lists all saved questions with topic badges, dates, and individual remove buttons.
- Bookmarks are capped at 100 entries (oldest removed first) to prevent unbounded storage growth.
- A "Clear All" button wipes the entire bookmark list.

### Question Timer (`QuestionTimer` class)

An optional **per-question countdown timer** that adds urgency to practice:

- Configurable duration: 15s, 20s, 30s, 45s, 60s, 90s, or 120s.
- A visual progress bar shrinks as time elapses, changing color from green (safe) to amber (warning at <50%) to red (danger at <25%).
- When the timer hits zero, a callback fires (typically auto-submitting the answer or skipping the question).
- The timer can be globally enabled/disabled and its duration preference persists in `localStorage`.

---

## 👥 5. Social Ecosystem (Phase 3c)

Question Randomizer evolves from a solo tool into a **social learning platform** with competitive challenges, collaborative study spaces, and community-driven content.

### ⚔️ Challenge System (`FriendChallenge` class)

A **1-vs-1 competitive mode** where users challenge friends to answer specific questions.

- **Sending Challenges** — A user selects a friend (by UID) and a specific question, then sends the challenge. The challenge object includes: the question, both players' UIDs, timestamps, and a **72-hour expiry window** (configurable via `CHALLENGE_TIMEOUT = 72 * 60 * 60 * 1000`). If not accepted within 72 hours, the challenge automatically expires.
- **Accepting/Declining** — The challenged player sees a notification with the challenge details and can Accept (which starts their timer) or Decline (which closes the challenge with a status of `'declined'`).
- **Answer Submission** — Both players answer the same question. The system records: whether each player's answer is correct, and the time taken to answer (in milliseconds).
- **Winner Determination** — The winner is calculated by a priority system:
  1. If both are correct → the **faster** player wins.
  2. If only one is correct → that player wins.
  3. If both are wrong → it's a tie.
- **Head-to-Head Stats** — The system maintains running statistics between any two players: total challenges, wins for each side, current win streak, and average answer speed. This is accessible via `getHeadToHeadStats(friendUid)`.
- **Challenge History** — All completed challenges are stored with full results for retrospective review.

**Why it matters for users:** Competition is one of the most powerful motivators. The challenge system turns math practice into a social game where bragging rights are on the line. The 72-hour window keeps it casual enough for students with busy schedules.

### 📚 Study Groups (`StudyGroupManager` class)

Collaborative spaces where users form learning communities with structured access control.

- **Group Creation** — Any user can create a study group with a name, description, privacy setting (public/private), and member cap. Each group receives a unique `groupId`.
- **Role-Based Access Control (RBAC)** — Every group has three roles:
  - **Owner** (1 per group) — Full control: delete group, manage all members, transfer ownership, post announcements.
  - **Admin** (unlimited) — Can invite/remove members, update member roles, post announcements.
  - **Member** (unlimited) — Can view group content, participate in group leaderboard, view announcements.
- **Group Leaderboard** — Each group has its own internal leaderboard that ranks members by XP and level. The `updateGroupLeaderboard()` method writes score updates, and `getLeaderboard()` returns the sorted rankings.
- **Announcements** — Owners and Admins can post announcements to the group. Each announcement has a timestamp, author, and content, and is visible to all group members.
- **Member Management** — Admins and Owners can invite members, remove members, and promote/demote roles. Owners cannot be removed by anyone except themselves (via ownership transfer).
- **Privacy** — Private groups don't appear in the public directory and can only be joined via invite. Public groups are discoverable and joinable by anyone.

**Why it matters for users:** Study groups create accountability. Classmates can form a group, see each other's leaderboard positions, and receive announcements from the teacher (who acts as the Owner). The RBAC system prevents griefing while keeping moderation lightweight.

### 🧑‍🏫 User-Generated Content (`QuestionCreator` class)

A **community-driven question engine** where users can submit their own questions to the platform.

- **Question Submission** — Users fill out a structured form with: question text, correct answer, difficulty level, topic, optional hints, and optional step-by-step solution. Validation ensures: minimum text length, non-empty answer, valid difficulty, and valid topic.
- **Moderation Workflow** — Every submitted question enters a pipeline:
  1. **Pending** → Submitted but not yet reviewed.
  2. **Approved** → A moderator has verified the question's accuracy and quality. It becomes available in the public question pool.
  3. **Rejected** → A moderator has deemed it inappropriate, incorrect, or low-quality. The creator receives the rejection reason.
  4. **Flagged** → If a published question accumulates ≥3 community reports, it is automatically hidden from the pool and escalated for moderator review.
- **5-Star Rating System** — Any user can rate a published question from 1 to 5 stars. The system tracks individual ratings and calculates a running average. Highly-rated questions surface more frequently; low-rated ones are deprioritized.
- **Reporting** — Users can report questions with a reason (e.g., "Incorrect answer", "Inappropriate content", "Duplicate"). Reports include the reporter's UID, reason, optional details, and timestamp. Questions with ≥3 reports are auto-flagged.
- **Creator Statistics** — Question creators can view their stats: total questions submitted, approval rate, average rating, total usage count, and reports received.
- **Usage Tracking** — Every time a user-generated question is served to another user, a usage counter increments, giving creators visibility into how widely their content is being used.
- **Search** — Questions can be searched by keyword and filtered by topic.

**Why it matters for users:** User-generated content transforms the question pool from a static, developer-maintained set into a living, community-curated library. Teachers can submit questions aligned with their specific curriculum, and the moderation workflow ensures quality control without requiring admin intervention for every submission.

---

## 🛠️ 6. Host Management & Administration

For **Party Mode multiplayer sessions**, the Host has a dedicated management interface with full control over the quiz experience.

### Host Dashboard (`PartyManager` class)

The Host's view is the nerve center of a live multiplayer session:

- **Room Code Display** — The 6-character room code is prominently displayed, ready to be shared verbally, projected, or copied.
- **Player Roster** — A real-time list of all connected players with their display names and current scores, updated live via Firebase `onValue()` listeners.
- **Question Management** — The Host can:
  - Type custom questions directly into a text field with **formatting shortcuts** (e.g., `^` for superscript, `_` for subscript).
  - Select from the procedurally-generated question pool by difficulty.
  - Upload **custom images** (graphs, diagrams, geometric figures) to accompany questions, handled via standard file input and displayed inline.
  - Set the correct answer before revealing it to the room.
- **Question Categorization** — Hosts can tag questions with categories (topic, difficulty, subtopic) for organizational clarity, especially during longer sessions.

### Auto-Scoring

Question Randomizer removes the bottleneck of manual grading:

- When the Host clicks **"Reveal Answer"**, the `revealAnswer()` method fires. It iterates over every player's submitted answer in the Firebase database, compares it against the stored correct answer using normalized string matching, and **automatically awards points** to correct respondents.
- The scoring update is written back to Firebase, so all clients instantly see their updated scores without any Host action beyond clicking one button.
- For edge cases, the Host can also **manually adjust scores** via `updatePlayerScore(playerId, points)`, adding or subtracting points for partial credit or bonus awards.

**Why it matters for users:** In a classroom of 30 students, manual grading of each answer would make live quizzes impractical. Auto-scoring makes it effortless — the Host clicks one button and every student's score updates simultaneously.

### Post-Game Summary

When the Host ends the quiz, a detailed **results report** is generated:

- **Podium Medals** — The top 3 players are displayed with 🥇, 🥈, and 🥉 medals alongside their names and final scores.
- **Full Scoreboard** — All players are listed in descending score order with their rank, name, and total points.
- **Chronological Question Log** — Every question asked during the session is listed in order with: the question text, correct answer, and a summary of how many players answered correctly.
- **Session Metadata** — Total questions asked, session duration, average accuracy, and difficulty distribution.

**Why it matters for users:** The post-game summary turns a 15-minute quiz into a reviewable artifact. Teachers can save or screenshot the results for grade books. Students can see exactly which questions they missed.

---

## ⚙️ Technical Architecture

### Tech Stack

| Layer                     | Technology                 | Purpose                                                      |
| ------------------------- | -------------------------- | ------------------------------------------------------------ |
| **Frontend Framework**    | React 19 + Vite 7          | Component-based UI with hot module replacement               |
| **Routing**               | React Router DOM 7         | Client-side SPA navigation                                   |
| **State Management**      | Zustand                    | Lightweight global state store (game state, theme, settings) |
| **Animation**             | GSAP 3.12 (CDN)            | High-performance animation runtime                           |
| **Math Rendering**        | KaTeX (CDN)                | LaTeX-based math formula display                             |
| **Backend (Multiplayer)** | Firebase Realtime Database | Real-time data sync for Party Mode                           |
| **Auth**                  | Firebase Authentication    | Email/password + Google OAuth sign-in                        |
| **Data Persistence**      | `localStorage`             | Client-side persistence for offline-first behavior           |
| **Canvas**                | HTML5 Canvas API           | Sketchpad drawing, confetti particle system                  |
| **Sound**                 | Web Audio API              | Zero-dependency synthesized sound effects                    |
| **Charts**                | Chart.js                   | Analytics dashboard visualizations                           |
| **Build**                 | Vite                       | Sub-second HMR, optimized production bundles                 |
| **Deployment**            | Docker + Google Cloud Run  | Containerized static hosting with auto-scaling               |

### File Structure (React Migration)

```
src/
├── api/                        # Firebase config, auth, guest manager
├── assets/styles/              # Global CSS (glassmorphic design system)
├── components/                 # React components + legacy vanilla modules
│   ├── Header.jsx              # Difficulty & topic selectors
│   ├── Sidebar.jsx             # Navigation + theme/sound toggles
│   ├── QuestionCard.jsx        # Core quiz interaction
│   ├── StatsCard.jsx           # Live session statistics
│   ├── GuideCard.jsx           # Topic guide reference
│   ├── analytics.js            # Chart.js dashboard (1,242 lines)
│   ├── exam-mode.js            # Structured exam system (895 lines)
│   ├── flashcard-mode.js       # Rapid-fire card drills (496 lines)
│   ├── friend-challenge.js     # 1v1 challenge system (471 lines)
│   ├── mistake-review.js       # Error remediation engine (354 lines)
│   ├── party.js                # Firebase multiplayer (269 lines)
│   ├── question-creator.js     # UGC submission + moderation (536 lines)
│   ├── study-groups.js         # Collaborative groups w/ RBAC (583 lines)
│   └── ui-enhancements.js      # Confetti, timer, bookmarks, daily goal (929 lines)
├── constants/                  # Topic configs, difficulty mappings
├── pages/                      # Route-level page components
│   ├── Home.jsx                # Landing page
│   ├── AppQuiz.jsx             # Main quiz experience
│   ├── Auth.jsx                # Sign in / sign up
│   ├── Profile.jsx             # User stats dashboard
│   ├── Leaderboard.jsx         # Global rankings
│   └── NotFound.jsx            # 404 handler
├── store/
│   └── gameStore.js            # Zustand global state
├── utils/
│   ├── questionGenerator.js    # Procedural math questions
│   ├── sounds.js               # Web Audio API synthesizer
│   └── math-system.js          # SVG diagram generation
├── App.jsx                     # React Router setup
└── main.jsx                    # Application entry point
```

### Performance

- **Bundle Size:** ~258 KB JS + ~82 KB CSS (gzipped: ~80 KB JS + ~15 KB CSS)
- **Build Time:** <3 seconds with Vite
- **First Contentful Paint:** <1s (no external API calls on initial load)
- **Offline Capable:** Core functionality works without network — Firebase features degrade gracefully

---

_Built with ❤️ for learners everywhere. Question Randomizer v3.8.0 — where math meets game design._
