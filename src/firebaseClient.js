import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredConfigKeys = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];

const looksLikePlaceholder = (value) => {
  if (!value) return true;
  return /YOUR_|your-project|YOUR_APP_ID|YOUR_MESSAGING/i.test(value);
};

export const isFirebaseConfigured = requiredConfigKeys.every(
  (key) => !looksLikePlaceholder(firebaseConfig[key]),
);

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const functions = getFunctions(app, "asia-southeast2");
