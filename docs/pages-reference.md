# Mathquizzizz Page Reference

Last updated: 2026-03-22
Source of truth: src/App.jsx, src/config/routes.js, and src/pages/\*.jsx

## Purpose

This document is a comprehensive reference for every routed page in the app.
For each page, it captures route mapping, access model, primary UX purpose, key UI sections, state/logic patterns, store/API integrations, and notable behaviors.

## Routing And Access Model

### Route groups

- Auth-only route group: AUTH_ROUTES
- Public route group: PUBLIC_ROUTES
- Protected layout route group: LAYOUT_ROUTES

### Guard behavior summary

- Unauthenticated users can access only public pages plus /auth.
- Unauthenticated users are redirected from protected routes to /landing.
- Authenticated users visiting /auth are redirected to /.
- Admin-only pages (/admin and /status) are wrapped by AdminRoute and require Firebase custom claim admin=true.
- Most protected pages render in DashboardLayout; public pages render in PublicLayout.

### Tutor dock pages

FeedbackWidget dock appears on these route keys:

- appQuiz
- exam
- timed
- flashcards
- crossword
- party
- fishing

## Global Route Inventory

| Route              | Key            | Component file                       | Access        | Layout                       | Notes                            |
| ------------------ | -------------- | ------------------------------------ | ------------- | ---------------------------- | -------------------------------- |
| /auth              | auth           | src/pages/Auth.jsx                   | Guest only    | Direct                       | Redirects signed-in users to /   |
| /landing           | landing        | src/pages/Landing.jsx                | Public        | PublicLayout                 | Main marketing/entry page        |
| /about             | about          | src/pages/About.jsx                  | Public        | PublicLayout                 | Legal/informational              |
| /contact           | contact        | src/pages/Contact.jsx                | Public        | PublicLayout                 | Contact form                     |
| /privacy           | privacy        | src/pages/PrivacyPolicy.jsx          | Public        | PublicLayout                 | Legal                            |
| /terms             | terms          | src/pages/TermsOfService.jsx         | Public        | PublicLayout                 | Legal                            |
| /faq               | faq            | src/pages/FAQ.jsx                    | Public        | PublicLayout                 | Public FAQ                       |
| /accessibility     | accessibility  | src/pages/AccessibilityStatement.jsx | Public        | PublicLayout                 | Accessibility statement          |
| /                  | dashboard      | src/pages/Dashboard.jsx              | Authenticated | DashboardLayout              | Default signed-in home           |
| /courses           | courses        | src/pages/Courses.jsx                | Authenticated | DashboardLayout              | Course catalog                   |
| /courses/:courseId | courses        | src/pages/Courses.jsx                | Authenticated | DashboardLayout              | Course detail variant            |
| /practice-topics   | practiceTopics | src/pages/PracticeTopics.jsx         | Authenticated | DashboardLayout              | Practice selector                |
| /app               | appQuiz        | src/pages/AppQuiz.jsx                | Authenticated | DashboardLayout              | Core quiz flow                   |
| /profile           | profile        | src/pages/Profile.jsx                | Authenticated | DashboardLayout              | Profile editor + stats           |
| /leaderboard       | leaderboard    | src/pages/Leaderboard.jsx            | Authenticated | DashboardLayout              | Rankings                         |
| /timed             | timed          | src/pages/TimedMode.jsx              | Authenticated | DashboardLayout              | Timed quiz mode                  |
| /flashcards        | flashcards     | src/pages/FlashcardMode.jsx          | Authenticated | DashboardLayout              | Flashcard mode                   |
| /settings          | settings       | src/pages/Settings.jsx               | Authenticated | DashboardLayout              | Preferences                      |
| /hint              | help           | src/pages/Help.jsx                   | Authenticated | DashboardLayout              | Formula/help reference           |
| /bookmarks         | bookmarks      | src/pages/Bookmarks.jsx              | Authenticated | DashboardLayout              | Saved questions                  |
| /share             | share          | src/pages/ShareScore.jsx             | Authenticated | DashboardLayout              | Share score card                 |
| /analytics         | analytics      | src/pages/Analytics.jsx              | Authenticated | DashboardLayout              | Performance analytics            |
| /achievements      | achievements   | src/pages/Achievements.jsx           | Authenticated | DashboardLayout              | Badge/achievement gallery        |
| /exam              | exam           | src/pages/ExamMode.jsx               | Authenticated | DashboardLayout              | Exam simulation                  |
| /friends           | friends        | src/pages/Friends.jsx                | Authenticated | DashboardLayout              | Friends/social graph             |
| /study-groups      | studyGroups    | src/pages/StudyGroups.jsx            | Authenticated | DashboardLayout              | Group collaboration              |
| /mistake-review    | mistakeReview  | src/pages/MistakeReview.jsx          | Authenticated | DashboardLayout              | Incorrect answer review          |
| /party             | party          | src/pages/PartyMode.jsx              | Authenticated | DashboardLayout              | Multiplayer quiz                 |
| /study-materials   | studyMaterials | src/pages/StudyMaterials.jsx         | Authenticated | DashboardLayout              | AI upload + study suite          |
| /numermons         | numermons      | src/pages/NumermonCollection.jsx     | Authenticated | DashboardLayout              | Collection gallery               |
| /scholar-pass      | scholarPass    | src/pages/ScholarPass.jsx            | Authenticated | DashboardLayout              | Pass progression                 |
| /store             | store          | src/pages/Store.jsx                  | Authenticated | DashboardLayout              | Premium/item shop                |
| /inventory         | inventory      | src/pages/Inventory.jsx              | Authenticated | DashboardLayout              | Consumable management            |
| /gacha             | gacha          | src/pages/EquationBox.jsx            | Authenticated | DashboardLayout              | Naming intentionally non-obvious |
| /community         | community      | src/pages/Community.jsx              | Authenticated | DashboardLayout              | User quiz ecosystem              |
| /fishing           | fishing        | src/pages/FishingMode.jsx            | Authenticated | DashboardLayout              | Fishing quiz game                |
| /crossword         | crossword      | src/pages/CrosswordMode.jsx          | Authenticated | DashboardLayout              | Crossword quiz game              |
| /status            | status         | src/pages/SystemStatus.jsx           | Admin only    | DashboardLayout + AdminRoute | Operational health               |
| /admin             | admin          | src/pages/Admin.jsx                  | Admin only    | DashboardLayout + AdminRoute | Platform operations              |
| \*                 | notFound       | src/pages/NotFound.jsx               | Fallback      | DashboardLayout              | Catch-all route                  |

## Detailed Page Profiles

## Auth Route

### Auth (src/pages/Auth.jsx)

- Route(s): /auth
- Access and guard: Guest-only intent; signed-in users are redirected to /
- Purpose: Entry point for login, signup, password reset, and Google sign-in completion
- Major UI sections: mode tabs, credential form, profile fields for new user setup, OAuth actions, validation messaging
- State and logic: multi-mode local state for email/password/username/name/grade/errors/loading; flow branching for forgot-password and new Google registration
- Integrations: AUTH service methods, game/economy reset hooks on account transitions, analytics funnel tracking
- Notable behaviors: popup OAuth handling, inline validation, onboarding data capture before full registration completion

## Public Routes

### Landing (src/pages/Landing.jsx)

- Route(s): /landing
- Access and guard: Public
- Purpose: Product landing experience for new/guest visitors
- Major UI sections: hero, value proposition cards, testimonials, CTA actions
- State and logic: mostly presentational; route navigation for CTA buttons
- Integrations: public routing only
- Notable behaviors: Framer Motion staggered entrances and section reveal effects

### About (src/pages/About.jsx)

- Route(s): /about
- Access and guard: Public
- Purpose: Explain platform mission and background
- Major UI sections: mission summary, feature explanation, creator links
- State and logic: static content
- Integrations: external links
- Notable behaviors: informational/legal style page shell

### Contact (src/pages/Contact.jsx)

- Route(s): /contact
- Access and guard: Public
- Purpose: User contact and feedback intake
- Major UI sections: contact form fields, submit status feedback
- State and logic: controlled inputs for name/email/subject/message, basic validation
- Integrations: mailto handling
- Notable behaviors: success/error messaging and reset after submit

### PrivacyPolicy (src/pages/PrivacyPolicy.jsx)

- Route(s): /privacy
- Access and guard: Public
- Purpose: Privacy and data processing disclosure
- Major UI sections: policy sections for collection, use, storage, rights, contact
- State and logic: static legal content
- Integrations: none
- Notable behaviors: documentation-oriented layout

### TermsOfService (src/pages/TermsOfService.jsx)

- Route(s): /terms
- Access and guard: Public
- Purpose: Terms and usage contract
- Major UI sections: user obligations, acceptable use, liability and updates
- State and logic: static legal content
- Integrations: none
- Notable behaviors: legal document shell consistent with other policy pages

### FAQ (src/pages/FAQ.jsx)

- Route(s): /faq
- Access and guard: Public
- Purpose: Public frequently asked questions
- Major UI sections: accordion entries for common questions
- State and logic: open/close index state per item
- Integrations: none
- Notable behaviors: expandable FAQ interaction pattern

### AccessibilityStatement (src/pages/AccessibilityStatement.jsx)

- Route(s): /accessibility
- Access and guard: Public
- Purpose: Accessibility compliance and limitation disclosure
- Major UI sections: conformance statement, known limitations, support/contact
- State and logic: static content
- Integrations: none
- Notable behaviors: accessibility-first legal style content

## Protected Layout Routes

### Dashboard (src/pages/Dashboard.jsx)

- Route(s): /
- Access and guard: Authenticated
- Purpose: Personalized home dashboard after sign-in
- Major UI sections: progress summary, featured items, upcoming activities, leaderboard preview
- State and logic: derived metrics from profile and progress, memoized selectors
- Integrations: game store plus leaderboard/newsletter cloud function calls
- Notable behaviors: recommendation-style content and contextual summaries

### Courses (src/pages/Courses.jsx)

- Route(s): /courses, /courses/:courseId
- Access and guard: Authenticated
- Purpose: Course catalog and route-specific course detail rendering
- Major UI sections: course cards, module listings, progress/action links
- State and logic: course selection and route param handling with not-found fallback per course id
- Integrations: game store progressive practice trigger
- Notable behaviors: dual-role page (index + detail) from one component

### PracticeTopics (src/pages/PracticeTopics.jsx)

- Route(s): /practice-topics
- Access and guard: Authenticated
- Purpose: User-driven topic and level practice launch
- Major UI sections: level chooser, topic chips, start action
- State and logic: selected level/topic state
- Integrations: game store startManualPractice
- Notable behaviors: direct launch into controlled practice context

### AppQuiz (src/pages/AppQuiz.jsx)

- Route(s): /app
- Access and guard: Authenticated, tutor dock enabled
- Purpose: Core adaptive quiz gameplay flow
- Major UI sections: quiz shell, question card, answer input/feedback, progress framing
- State and logic: session loading, focus management, score synchronization effects
- Integrations: game store session methods and submitScore cloud callable
- Notable behaviors: primary learning loop with leaderboard synchronization triggers

### Profile (src/pages/Profile.jsx)

- Route(s): /profile
- Access and guard: Authenticated
- Purpose: Profile editing, identity customization, and user statistics
- Major UI sections: editable profile form, picture/cropper workflow, stats panels, badges
- State and logic: large local state graph for form/editing/cropper/status handling
- Integrations: AUTH profile source, unified stats hook, user stats callable, storage upload
- Notable behaviors: image crop and upload pipeline with server/local stats fallback strategy

### Leaderboard (src/pages/Leaderboard.jsx)

- Route(s): /leaderboard
- Access and guard: Authenticated
- Purpose: Ranking visibility for users and guests
- Major UI sections: board tabs, ranking rows, score/streak indicators, guest identity info
- State and logic: leaderboard source selection, guest profile lifetime and local persistence
- Integrations: realtime leaderboard hook and local fallback logic
- Notable behaviors: guest profile generation with expiry and continuous rank updates

### TimedMode (src/pages/TimedMode.jsx)

- Route(s): /timed
- Access and guard: Authenticated, tutor dock enabled
- Purpose: Speed challenge quiz mode
- Major UI sections: setup presets, timer-focused question loop, result summary
- State and logic: phase machine (setup/playing/results), timer countdown, streak and scoring
- Integrations: question generator utilities
- Notable behaviors: color-coded urgency timer and automatic phase transition behavior

### FlashcardMode (src/pages/FlashcardMode.jsx)

- Route(s): /flashcards
- Access and guard: Authenticated, tutor dock enabled
- Purpose: Flashcard-style practice with answer reveal
- Major UI sections: setup, card panel, flip interaction, session summary
- State and logic: phase machine, card index, flip state, result counters and timing
- Integrations: question generator
- Notable behaviors: animated card flip and progression metrics

### Settings (src/pages/Settings.jsx)

- Route(s): /settings
- Access and guard: Authenticated
- Purpose: Account, preference, accessibility, and app behavior controls
- Major UI sections: tabbed settings sections (profile/account/preferences/help/app), toggles/actions
- State and logic: many toggle/form states and asynchronous account actions
- Integrations: AUTH operations, game/economy stores, ads runtime control
- Notable behaviors: theme and accessibility controls tied to global classes/preferences

### Help (src/pages/Help.jsx)

- Route(s): /hint
- Access and guard: Authenticated
- Purpose: In-app formula and math guidance reference
- Major UI sections: topic groups, formula rows, explanatory examples
- State and logic: accordion/category index state
- Integrations: none
- Notable behaviors: reference-first content for quick lookup during learning

### Bookmarks (src/pages/Bookmarks.jsx)

- Route(s): /bookmarks
- Access and guard: Authenticated
- Purpose: Review and manage saved questions
- Major UI sections: bookmark list, remove controls, clear-all action, empty state
- State and logic: bookmark list projection from store
- Integrations: game store remove/clear bookmark actions
- Notable behaviors: list animation on item removal and timestamp formatting

### ShareScore (src/pages/ShareScore.jsx)

- Route(s): /share
- Access and guard: Authenticated
- Purpose: Build and share score summary
- Major UI sections: score card, share preview text, share/copy/download controls
- State and logic: derived grade mapping and share status state
- Integrations: game store values and share helper utilities
- Notable behaviors: native share API fallback pattern and clipboard flows

### Analytics (src/pages/Analytics.jsx)

- Route(s): /analytics
- Access and guard: Authenticated
- Purpose: Learning performance and trend analytics
- Major UI sections: summary KPIs, trend chart areas, topic mastery and history lists
- State and logic: aggregated metrics from answer history and topic stats
- Integrations: game store and unified stats hook
- Notable behaviors: computed trend visualization and topic performance sorting

### Achievements (src/pages/Achievements.jsx)

- Route(s): /achievements
- Access and guard: Authenticated
- Purpose: Show unlockable/unlocked achievements and progress
- Major UI sections: category filters, achievement cards, progress details
- State and logic: open/expanded achievement state and filtering
- Integrations: game store achievements data
- Notable behaviors: reveal animations and progress status presentation

### ExamMode (src/pages/ExamMode.jsx)

- Route(s): /exam
- Access and guard: Authenticated, tutor dock enabled
- Purpose: Structured exam simulation with fixed question/time presets
- Major UI sections: preset setup, in-progress exam panel, result and grade summary
- State and logic: phase machine, timed progression, answer collection, final scoring
- Integrations: question generation and submitScore callable
- Notable behaviors: auto-submit on timeout and letter-grade conversion rules

### Friends (src/pages/Friends.jsx)

- Route(s): /friends
- Access and guard: Authenticated
- Purpose: Social graph management and friend request workflows
- Major UI sections: tabs for friends/discover/requests, search, action cards
- State and logic: tab/search/action result states and async data hydration
- Integrations: AUTH friend methods, user stats callable enrichment
- Notable behaviors: combined relationship actions with profile stats overlays

### StudyGroups (src/pages/StudyGroups.jsx)

- Route(s): /study-groups
- Access and guard: Authenticated
- Purpose: Collaborative group creation and participation
- Major UI sections: group lists (public/my groups), create form, announcement tools
- State and logic: selected group, form states, refresh signaling
- Integrations: study group singleton service and user identity source
- Notable behaviors: guest uid fallback for local use and announcement publishing

### MistakeReview (src/pages/MistakeReview.jsx)

- Route(s): /mistake-review
- Access and guard: Authenticated
- Purpose: Inspect and correct previously wrong answers
- Major UI sections: correction KPIs, mistake item list, correction and clear actions
- State and logic: refresh key pattern to reload local mistake data
- Integrations: mistake-review helper module (local storage backed)
- Notable behaviors: correction-rate calculation and bulk clear operation

### PartyMode (src/pages/PartyMode.jsx)

- Route(s): /party
- Access and guard: Authenticated, tutor dock enabled
- Purpose: Multiplayer/lobby-based quiz sessions
- Major UI sections: host/join lobby controls, live question panel, in-room leaderboard
- State and logic: lobby lifecycle state (host/join/active), player answers and room sync
- Integrations: PARTY manager singleton and question generation
- Notable behaviors: room code workflow, reconnect handling, host control paths

### StudyMaterials (src/pages/StudyMaterials.jsx)

- Route(s): /study-materials
- Access and guard: Authenticated, tutor dock enabled
- Purpose: Upload study files for AI processing and generated study suites
- Major UI sections: upload form, progress/status, processed suite list, viewer sections
- State and logic: upload lifecycle and active suite selection
- Integrations: feature flag hook, Firebase Storage uploads, RTDB listeners, processStudyMaterial function
- Notable behaviors: feature-gated UI, resumable upload progress, lazy-loaded study components

### NumermonCollection (src/pages/NumermonCollection.jsx)

- Route(s): /numermons
- Access and guard: Authenticated
- Purpose: View and manage collected Numermons
- Major UI sections: rarity-colored card grid, lock/equipped states, detail modal
- State and logic: selected creature state and modal visibility
- Integrations: economy store ownership/equip actions and rarity config data
- Notable behaviors: locked card treatment, equipped badge, detail-driven equip flow

### ScholarPass (src/pages/ScholarPass.jsx)

- Route(s): /scholar-pass
- Access and guard: Authenticated
- Purpose: Pass progression and reward claim tracking
- Major UI sections: tier track, free vs premium lanes, claim controls
- State and logic: current tier/level and claimed reward sets
- Integrations: economy store claim and progression data
- Notable behaviors: milestone styling and tier animation progression

### Store (src/pages/Store.jsx)

- Route(s): /store
- Access and guard: Authenticated
- Purpose: Currency and item purchasing
- Major UI sections: premium bundles, daily deals, item listings with buy controls
- State and logic: selected purchase targets and quantities
- Integrations: economy store purchase handlers
- Notable behaviors: deterministic daily deal selection by date seed

### Inventory (src/pages/Inventory.jsx)

- Route(s): /inventory
- Access and guard: Authenticated
- Purpose: Inventory item usage and boost status management
- Major UI sections: currency/boost summary, grouped items, consume buttons
- State and logic: grouped filtering and active boost timing state
- Integrations: economy store inventory, syncInventoryFromServer, consumeInventoryItem
- Notable behaviors: mount-time server sync and grouped rendering by item type

### EquationBox (src/pages/EquationBox.jsx)

- Route(s): /gacha
- Access and guard: Authenticated
- Purpose: Gacha pull experience for Numermon rewards
- Major UI sections: pull trigger area, reveal animation stage, reward result card
- State and logic: phase machine (glow/reveal/idle), pull result and duplicate handling
- Integrations: economy store gacha and ownership logic
- Notable behaviors: particle/reveal choreography and rarity-driven styling

### Community (src/pages/Community.jsx)

- Route(s): /community
- Access and guard: Authenticated
- Purpose: Community quiz creation, discovery, and play ecosystem
- Major UI sections: public quiz feed, create/edit modal, leaderboard, image upload flow
- State and logic: substantial form and modal state for CRUD and media handling
- Integrations: quizzizz cloud functions, Firebase Storage uploads, leaderboard recording
- Notable behaviors: invite code copy, image upload progress, mode-based play routing

### FishingMode (src/pages/FishingMode.jsx)

- Route(s): /fishing
- Access and guard: Authenticated, tutor dock enabled
- Purpose: Fishing-themed quiz mini-game
- Major UI sections: setup, cast/reel animation phase, timed Q and results
- State and logic: setup/playing/results phases with fish rarity and timer state
- Integrations: quizzizz fetch/record callables and fallback question data
- Notable behaviors: rarity-based scoring and animation-led gameplay loop

### CrosswordMode (src/pages/CrosswordMode.jsx)

- Route(s): /crossword
- Access and guard: Authenticated, tutor dock enabled
- Purpose: Crossword puzzle mode using math clues
- Major UI sections: setup, generated crossword grid, clue list, completion summary
- State and logic: grid generation, selected word tracking, guess states, countdown timer
- Integrations: quizzizz fetch/record callables
- Notable behaviors: intersection-based word placement and puzzle progression logic

## Admin-Only Protected Routes

### SystemStatus (src/pages/SystemStatus.jsx)

- Route(s): /status
- Access and guard: Authenticated + admin claim required
- Purpose: Operational health view of core platform systems
- Major UI sections: aggregate status card, subsystem checks, refresh timing metadata
- State and logic: health/error/timestamp state with periodic polling
- Integrations: getSystemHealth callable and admin claim inspection
- Notable behaviors: public-safe vs admin-detailed rendering paths and 30-second refresh cycle

### Admin (src/pages/Admin.jsx)

- Route(s): /admin
- Access and guard: Authenticated + admin claim required
- Purpose: Centralized operations console
- Major UI sections: access verification, audit/rate-limiter panels, webhook testing, QA inventory tools, analytics summaries
- State and logic: extensive asynchronous state for multiple operational modules
- Integrations: admin callables (verify access, audit logs, rate limiter, webhook send, inventory award), realtime sync sources
- Notable behaviors: defense-in-depth access gating and cross-functional tooling in one surface

## Fallback Route

### NotFound (src/pages/NotFound.jsx)

- Route(s): \*
- Access and guard: Fallback for unmatched paths
- Purpose: Friendly 404 handling and return navigation
- Major UI sections: not-found message and go-home action
- State and logic: static view
- Integrations: tracker event emission for unmatched route analytics
- Notable behaviors: catches unknown paths while still inside protected layout routing context

## Cross-Cutting Implementation Notes

### Shared architectural patterns

- React.lazy per-page code splitting in App route layer.
- Framer Motion used broadly for transitions and staged motion.
- Two main global stores: game state and economy state.
- Cloud Functions wrappers are primary server integration path.
- Firebase services appear in page-level flows where real-time or file workflows are required.

### Known intentional oddities

- /gacha route maps to EquationBox component name.
- /courses and /courses/:courseId share the same component with internal branch logic.
- AdminRoute is frontend defense-in-depth; backend callables still enforce claims independently.

### Completeness checks

- Total routed page components in src/pages: 39
- Total lazy-loaded page mappings in App route map: 39
- All mapped keys are represented in this document.
