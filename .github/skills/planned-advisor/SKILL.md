---
name: planned-advisor
description: "Advisor-grade planning workflow for planned mode. Produces detailed, implementation-ready plans with decision branches, risks, verification, and execution guidance for coding agents. Triggers: planned mode, detailed plan, advisor plan, implementation roadmap, plan this."
argument-hint: Describe the target outcome and constraints to plan.
---

# Planned Advisor Skill

Use this skill when the user wants planning depth, not quick brainstorming.
The output should read like an expert technical advisor guiding an implementer.

## Outcome

Produce a detailed, execution-ready plan that a coding agent can implement with minimal ambiguity.

## When To Use

Use when user asks for:

- planned mode behavior
- comprehensive implementation plan
- roadmap/phased execution
- risk-aware plan with verification
- advisor-level technical explanation

Do not use when user only wants direct coding without planning.

## Planning Standard (Advisor Mode)

Always include:

1. Objective and scope boundaries
2. Current-state summary from codebase evidence
3. Assumptions and constraints
4. Decision points with recommended path and alternatives
5. Phased plan with dependencies
6. Verification matrix and acceptance criteria
7. Rollback/safety strategy
8. Residual risks and monitoring signals

## Workflow

### Phase 1: Frame The Problem

1. Restate requested outcome in implementation terms.
2. Identify explicit user constraints and implicit technical constraints.
3. Define what is in scope and out of scope.

### Phase 2: Gather Evidence

1. Read relevant files and interfaces.
2. Map integration points, side effects, and shared state.
3. Identify existing patterns to reuse.
4. Record unknowns that could block execution.

### Phase 3: Design The Plan

1. Propose primary approach and explain why it is preferred.
2. Provide 1-2 viable alternatives with trade-offs.
3. Define step-by-step phases with explicit dependencies.
4. For each phase, include:

- goal
- files/symbols touched
- implementation notes
- risk notes
- done criteria

### Phase 4: Branching Logic

Include decision branches where applicable:

- If backend capability exists, reuse and extend.
- If backend capability missing, introduce minimal endpoint first.
- If security/compliance risk appears, gate rollout with feature flags.
- If user experience risk appears, prioritize fallback and observability.

### Phase 5: Verification Plan

Provide concrete verification methods:

1. Static checks (lint/type/diagnostics)
2. Runtime checks (manual flows)
3. Edge-case checks (offline, auth, fallback, malformed input)
4. Regression checks on adjacent surfaces

Define acceptance criteria as pass/fail statements.

### Phase 6: Handoff To Coding Agent

End with implementer-focused handoff:

1. Ordered task list suitable for immediate execution
2. Required environment variables or config
3. Expected artifacts/files changed
4. Post-deploy validation checklist

## Response Quality Bar

A plan is complete only if:

- Each major action maps to concrete files/components/functions.
- Dependencies are explicit (what must happen first).
- Risks are paired with mitigations.
- Verification is specific, not generic.
- The plan is understandable by an implementer without hidden assumptions.

## Formatting Guidance

1. Start with solution direction (recommended approach).
2. Then provide phased details.
3. Use concise, precise language.
4. Prefer actionable statements over abstract commentary.
5. Keep explanations detailed enough for implementation clarity.

## Example Prompts

- "Use planned advisor mode to design a full rollout for hybrid leaderboard + anti-bot tutor protection."
- "Create an advisor-grade plan for adding payment webhooks with rollback safety."
- "Plan this feature in detailed phases so a coding agent can execute directly."

## Non-Goals

- Writing final production code inside the planning response
- Vague high-level brainstorming without execution detail
- Omitting verification or risk analysis
