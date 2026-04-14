import test from "node:test";
import assert from "node:assert/strict";
import { mapAuthError } from "../src/utils/mapAuthError.js";

test("returns known auth error message", () => {
  const message = mapAuthError("auth/invalid-email", "fallback");
  assert.equal(message, "Please enter a valid email address.");
});

test("returns fallback for unknown error code", () => {
  const message = mapAuthError("auth/some-new-error", "custom fallback");
  assert.equal(message, "custom fallback");
});
