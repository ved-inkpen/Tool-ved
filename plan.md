# plan.md

## 1) Objectives
- Deliver an MVP “Marketing Studio Tool” that centralizes Ad Set → Ad workflow across internal teams + multiple external agencies.
- Enforce role-based access + multi-agency isolation (Agency A cannot see Agency B).
- Support both paths: **Script-only** (script review required) and **Media-ready** (skip script review → final review).
- Provide local media upload (reference + video), version history, review comments, approvals, and **in-app notifications**.
- Dark mode-first UI with fast role dashboards and clear status tracking.

## 2) Implementation Steps (Phases)

### Phase 1 — Core Workflow POC (minimal but real)
> Goal: Prove the hardest part works end-to-end: **status transitions + role scoping + file upload + review loops + notifications**.
- Backend-only POC (FastAPI + MongoDB + local uploads) with seed script:
  - Collections: users, agencies, ad_sets, ads, ad_reviews, ad_versions, notifications.
  - Minimal RBAC middleware + agency scoping rules.
  - Status transition validator for Ad + Ad Set.
  - Local file upload endpoint (reference_media + video) + static serving.
- POC API flow test (script):
  - Create agency + users for each role.
  - Creator creates Ad Set (script-only) with 2 ads + reference media.
  - Script reviewer approves 1, rejects 1 (comments) → verify creator sees comments.
  - Script reviewer assigns approved ad(s) to Agency Admin.
  - Agency Admin assigns to Editor.
  - Editor uploads video v1, submits → Final reviewer rejects with comments.
  - Editor uploads video v2 → Final reviewer approves → downloadable payload.
  - Verify notifications created for each handoff.
- Fix until POC is reliable (no invalid transitions, correct scoping, files retrievable).

**Phase 1 user stories**
1. As an admin, I can create agencies and invite users with roles so teams are onboarded.
2. As a creator, I can create an ad set with multiple ads and attach reference media.
3. As a reviewer, I can approve/reject scripts with comments and move work forward.
4. As an agency admin, I only see ad sets assigned to my agency and can assign editors.
5. As an editor/final reviewer, I can upload video versions, submit, reject, and approve with traceability.

---

### Phase 2 — V1 App Development (full-stack MVP)
> Build the app around the proven core; keep scope tight but usable by all roles.
- Frontend (React + Tailwind + shadcn/ui) with dark studio theme:
  - App shell: role-based sidebar, top bar with notification bell + unread count.
  - Status pills, glass panels, responsive cards/tables.
- Backend: harden POC APIs + pagination/filtering + consistent error format.
- V1 screens by role:
  - **Admin**: Agencies CRUD, user invites (create token, resend, deactivate).
  - **Creator**: My Ad Sets, create Ad Set (script-only / media-ready), edit drafts, view review comments.
  - **Script Reviewer**: Script review queue, per-ad approve/reject, assign to agency.
  - **Agency Admin**: Assigned Ad Sets, bulk assign set or per-ad assign to editor (within agency).
  - **Editor**: My assigned ads, brief view, upload video, version list, submit to final review.
  - **Final Reviewer**: Final review queue, media playback, approve/reject with comments.
  - **Approved/Download**: downloadable assets list (video + headline + primary text).
- Notifications:
  - Notification center + mark read + deep links to the relevant Ad/Ad Set.
- Conclude Phase 2 with 1 full e2e run using testing_agent_v3.

**Phase 2 user stories**
1. As a creator, I can create a **media-ready** ad set that skips script review and goes straight to final review.
2. As a script reviewer, I can assign approved work to a specific agency and notify them automatically.
3. As an agency admin, I can assign editors per-ad and track what’s still unassigned.
4. As an editor, I can upload a new version after rejection and see version history.
5. As a final reviewer, I can approve an ad and it immediately appears in an “Approved & Downloadable” list.

---

### Phase 3 — Auth + Productionizing (invite-based, RBAC complete)
> Add confirmed auth approach (email/password + invite flow) after V1 core UX works.
- Auth implementation:
  - Admin creates invite token with role + optional agency_id.
  - User signs up via invite link (set password) → JWT login.
  - Admin can deactivate/reactivate users.
- Security + guardrails:
  - Strict RBAC per endpoint.
  - Enforce agency isolation on every query/mutation.
  - File access scoped (only authorized users can fetch).
- Quality improvements:
  - Better filters (status, agency, assignee), optimistic UI for status changes.
  - Audit trail via ad_reviews + event log where needed.
- Conclude Phase 3 with testing_agent_v3 covering all 13 user stories.

**Phase 3 user stories**
1. As an admin, I can invite a new agency editor and they can onboard via token and set a password.
2. As an agency admin, I cannot access other agencies’ ad sets even if I guess an ID.
3. As a creator, I can only edit drafts/rejected items and cannot modify approved assets.
4. As any user, I get in-app notifications when work enters my queue.
5. As an admin, I can deactivate a user and they can no longer log in or access resources.

---

### Phase 4 — Stabilization + UX polish (post-MVP)
- Bulk actions (bulk assign, bulk approve) where safe.
- Improved media UX: better player, download buttons, copy headline/primary text.
- Performance: indexing, lean list endpoints, caching static files.
- Accessibility + keyboard navigation for review queues.
- Conclude Phase 4 with testing_agent_v3 regression pass.

**Phase 4 user stories**
1. As a script reviewer, I can filter my queue by “needs review” and “rejected”.
2. As an agency admin, I can bulk assign a whole ad set to an editor.
3. As a final reviewer, I can review video + brief side-by-side quickly.
4. As a creator, I can duplicate an ad set to iterate on a new batch.
5. As an admin, I can export a CSV of approved assets metadata.

## 3) Next Actions
1. Confirm tech stack assumptions (FastAPI + MongoDB + React) and repo structure.
2. Implement Phase 1 POC backend endpoints + seed/test script.
3. Validate POC status transitions + scoping + file upload/download locally.
4. Start Phase 2 UI build (dashboards + navigation + queues) against stable APIs.

## 4) Success Criteria
- All 13 required user stories pass end-to-end with testing_agent_v3.
- Multi-agency isolation is enforced at API level (no cross-agency reads/writes).
- Script-only and media-ready paths both reach “Approved & Downloadable” correctly.
- Rejection loops work with comments + version history.
- In-app notifications reliably appear on every handoff and deep-link to work items.
- Local uploads work for reference media + final videos and are playable/downloadable in-app.
