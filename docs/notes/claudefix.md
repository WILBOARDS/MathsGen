MathGen Bug Report & Solutions

Problem 1: Accuracy Resets to 0% on Certain Pages
Description:
The header accuracy display shows 73% on most pages (Analytics, Courses, Practice) but drops back to 0% when navigating to the Leaderboard or returning to the Dashboard at the end of the session. This means the accuracy value is being re-fetched or recalculated on a per-page basis rather than being stored and shared globally across the app.
Root Cause:
The accuracy value is likely fetched independently on each page load. Pages like the Leaderboard probably query a different data scope (e.g., only the current quiz session) instead of the user's cumulative record.
Solution:
Store the accuracy value in a global state (React Context, Redux, Zustand, or equivalent). Fetch it once when the user logs in or when the dashboard loads, then pass it down or share it across all pages. Never let individual pages re-initialize it to 0 as a default.
Suggestion:
Show a subtle loading skeleton in the header while accuracy loads rather than defaulting to 0%, so it never flashes an incorrect value.

Problem 2: Leaderboard Shows 0 Score & 0% Accuracy
Description:
The Leaderboard page shows the user with a score of 0 and 0% accuracy, even though the Analytics page clearly records a score of 148 and 73% accuracy for the exact same user. The leaderboard is pulling from a different or empty data source.
Root Cause:
The leaderboard likely queries a separate collection or table (e.g., a dedicated leaderboard snapshot) that only updates when a specific event is triggered — such as finishing a quiz in a competitive mode — rather than reading from the main user stats.
Solution:
Either sync the leaderboard data with the user's cumulative stats after every quiz completion, or clearly separate the two concepts in the UI. If the leaderboard is meant to be competition-based (score within a specific quiz event), label it clearly as "Quiz Session Leaderboard" so users aren't confused when they see 0.
Suggestion:
Add a "Last updated" timestamp on the leaderboard so users understand when the data was last synced.

Problem 3: Quiz Creation Modal — Title Field Has No Placeholder
Description:
In the "Create a Quizzizz" modal, the title input field is completely blank with no placeholder text. A first-time user has no visual cue that this is where they should type the quiz name.
Root Cause:
The placeholder attribute is simply missing from the input element.
Solution:
Add a descriptive placeholder to the input, for example: placeholder="Enter a quiz title...". This is a one-line fix.
Suggestion:
Also add a red asterisk or "Required" label next to the title field since it's mandatory before adding questions. Currently there's no indication it's required until the user tries to submit.

Problem 4: "Active Subjects" Showing Grades with 0% Progress
Description:
Grade 4 and Grade 5 appear in the "Active Subjects" widget on the Dashboard with 0% progress bars. A subject at 0% has not been started at all, so calling it "active" is misleading and clutters the dashboard with irrelevant information.
Root Cause:
The query for "Active Subjects" is likely fetching all enrolled or assigned subjects rather than filtering for subjects where the user has actually started (progress > 0%).
Solution:
Filter the Active Subjects list to only include subjects where progress > 0. Subjects at 0% can still be visible on the Courses page under "All Subjects" or "Not Started."
Suggestion:
Rename the section to "In Progress" to be more accurate, and add a small "Start" button next to 0% subjects on the Courses page to make it easier to begin them.

Problem 5: Best Streak Stuck at 0 Despite Completed Quizzes
Description:
Both the Analytics page and the Profile page show "Best Streak: 0" even though the Recent Activity panel shows multiple completed quizzes with Score 100. The streak counter is clearly not incrementing.
Root Cause:
There are a few likely causes: the streak increment logic is not being triggered after quiz completion, or the streak is tracking something different (e.g., consecutive days) but the user completed all their quizzes on the same day. Another possibility is the streak resets on page reload due to a state management bug.
Solution:
Audit the streak update function and confirm it is called at the end of every successful quiz. Add logging temporarily to verify it fires. If the streak is day-based, make sure the timezone handling is correct — a common bug is UTC vs. local time mismatches causing the "day" to roll over incorrectly.
Suggestion:
Display what type of streak it is (e.g., "Daily Login Streak" or "Consecutive Correct Answers") so users understand how to build it. Currently it's ambiguous.

Problem 6: All Upcoming Quizzes Labeled "High" With No Context
Description:
Every upcoming quiz on the Dashboard (Grade 11, Grade 12, Grade 8) carries a red "High" badge. There is no tooltip, legend, or explanation of what "High" means — it could be difficulty, priority, urgency, or something else entirely.
Root Cause:
The badge label is hardcoded or always defaults to "High" without a working classification system behind it. Alternatively the classification exists but isn't explained in the UI.
Solution:
If it represents difficulty, make sure the value is dynamic and pulled from the quiz's metadata. Add at least three levels (Low / Medium / High) with different colors — green, orange, red — and include a small legend or tooltip (hovering over the badge shows "Difficulty: High").
Suggestion:
If all quizzes are genuinely high priority right now (e.g., they are overdue or near due date), consider using a different label like "Due Soon" with a clock icon instead of "High," which is more descriptive and less alarming.

Problem 7: Badges Section Shows "(0 / 0)" — Broken Denominator
Description:
The Profile page shows "Badges (0 / 0)." The denominator being 0 implies there are zero badges available in the entire system, which is almost certainly unintentional. It makes the feature feel broken or empty.
Root Cause:
The total available badges count is either not being fetched, returning null, or defaulting to 0 when the data hasn't loaded yet.
Solution:
Fetch the total badge count from your badges database/config and display it as the denominator. For example: "Badges (0 / 12)." This also makes the gamification motivating — users can see there are 12 badges to earn even if they have none yet.
Suggestion:
Show locked badge icons with a greyed-out style and a description of how to unlock each one. Empty state messages like "Play games to unlock badges!" are fine, but showing what's available creates much stronger motivation to engage.

Problem 8: "0-Day Streak" on Dashboard Despite Recent Activity
Description:
The Dashboard welcome banner says "You are on a 0-day streak. Keep momentum and lock in your next win." while the Recent Activity panel right next to it shows four recently completed quizzes. This contradiction makes the streak feature feel completely broken to the user.
Root Cause:
Same root cause as Problem 5. The streak logic either isn't running, isn't persisting to the database, or is reading from a different user record than the one being displayed.
Solution:
This and Problem 5 should be fixed together. Centralize streak tracking into a single service or function. After every quiz completion, call updateStreak(userId) which checks the last activity timestamp and increments or resets accordingly. Make sure the Dashboard reads from the same persisted value.
Suggestion:
Even a 1-day streak should show something celebratory. Consider using "You're on a 1-day streak 🔥" right after a first quiz to immediately reward users and make the streak system feel alive.

General Suggestions
1. Consistency in data loading: Several bugs stem from the same root issue — different pages fetching data independently and getting inconsistent results. Consider implementing a centralized data layer (a global store or server-side session) that all pages read from.
2. Add a Status page: You already have a "Status" link in the footer. Make sure it's functional so that if backend issues cause score/streak sync problems, users can check it themselves rather than assuming the app is broken.
3. Zero-state handling: Several sections (Badges, Leaderboard, Streak) display "0" without any helpful explanation. Every zero-state should either explain why it's 0 or guide the user on what action will change it.
4. The app's core concept is strong — the course progression, analytics trend chart, and multi-grade structure are well thought out. Fixing the data consistency issues above will make the experience feel polished and trustworthy.