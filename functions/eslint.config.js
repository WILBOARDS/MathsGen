import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        process: "readonly",
        URL: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        console: "readonly",
      },
    },
    rules: {
      "no-restricted-globals": ["error", "name", "length"],
      "prefer-arrow-callback": "error",
      quotes: ["error", "double", { allowTemplateLiterals: true }],
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
