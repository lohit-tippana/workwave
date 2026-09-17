# WorkWave — Interview Preparation Guide

## Project overview

WorkWave is an AI-assisted freelancer marketplace. Clients post jobs, receive proposals with AI match analysis, hire freelancers, manage milestones, and pay via Razorpay. Freelancers build profiles, upload resumes for ATS-style AI analysis, get job recommendations, submit proposals, deliver work, and receive reviews.

**Why it was built:** freelance marketplaces struggle with discovery (finding relevant jobs/freelancers), trust (payment + reviews), and process (structured hiring → delivery → payment). WorkWave demonstrates all three end-to-end.

## Technology choices

| Choice | Why |
|---|---|
| React | Component model, huge ecosystem, the market standard for SPA frontends |
| Vite | Instant dev server + fast builds vs. CRA/webpack; native ESM |
| TypeScript (frontend) | Catches contract drift between API and UI; self-documenting types |
| Node.js + Express | Same language across stack, huge middleware ecosystem, thin and explicit |
| MongoDB | Flexible schema for heterogeneous entities (jobs, resumes, analyses); JSON-native |
| Mongoose | Schema validation, indexes, refs/populate, transactions, middleware |
| JWT | Stateless auth — no session store needed, scales horizontally |
| bcrypt | Adaptive salted hashing; slow by design against brute force |
| Gemini | Free-tier LLM with JSON mode (`responseMimeType`), good for structured extraction |
| Razorpay | Hosted checkout (no PCI scope), HMAC signature verification |
| Cloudinary | Managed uploads + CDN + transformations; local-disk fallback keeps dev zero-config |
| Tailwind | Utility-first, consistent design system, fast iteration |

## Architecture

Monorepo: `frontend/` (React SPA) + `backend/` (Express API) + `docs/`. Backend is layered: **routes → middleware → controllers → services → models**. Controllers own request shaping and authorization; services own integrations (Gemini, Razorpay, Cloudinary/local storage) and cross-entity rules (messaging gate); models own schema + indexes.

## Authentication vs authorization

- **Authentication** = "who are you" — `protect` middleware verifies the JWT signature/expiry and loads the user.
- **Authorization** = "what may you do" — `restrictTo('client')` role gates plus **ownership checks** like `Job.findOne({_id, clientId: req.user._id})` which returns 404 for other people's resources.
- Demo of the difference: a logged-in freelancer is authenticated but gets 403 on `POST /jobs`; a client gets 404 editing another client's job.

## JWT

`jsonwebtoken.sign({id, role}, secret, {expiresIn: '7d'})` → stored in `localStorage`, sent as `Authorization: Bearer`. Trade-off discussed honestly: localStorage is XSS-exposed vs. httpOnly cookie's CSRF-exposure; mitigations are input sanitization + CSP (helmet) here.

## bcrypt

Passwords hashed with cost 10 (`bcrypt.hash`) — the salt is embedded in the hash, `compare()` recomputes on login. Plaintext is never stored or returned.

## AI integration

`aiService` is the only LLM touchpoint. Prompts demand JSON-only output; `responseMimeType: 'application/json'` constrains Gemini; `extractJson` + per-function `validate` enforce the shape. On missing key or API failure, a **documented deterministic fallback** runs (skill dictionary + section heuristics + overlap scoring) and results carry `provider: 'fallback'` so the UI labels them honestly.

**AI limitations we acknowledge in-app:** scores are labeled "AI-generated estimate for decision support"; the ATS score is explicitly *not* any real ATS's score; proposals are drafts the freelancer must edit; no private data (emails, passwords, payment info) is sent to the LLM.

## Payments

1. `POST /payments/order` — server creates a Razorpay order, stores `Payment{status: CREATED}`.
2. Razorpay hosted checkout runs in the browser (card data never touches us).
3. `POST /payments/verify` — server recomputes `HMAC_SHA256(order_id|payment_id, key_secret)` and compares via `crypto.timingSafeEqual`. Only on match → `SUCCESS`, milestone marked COMPLETED, notification sent.
4. Checkout dismissal/failure → `POST /payments/failed` records `FAILED`.

**Key point for interviews:** frontend payment status is *never* trusted — verification is cryptographic and server-side.

## Database design

15 collections: users, jobs, proposals, projects (milestones embedded), conversations, messages, reviews, payments, resumes, aianalyses, portfolioitems, notifications, bookmarks, reports, categories.

- **Embedded vs referenced:** milestones are embedded in projects (always read together, bounded size, single atomic update). Messages are a separate collection (unbounded growth, paginated by conversation).
- **Partial unique index** on proposals `{jobId, freelancerId}` where status ∈ active — prevents duplicate active proposals at the *database* level while still allowing re-application after withdrawal.

## Testing

Vitest + Supertest + `mongodb-memory-server` (replica set so transactions work). Covers auth, role/ownership authorization, job lifecycle, the full proposal→hire→project transaction, milestone lifecycle, review gating, payment signature accept/reject, AI fallback output, notifications, bookmarks, admin suspension. External services (Razorpay, Gemini, Cloudinary) are absent/mocked — tests never call paid APIs.

## Likely interview questions

**Q: How do you prevent a freelancer from calling client endpoints?**
JWT role claim → `restrictTo` middleware on every route + ownership-scoped queries. Role is never trusted from the request body.

**Q: What stops duplicate proposals?**
Two layers: an application check for a friendly 409, and a partial unique index so races still can't create two active proposals.

**Q: Why embed milestones but not messages?**
Milestones are bounded and always rendered inside the project — atomic updates, no joins. Messages are unbounded and paginated independently; embedding would hit the 16MB doc limit and make pagination painful.

**Q: How would you scale this?**
Stateless API + JWT → horizontal scaling; Socket.IO for realtime messaging; move AI calls to a queue; MongoDB read replicas + Redis cache for hot reads (job lists); Cloudinary already handles media scale.

**Q: What happens if Gemini is down?**
Every AI call wraps `callGemini` in try/catch and degrades to the local heuristic analyzer, labeled as fallback. The marketplace works fully without AI.

**Q: How is the payment safe from tampering?**
Client can't forge success — verification is `HMAC(order_id|payment_id)` with the secret key compared in constant time. A forged signature produces `VERIFICATION_FAILED`.

**Q: XSS/CSRF stance?**
React escapes output by default; helmet sets CSP-ish headers; JWT in Authorization header (not cookies) makes CSRF inapplicable; the XSS trade-off is mitigated by sanitization discipline and rate limits.

**Q: How do you handle file upload security?**
MIME whitelist + size caps in multer, memory-only storage (no executable writes to disk paths derived from user input), Cloudinary's own scanning/CDN when configured, and resumes' `extractedText` marked `select:false`.

**Q: Transactions — where and why?**
Hiring (`acceptProposal`) touches 4 entities: proposal status, competing proposals, job status, new project. A MongoDB session transaction makes it atomic — no half-hired states.
