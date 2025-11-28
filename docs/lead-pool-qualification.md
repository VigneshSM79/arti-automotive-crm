# Lead Pool Qualification Changes

## Goal
Only **qualified** leads should appear in the Lead Pool. Qualification is decided by the AI flow (n8n Workflow 2) based on conversation history; the UI must no longer rely on `owner_id IS NULL` to decide pool visibility.

## Current (to change)
- Lead Pool page lists any lead with `owner_id IS NULL`.
- Workflow 3 moves leads to pool by setting `owner_id = NULL`.
- Scheduler sends follow-ups to all active enrollments, regardless of qualification.

## New Behavior
1) **Qualification source:** Workflow 2 classifies a lead as qualified when AI analysis deems it ready. Add an explicit output flag/tag from Workflow 2 indicating qualification.
2) **Pool listing rule:** Lead Pool shows only leads marked **qualified** (not just unassigned). The frontend must filter on the qualification marker, not on `owner_id IS NULL`.
3) **Assignment:** Claiming still sets `owner_id` on the lead, but pool inclusion/exclusion is driven by qualification status.
4) **Follow-up scheduler:** Only runs for active, **non-qualified** enrollments. Qualified leads are excluded from further automated follow-ups.

## Data Model Changes
- Add a qualification marker tied to enrollments (proposed):
  - Option A: `campaign_enrollments.qualification_status` ENUM/Text (`unqualified` | `qualified`).
  - Option B: `campaign_enrollments.is_qualified` BOOLEAN.
- Frontend reads pool data by joining on this marker instead of `owner_id IS NULL`.
- Owner assignment remains for claim, but not for determining pool eligibility.

## Workflow Updates
- **Workflow 2 (Enhanced AI Tag Classification):**
  - After AI analysis, set the qualification flag when conditions are met (e.g., positive intent, clear buying signals).
  - On qualification, call Workflow 3 to place the lead in the pool.
- **Workflow 3 (Lead Pool & Agent Notifications):**
  - Trust the qualification flag from Workflow 2; do not gate on `owner_id`.
  - Still broadcast notifications and leave `owner_id` untouched/NULL until claimed.
- **Scheduler (Workflow 5):**
  - Filter out `is_qualified = true` (or `qualification_status = 'qualified'`) so qualified leads do not receive further follow-ups.

## Frontend Updates
- **Lead Pool page:** Query leads that are marked qualified (via the enrollment join/flag) instead of `owner_id IS NULL`. Remove owner-null filtering logic.
- **Pipeline page:** Continue to show claimed leads (`owner_id = current user` or admin), unchanged.
- **Claim action:** Still sets `owner_id` for ownership; pool membership is controlled by qualification flag.

## Open Questions / Decisions Needed
- Choose storage shape for qualification:
  - Boolean `is_qualified` vs. status column.
  - Should qualification also be denormalized onto the `leads` table for simpler reads?
- Define the exact AI rule set that marks a lead as qualified (which tags/phrases/engagement types).
- Do we ever “unqualify” a lead, and what happens to pool visibility in that case?
