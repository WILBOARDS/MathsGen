#!/usr/bin/env node
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const hooksDir = ".githooks";
const preCommitPath = `${hooksDir}/pre-commit`;

const hookScript = `#!/usr/bin/env sh
npm run secret:scan:staged
`;

mkdirSync(hooksDir, { recursive: true });
writeFileSync(preCommitPath, hookScript, { mode: 0o755 });

execSync(`git config core.hooksPath ${hooksDir}`, { stdio: "inherit" });
console.log("Installed git hooks at .githooks and configured core.hooksPath.");
