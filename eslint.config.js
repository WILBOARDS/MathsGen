import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import prettierConfig from "eslint-config-prettier";

export default [
  js.configs.recommended,
  prettierConfig,
  {
    files: ["src/**/*.{js,jsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: "readonly",
        document: "readonly",
        globalThis: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        navigator: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        HTMLElement: "readonly",
        CustomEvent: "readonly",
        AbortController: "readonly",
        Notification: "readonly",
        btoa: "readonly",
        atob: "readonly",
        location: "readonly",
        screen: "readonly",
        module: "readonly",
        MutationObserver: "readonly",
        IntersectionObserver: "readonly",
        SpeechSynthesisUtterance: "readonly",
        AudioContext: "readonly",
        OscillatorNode: "readonly",
        GainNode: "readonly",
        Image: "readonly",
        FileReader: "readonly",
        Blob: "readonly",
        alert: "readonly",
        confirm: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        performance: "readonly",
        PerformanceObserver: "readonly",
        indexedDB: "readonly",
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-vars": "warn",
      "react/prop-types": "off",
      "react/display-name": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-duplicate-imports": "error",
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "warn",
      curly: ["warn", "multi-line"],

      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-prototype-builtins": "off",
    },
  },
  {
    files: ["tools/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", "functions/**", "*.config.js"],
  },
];
