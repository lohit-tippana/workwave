# WorkWave API Reference

Base URL: `/api` · All responses: `{ success: boolean, message: string, data?: any, details?: any }`.
Auth: `Authorization: Bearer <JWT>`.

## Auth

| Method | Path | Auth | Body / Notes |
|---|---|---|---|
| POST | `/auth/register` | — | `{name, email, password(8+), role: client\|freelancer}` → `{user, token}` |
| POST | `/auth/login` | — | `{email, password}` → `{user, token}` |
| GET | `/auth/me` | any | current user |
| POST | `/auth/forgot-password` | — | `{email}` → always 200; dev returns `{resetToken}` |
| POST | `/auth/reset-password` | — | `{token, password}` |

## Users & profiles

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/users/freelancers?q=&skill=&minRating=&maxRate=&availability=&page=&limit=` | public | directory |
| GET | `/users/freelancers/:id` | public | profile + portfolio + reviews |
| PUT | `/users/profile` | any | editable profile fields |
| POST | `/users/avatar` | any | multipart `image` |
| GET/POST | `/users/portfolio(/me)` | freelancer | portfolio CRUD + `POST /users/portfolio/:id/images` |

## Jobs

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/jobs?q=&category=&skill=&experienceLevel=&budgetType=&minBudget=&maxBudget=&deadlineBefore=&sort=&page=&limit=` | public | only `OPEN` + not removed |
| GET | `/jobs/mine?status=` | client | all own jobs |
| GET | `/jobs/:id` | optional auth | draft/closed visible to owner only |
| POST | `/jobs` | client | `{title,description(30+),category,budget,budgetType,requiredSkills[],experienceLevel,deadline,publish}` |
| PUT/DELETE | `/jobs/:id` | client (owner) | not editable when COMPLETED/CLOSED; not deletable when IN_PROGRESS |
| POST | `/jobs/:id/status` | client | `{action: publish\|unpublish\|close}` |
| POST | `/jobs/:id/analyze` | client | stores AI analysis on the job |
| POST | `/jobs/:id/attachments` | client | multipart `file` |

## Proposals

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/proposals` | freelancer | `{jobId, coverLetter(30+), proposedAmount, estimatedDays}` — attaches AI match snapshot; 409 on duplicate active |
| GET | `/proposals/mine?status=&page=` | freelancer | own proposals |
| GET | `/proposals/job/:jobId?status=` | client (owner) | proposals with freelancer profiles + AI match |
| GET | `/proposals/:id` | participants | |
| PUT | `/proposals/:id` | freelancer (owner) | only while PENDING/SHORTLISTED |
| POST | `/proposals/:id/withdraw` | freelancer (owner) | |
| POST | `/proposals/:id/status` | client | `{action: shortlist\|reject}` |
| POST | `/proposals/:id/accept` | client | transactional hire → creates project, rejects others |

## Projects & milestones

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/projects?status=&page=` | client/freelancer | own projects |
| GET | `/projects/:id` | participants | includes payment history |
| POST | `/projects/:id/milestones` | client | `{title, amount, description?, dueDate?}` |
| POST | `/projects/:id/milestones/:mid/start` | freelancer | PENDING → IN_PROGRESS |
| POST | `/projects/:id/milestones/:mid/submit` | freelancer | multipart `files[]` + `note` → SUBMITTED |
| POST | `/projects/:id/milestones/:mid/review` | client | `{action: approve\|request_revision, note?}` |
| POST | `/projects/:id/milestones/:mid/complete` | client | APPROVED → COMPLETED |
| PUT | `/projects/:id/progress` | freelancer | `{progress: 0-100}` |
| POST | `/projects/:id/complete` `/cancel` | client | |

## Messaging

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/messages/conversations` | any | `{otherUserId}` — 403 unless shortlist/hire relationship exists |
| GET | `/messages/conversations` | any | list + unread counts |
| GET/POST | `/messages/conversations/:id/messages` | participant | paginated history; GET marks read |

## Payments

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/payments/config` | public | `{enabled, keyId}` |
| POST | `/payments/order` | client | `{projectId, milestoneId?}` → Razorpay order + Payment(CREATED) |
| POST | `/payments/verify` | client | `{razorpayOrderId, razorpayPaymentId, razorpaySignature}` — HMAC verified server-side |
| POST | `/payments/failed` | client | records failed/cancelled checkout |
| GET | `/payments?page=` | any | own transactions (admin sees all via `/admin/payments`) |

## Resume & AI

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/resumes` | freelancer | multipart `resume` (PDF/DOCX ≤8MB); stores + extracts text |
| GET/DELETE | `/resumes/mine` | freelancer | owner only |
| POST | `/resumes/analyze` | freelancer | ATS-style analysis → `AIAnalysis` |
| GET | `/resumes/analysis/latest` | freelancer | |
| GET | `/ai/match/:jobId` | freelancer | match score, matched/missing skills, disclaimer |
| GET | `/ai/recommendations` | freelancer | jobs + reasons |
| POST | `/ai/proposal-draft` | freelancer | `{jobId}` → draft cover letter (never auto-submits) |
| POST | `/ai/analyze-description` | client | `{description}` |

## Reviews, notifications, misc

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/reviews` | participants | `{projectId, rating 1-5, text}` — COMPLETED projects only, once each direction |
| GET | `/reviews/user/:userId` | public | |
| GET | `/notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all` | any | |
| POST/GET | `/bookmarks/:jobId` / `/bookmarks` | freelancer | toggle + list |
| POST | `/reports` | any | `{targetType: job\|user\|proposal\|message, targetId, reason, description}` |
| GET | `/reports/mine` | any | |
| GET | `/categories` | public | |

## Admin (`role: admin`)

`GET /admin/stats` · `GET /admin/users?q=&role=&suspended=` · `POST /admin/users/:id/suspension {suspended}` · `GET /admin/jobs` · `POST /admin/jobs/:id/moderation {removed}` · `GET /admin/reports` · `POST /admin/reports/:id/resolve {status, resolutionNote}` · `GET /admin/payments` · `GET/POST /admin/categories` · `PUT/DELETE /admin/categories/:id`

## Error format

```json
{ "success": false, "message": "Validation failed", "details": [{ "field": "email", "message": "Valid email required" }] }
```

Status codes: 400 validation · 401 unauthenticated · 403 wrong role/owner · 404 missing · 409 conflict/duplicate · 429 rate limit · 503 external service not configured · 500 unexpected.
