# WorkWave — AI-Powered Freelancer Marketplace

WorkWave is a full-stack freelance marketplace where **clients** post projects and hire **freelancers**, while freelancers build profiles, upload resumes for AI analysis, discover jobs through AI recommendations, submit proposals, deliver milestones, and get paid through Razorpay.

## Features

| Area | What works |
|---|---|
| Auth | Register, login, logout, forgot/reset password (JWT + bcrypt, role-aware) |
| Roles | Client / Freelancer / Admin with server-side authorization + ownership checks |
| Jobs | Create/edit/delete, publish/unpublish/close, attachments, AI description analysis |
| Proposals | Submit, edit, withdraw, shortlist, reject, accept (auto-creates project) |
| Projects | Milestones, submissions, revisions, progress, completion |
| AI | Resume analysis (ATS-style), skill extraction, job matching, recommendations, proposal drafts — Gemini with a documented local heuristic fallback |
| Messaging | Conversations gated by workflow (shortlist/hire), unread counts, history |
| Payments | Razorpay orders + server-side HMAC signature verification |
| Reviews | Two-sided reviews after project completion, aggregate ratings |
| Storage | Cloudinary when configured, local disk fallback for dev |
| Admin | Stats, user suspension, job moderation, reports, categories, transactions |
| Platform | Search, filters, pagination, notifications, bookmarks, reporting |

## Tech stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router, Axios, Lucide icons
- **Backend:** Node.js, Express, Mongoose, JWT, bcryptjs, express-validator, helmet, rate limiting, multer
- **DB:** MongoDB (auto-falls back to an in-memory replica set for local dev/tests)
- **AI:** Google Gemini (`@google/generative-ai`) → deterministic heuristic fallback
- **Payments:** Razorpay orders + signature verification
- **Storage:** Cloudinary → local disk fallback
- **Tests:** Vitest + Supertest + mongodb-memory-server

## Project structure

```
workwave/
├── frontend/          # React + Vite + TS + Tailwind
│   └── src/
│       ├── components/    # reusable UI (badges, modals, pagination…)
│       ├── context/       # AuthContext
│       ├── layouts/       # AppLayout (sidebar + notifications)
│       ├── pages/         # public / auth / client / freelancer / admin / shared
│       ├── services/      # axios instance
│       └── types/         # shared TS types
├── backend/
│   └── src/
│       ├── config/        # env, mongo, external services
│       ├── controllers/   # request handlers
│       ├── middleware/    # auth, errors, upload, validation
│       ├── models/        # 15 Mongoose schemas
│       ├── routes/        # REST route definitions
│       ├── services/      # aiService, paymentService, storageService, …
│       ├── seed/          # demo data
│       ├── app.js / server.js
│   └── tests/             # vitest + supertest suite
├── docs/                # architecture.md, interview-preparation.md, api.md
├── docker-compose.yml
└── .env.example
```

## Quick start

### Prerequisites
- Node.js 18+ (MongoDB optional — an in-memory instance is used if `MONGO_URI` is empty)

### Backend
```bash
cd backend
cp ../.env.example .env    # or copy values manually
npm install
npm run seed               # demo data (optional but recommended)
npm run dev                # http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                # http://localhost:5173 (proxies /api → :5000)
```

### Demo credentials (after `npm run seed`)
| Role | Email | Password |
|---|---|---|
| Admin | admin@workwave.dev | Admin@12345 |
| Client | client@workwave.dev | Client@12345 |
| Freelancer | freelancer@workwave.dev | Freelance@12345 |

## Environment variables

See `.env.example`. Everything works locally with **zero** external keys:

| Variable | If unset |
|---|---|
| `MONGO_URI` | In-memory MongoDB replica set starts automatically (ephemeral) |
| `GEMINI_API_KEY` | Deterministic local analyzer is used, results labeled `provider: fallback` |
| `RAZORPAY_KEY_ID`/`SECRET` | Payment endpoints return 503 with a clear message |
| `CLOUDINARY_*` | Files are stored under `backend/uploads/` and served statically |
| `JWT_SECRET` | Dev default used (set a real secret in production) |

## Testing

```bash
cd backend && npm test     # API + workflow + security tests
cd frontend && npm test    # component tests
```

## Docker

```bash
docker compose up --build
# frontend: http://localhost:5173, api: http://localhost:5000, mongo: internal
```

## Deploy (Render)

The repo includes `render.yaml` — a one-service blueprint (the API serves the built React app, so `/api` stays same-origin).

1. Push the repo to GitHub (done: `git push -u origin main`).
2. On [Render](https://dashboard.render.com) → **New → Blueprint** → connect this repo → **Apply**.
3. When prompted, set `MONGO_URI` to a MongoDB Atlas connection string (free M0 cluster).
   - Skip it for a zero-config demo: the app falls back to an ephemeral in-memory DB with seeded demo data.
4. Optionally set `GEMINI_API_KEY`, `RAZORPAY_*`, `CLOUDINARY_*` — every feature degrades cleanly without them.
5. Deploy → your app is live at `https://workwave.onrender.com`.

## API overview

Consistent envelope: `{ success, message, data }` — errors: `{ success:false, message, details? }`.

- `POST /api/auth/register|login|forgot-password|reset-password`, `GET /api/auth/me`
- `GET/POST /api/jobs`, `GET/PUT/DELETE /api/jobs/:id`, `POST /api/jobs/:id/status|analyze|attachments`
- `POST /api/proposals`, `GET /api/proposals/mine|job/:jobId`, `PUT /:id`, `POST /:id/withdraw|status|accept`
- `GET /api/projects`, `GET /api/projects/:id`, milestones: `POST /:id/milestones`, `/start`, `/submit`, `/review`, `/complete`, `POST /:id/complete|cancel`
- `POST/GET /api/messages/conversations`, `GET/POST .../messages`
- `POST /api/payments/order`, `POST /api/payments/verify`, `POST /api/payments/failed`, `GET /api/payments`
- `POST/GET/DELETE /api/resumes`, `POST /api/resumes/analyze`
- `GET /api/ai/match/:jobId`, `GET /api/ai/recommendations`, `POST /api/ai/proposal-draft`, `POST /api/ai/analyze-description`
- `GET/POST /api/reviews`, `GET /api/notifications`, `POST /api/bookmarks/:jobId`, `POST /api/reports`
- `GET /api/admin/stats|users|jobs|reports|payments|categories` (+ mutations)

Full details in [docs/api.md](docs/api.md).

## Documentation

- [docs/architecture.md](docs/architecture.md) — system design, data flow, indexing, security
- [docs/interview-preparation.md](docs/interview-preparation.md) — technical deep-dive + Q&A
- [docs/api.md](docs/api.md) — endpoint reference

## AI usage principle

AI is used where it genuinely helps (resume analysis, matching, recommendations, drafting). Everything else — auth, jobs, proposals, projects, payments, messaging, reviews — is deterministic software. AI outputs are labeled as decision-support estimates and never make hiring decisions.

## Known limitations / future improvements

- Real-time messaging currently uses REST + polling; Socket.IO would add live delivery.
- Password reset returns the token in dev mode only — wire an email provider for production.
- Payments are INR-denominated per Razorpay; multi-currency would need Stripe/PayPal.
- AI fallback is keyword-based; Gemini gives semantic matching when configured.
- File virus scanning, escrow-style fund holding, and admin audit logs are future work.
