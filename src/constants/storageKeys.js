/**
 * Centralised localStorage key names and custom event names.
 * Import from here instead of repeating string literals across files.
 */

export const STORAGE_KEYS = {
  COMMUNITY_QUIZZES: "mqz_community_quizzes",
  PROFILE_STATS: "mqz_profile_stats",
  CHAT_DOCK_MESSAGES: "mqz_chat_dock_messages",
};

export const CUSTOM_EVENTS = {
  /** Fired by CreateQuizzizzPage after saving; CommunityPage listens to refresh. */
  QUIZ_SAVED: "mqz-quiz-saved",
};
