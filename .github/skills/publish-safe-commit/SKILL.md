---
name: publish-safe-commit
description: 'Create clean, scoped commits by excluding unrelated changes and verifying commit safety before push.'
argument-hint: 'Describe intended change scope, target branch, and whether to push after commit.'
user-invocable: true
---

# Publish Safe Commit

Create a commit that contains only intended changes, then optionally push.

## When to Use
- User wants to publish changes without including unrelated files.
- Working tree is dirty and commit scope must stay precise.
- User wants safer release commits before PR or deployment.

## Inputs
Collect from the prompt when available:
- Intended file scope or feature scope.
- Commit message preference.
- Target branch and whether to push.

If details are missing, proceed with defaults:
- Infer scope from active task files.
- Generate a conventional, concise commit message.
- Do not push unless user asked to publish/upload.

## Operating Rules
1. Never stage all files blindly when unrelated changes exist.
2. Stage only files that belong to the requested scope.
3. Verify staged diff matches intended scope before commit.
4. Refuse commit if staged changes include unrelated edits.
5. Prefer non-interactive git commands only.

## Procedure
1. Inspect git status and identify all changed files.
2. Partition files into in-scope and out-of-scope.
3. Stage only in-scope files.
4. Show staged diff summary and validate scope alignment.
5. Commit with a clear message tied to the requested change.
6. If push requested:
- Verify remote and branch.
- Push and confirm remote contains latest commit.

## Decision Branches
- If scope is ambiguous: ask one targeted question to define in-scope files.
- If no in-scope changes exist: stop and report no-op.
- If push fails due to auth/permissions: mark blocked and provide exact next command.
- If only unrelated files are changed: do not commit, request clarification.

## Completion Checks
A task is complete only when all are true:
- Commit includes only intended files/changes.
- Commit message is clear and relevant.
- No unrelated file content is included.
- If requested, push succeeds to target remote branch.

## Output Format
- Start with commit result: committed, blocked, or no-op.
- List committed files.
- Include commit hash.
- If pushed, include remote branch confirmation.

## Example Prompts
- Use publish-safe-commit for only auth route fixes, then push to origin main.
- Create a scoped commit for admin analytics files and do not include other changes.
- Safely commit only planner API files and show me the commit hash.
