---
name: plan-todo-continue
description: 'Create a plan, immediately convert it into a maintained todo list, and continue execution when the user says Continue or Start Implementation.'
argument-hint: 'Describe the outcome and constraints for the implementation plan.'
user-invocable: true
---

# Plan Todo Continue

Turn planning into immediate execution tracking without requiring repeated todo requests.

## When to Use
- User asks for a plan and expects implementation continuity.
- User wants todos created automatically after planning.
- User wants to resume work with short triggers like Continue or Start Implementation.
- Multi-step implementation needs explicit progress tracking.

## Inputs
Collect from the user prompt when present:
- Outcome: what should be implemented.
- Constraints: stack, architecture, style, deadlines, limits.
- Scope preference: quick pass or full implementation.

If details are missing, proceed with practical defaults and state assumptions briefly.

## Operating Rules
1. After producing a plan, immediately create or update a todo list.
2. Keep exactly one todo item in-progress at a time.
3. Treat Continue and Start Implementation as execution triggers.
4. On each trigger, move to the next actionable todo without asking to recreate todos.
5. Keep todos action-oriented and tied to deliverables.
6. Update todo status as work progresses.
7. End only after implementation is complete or genuinely blocked.

## Procedure
1. Parse the request into implementation outcomes.
2. Build a concise, ordered plan covering all requested requirements.
3. Convert plan steps into todo items immediately:
- Use short action labels.
- Mark first executable item as in-progress.
- Mark completed discovery/planning items as completed.
4. Start implementation from the in-progress todo.
5. After each meaningful change:
- Update the todo list statuses.
- Keep remaining items explicit and actionable.
6. If the user says Continue or Start Implementation:
- Resume from current in-progress item.
- If none is in-progress, promote the next not-started item.
- Continue execution and status updates.
7. Validate final outcome against completion checks.

## Decision Branches
- If user asks only for planning: still create todos after plan unless explicitly told not to.
- If user provides Continue/Start Implementation with no active plan: generate a minimal plan first, then todos, then execute.
- If requirements are ambiguous: make reasonable assumptions, proceed, and ask only the highest-impact clarification.
- If blocked by missing permissions, credentials, or unavailable files: document blocker and propose the exact next action.

## Completion Checks
A task is complete only when all are true:
- Plan exists and covers requested requirements.
- Todo list exists and reflects current status.
- Implementation progressed through todo items in order or with justified reordering.
- Continue/Start Implementation behavior is supported without asking to create todos again.
- Final output states completed work and any remaining blockers.

## Output Format
- Start with what was implemented.
- Briefly list todo progress state.
- Include unresolved assumptions or blockers.
- Provide immediate next actions only when needed.

## Example Prompts
- Plan and build the API layer, then continue automatically when I say Continue.
- Create an implementation plan with todos and start coding right away.
- Start Implementation: finish the next todo item for this feature.
- Continue with the current plan and keep the todo list updated.
