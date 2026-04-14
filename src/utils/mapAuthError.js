export function mapAuthError(errorCode, fallbackMessage) {
  const knownMessages = {
    "auth/email-already-in-use": "This email is already in use. Please sign in instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/missing-password": "Password is required.",
    "auth/weak-password": "Password is too weak. Use at least 6 characters.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/network-request-failed": "Network issue. Check your internet and try again.",
    "functions/unavailable": "Service temporarily unavailable. Please try again shortly.",
    "functions/invalid-argument": "Please enter a valid email address.",
    "functions/internal": "Could not process this request. Please try again.",
  };

  return knownMessages[errorCode] || fallbackMessage;
}
