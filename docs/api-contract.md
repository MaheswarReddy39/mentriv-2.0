# Mentriv 2.0 — API Contract (Backend → React)

Base URL: `http://localhost:5000` · Prefix: `/api/v1`
Auth header for protected routes: `Authorization: Bearer <accessToken>`
Success shape: `{ "status": "success", "message"?: string, "data": {...} }`
Error shape: `{ "status": "error", "message": string, "errors"?: [{ field, msg }] }`

Pagination responses embed `data.pagination = { page, limit, totalItems, totalPages, hasNextPage }`.

## Auth — `/api/v1/auth`

| Method | Path | Auth | Body/Query | Success | Errors |
|---|---|---|---|---|---|
| POST | `/register` | public | `{name, email, password(8–72), phone?, education?, codingLevel?, goal?}` | 201 `data.user` (no token; role forced student) | 400 validation, 409 duplicate email |
| GET | `/verify-email?token=` | public | 64-hex token query | 200 `data.user.isEmailVerified=true` | 400 invalid/expired/used |
| POST | `/resend-activation` | public | `{email}` | always generic 200 (no existence leak) | 400 validation |
| POST | `/activate-account` | public | `{token(64-hex), password}` | 200 user with `accountActivated=true` | 400 invalid/expired/used |
| POST | `/forgot-password` | public | `{email}` | always generic 200 | 400 validation |
| POST | `/reset-password` | public | `{token, password}` | 200 safe user | 400 invalid/expired/used |
| POST | `/login` | public | `{email, password}` | 200 `data:{accessToken(Bearer), user}`; JWT payload = `{sub, role, tv, iat, exp}` only | 401 generic credentials; 403 unactivated/inactive |
| POST | `/logout` | **auth** | – | 200; invalidates ALL sessions (tokenVersion bump) | 401 |

Login policy: requires `isEmailVerified && accountActivated && status=active`.
Access-token contract for middleware: `tv` must equal the user's current `tokenVersion`.

## Users
No public user endpoints. `req.user` (id/name/email/role/flags) is attached by auth middleware. Password hashes / security fields are never returned anywhere.

## Courses — `/api/v1/courses`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/courses?page&limit(≤50)&category&level&search` | public | published only, newest first |
| GET | `/courses/:slug` | public | published only, else generic 404 |
| POST | `/courses` | admin/superAdmin | whitelisted fields, slug auto-normalized, status defaults draft, dup slug→409 |
| PATCH | `/courses/:id` | admin/superAdmin | partial update, runValidators, self-slug uniqueness |
| DELETE | `/courses/:id` | admin/superAdmin | soft archive (`status=archived`) |

## Classes/Lessons

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/courses/:courseId/classes` | auth (student needs approved/completed enrollment) | published-only for students, ordered module→order; admins see all statuses |
| GET | `/classes/:id` | same per-lesson gate | drafts/archived → 404 to students |
| POST | `/courses/:courseId/classes` | admin/superAdmin | status defaults draft |
| PATCH | `/classes/:id` | admin/superAdmin | courseId moves forbidden |
| DELETE | `/classes/:id` | admin/superAdmin | soft archive |

## Enrollments — `/api/v1/enrollments`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/` | auth | `{courseId}` only; published courses; status starts pending; one active per student+course (409 on dup) |
| GET | `/my?status&page&limit` | auth | own only + course summary |
| GET | `/:id` | auth | owner or admin; others → generic 404 |
| GET | `/` | admin/superAdmin | paginated; filters `status`, `courseId` |
| PATCH | `/:id/status` | admin/superAdmin | guarded transitions: pending→{approved,rejected,cancelled}; approved→{completed,cancelled} |

## Payments — `/api/v1/payments` (manual UPI flow)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/` | auth | `{enrollmentId(own,pending), transactionId?, screenshotUrl?(URL/path), currency?=INR, paymentMethod?=upi}`; amount derived server-side; client-set amount/status/verifiedBy rejected |
| GET | `/my` | auth | own payments, paginated, status filter |
| GET | `/:id` | owner or admin | |
| GET | `/` | admin/superAdmin | filters status/courseId/enrollmentId |
| PATCH | `/:id/status` | admin/superAdmin | `{status: verified|rejected, rejectionReason? (required ≥5 chars when rejected)}`; verify ⇒ atomic txn approving the enrollment; single-use |

## Assignments — `/api/v1/assignments`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/courses/:courseId/assignments` | enrolled student (published only) / admin all statuses | |
| GET | `/assignments/:id` | enrolled student / admin | drafts/archived hidden from students |
| POST | `/courses/:courseId/assignments` | admin/superAdmin | defaults draft/maxMarks 100 |
| PATCH | `/assignments/:id` · DELETE | admin/superAdmin | DELETE = soft archive |

## Submissions

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/assignments/:assignmentId/submissions` | enrolled student | `{submissionText?, attachments[] {title,url}}`; lateness server-derived; attemptNumber auto; one active attempt |
| GET | `/submissions/my` | auth | own, filters status/assignmentId |
| GET | `/submissions/:id` | owner or admin | includes text/attachments |
| GET | `/submissions` | admin/superAdmin | filters status/courseId/assignmentId/studentId |
| PATCH | `/submissions/:id/review` | admin/superAdmin | `{marks(≥0 ≤maxMarks), feedback?}` → reviewed + reviewer/timestamp; locked after review |

## MCQ Tests & Attempts

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/courses/:courseId/mcq-tests` | enrolled student / admin | student payload strips correctOption+explanation |
| GET | `/mcq-tests/:id` | same | |
| POST | `/courses/:courseId/mcq-tests` | admin/superAdmin | model rules enforced (≥2 options, unique, valid correctOption…) |
| PATCH | `/mcq-tests/:id` | admin/superAdmin | question edits blocked once attempts exist (409); courseId moves forbidden |
| DELETE | `/mcq-tests/:id` | admin/superAdmin | soft archive; attempts preserved |
| POST | `/mcq-tests/:id/attempts` | enrolled student | creates/resumes in_progress attempt; answers submitted later |
| POST | `/mcq-attempts/:id/submit` | owning student | `{answers:[{questionOrder, selectedOption(int|null)}]}`; everything else computed server-side; evaluated attempts locked |
| GET | `/mcq-attempts/my` | owning student | history incl. multiple attempts |
| GET | `/mcq-attempts/:id` | owner or admin | explanations included only after evaluation; raw correctOption never exposed |

## Course Progress — `/api/v1/courses/:courseId/progress`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/progress` | approved/completed student | own progress; zero-state auto-created; % recalculated vs current published items |
| POST | `/progress/lessons/:classId/complete` | same | idempotent |
| POST | `/progress/assignments/:assignmentId/complete` | same | requires a **reviewed submission** |
| POST | `/progress/mcq-tests/:mcqTestId/complete` | same | requires an **evaluated attempt** |

Formula: `overall% = completedItems ÷ publishedItems × 100` (published lessons+assignments+mcqs of that course).

## Notifications — `/api/v1/notifications` (all auth)

| Method | Path | Notes |
|---|---|---|
| GET | `/notifications?isRead&type&page&limit` | own only, newest first |
| GET | `/notifications/unread-count` | `{ unreadCount }` |
| PATCH | `/notifications/:id/read` | idempotent; body content changes rejected |
| PATCH | `/notifications/read-all` | `{ modifiedCount }`; self-only |

Created internally by business events (enrollment approve/reject, payment verify/reject, class/assignment publish, announcement publish). Always start unread.

## Announcements — `/api/v1/announcements`

| Method | Path | Auth | Visibility |
|---|---|---|---|
| GET | `/announcements?type&status&page&limit` | optionalAuth | anon: published+all · student: +students · admin: +admins (`status` mgmt filter admin-only) |
| GET | `/announcements/:id` | optionalAuth | same rules; drafts/archived → 404 for non-admins |
| POST | `/announcements` | admin/superAdmin | createdBy=req.user.id; defaults general/all/draft |
| PATCH | `/announcements/:id` | admin/superAdmin | draft→published sets publishedAt + fans out notifications once; published→draft rejected |
| DELETE | `/announcements/:id` | admin/superAdmin | soft archive |

## Health
- `GET /` and `GET /api/v1/` → `{status:'success', message:'Mentriv 2.0 server is running'}`

## Global error codes
400 validation/invalid input · 401 authentication/session · 403 forbidden/inactive/ineligible · 404 missing route/resource · 409 duplicates/conflicts/state conflicts · 500 sanitized internal error.
