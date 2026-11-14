# Development and deployment

Everything you need to run, change and deploy Applier. For what the product does, see the [README](../README.md).

Flow: Google sign-in -> source resume -> auto-detect job page (manual override) -> generate (1 credit) -> edit as much as you like -> download.

## Stack
- `backend/`: FastAPI, SQLAlchemy + Alembic, Postgres (integer IDs), DSPy (LiteLLM), JWT
- `extension/`: Manifest V3 side panel, Vite + React + Tailwind, Geist (bundled), black/white only

## Database: SQLite locally, Postgres in production
Same code, same migrations. Set `DATABASE_URL` in `backend/.env`:
- Local: `sqlite:///./dev.db` (no server). The path resolves inside `backend/` wherever you start uvicorn from.
- Production: `postgresql+psycopg2://user:pass@host/db` (`postgres://` and `postgresql://` URLs from hosts also work).
- Migrations run automatically on startup for SQLite. For Postgres run `python -m alembic upgrade head` when you deploy
  (the deploy container does this for you).
- Check what Postgres will get without a server: `DATABASE_URL=postgresql://u:p@h/db python -m alembic upgrade head --sql`.

## Run the backend
```bash
docker compose up -d db
cd backend && python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
cp .env.example .env            # fill GOOGLE_CLIENT_ID and LLM_API_KEY
.venv/Scripts/python -m alembic upgrade head
.venv/Scripts/uvicorn app.main:app --reload
.venv/Scripts/pytest tests      # runs on SQLite with a stubbed LLM
```

## Change the AI (env only)
`LLM_MODEL` is any LiteLLM string; set `LLM_API_KEY` / `LLM_API_BASE` to match.
`anthropic/claude-sonnet-5-5`, `openai/gpt-4.1`, `openrouter/deepseek/deepseek-chat`, `ollama_chat/llama3.1`...
`DETECT_LLM_*` optionally points job-page detection at a cheaper model.

## Build the extension
```bash
cd extension && cp .env.example .env   # VITE_API_URL, VITE_GOOGLE_CLIENT_ID
npm install && npm run build           # then chrome://extensions -> Load unpacked -> extension/dist
```
Google setup: create a **Web application** OAuth client and add
`https://<EXTENSION_ID>.chromiumapp.org/` as a redirect URI (the ID is shown on chrome://extensions).
Add a `key` to `public/manifest.json` so the ID stays stable across machines. Use the same client ID in both `.env` files.

## Credits and billing (Stripe)
1 credit = 1 generated resume. The credit is spent when generation succeeds (and given back if the AI fails); edits, undo and downloads after that are free and unlimited. Everyone gets `FREE_APPLICATIONS` (10) free;
purchased credits add to that. Pricing: `PRICE_PER_APPLICATION_USD` ($0.10 each), `MINIMUM_CHARGE_USD` ($3 = 30 credits minimum).
The extension shows a meter: "moderate" once 50% is used, "low, upgrade now" at 20% left, then "out of credits".

How checkout works: **Buy credits** -> backend creates a Stripe Checkout Session -> the extension opens Stripe's hosted page in a
new browser tab -> after paying, Stripe redirects to `/billing/success` (and sends a signed webhook) -> credits are added
(once, idempotently) and the panel updates by itself.

Local setup (test mode):
1. `STRIPE_SECRET_KEY=sk_test_...` in `backend/.env` (dashboard.stripe.com/test/apikeys). `PUBLIC_API_URL` must be reachable by your browser.
2. Optional, for the webhook: `stripe listen --forward-to localhost:8000/api/billing/webhook`, then put the printed `whsec_...` in `STRIPE_WEBHOOK_SECRET`.
   Without it the success-page redirect still credits the account.
3. Pay with test card `4242 4242 4242 4242`, any future date, any CVC.
Production: add the webhook endpoint `https://<api>/api/billing/webhook` for `checkout.session.completed`.

## Email (Resend)
Set `RESEND_API_KEY` and `EMAIL_FROM` (domain verified in Resend). Without a key emails are logged and skipped.
Transactional: welcome on first sign-in, and "free applications used up".

## Product update emails
Same design as blog2video / NotestackAI: a campaign is drip-sent in daily batches during its send hour.
```bash
cd backend
python -m scripts.update_email create --subject "What's new" --body-file body.txt --filter all --batch-size 50
python -m scripts.update_email preview 1     # audience size, nothing sent
python -m scripts.update_email send-now 1    # run one batch now
python -m scripts.update_email list | cancel <id>
```
- Filters: `all`, `active` (>=1 applied), `inactive` (0), `exhausted` (used all free applications).
- A scheduler in the API process wakes every 10 min and runs a campaign's batch at 09:00 UTC (a fixed default, `UPDATE_EMAIL_SEND_HOUR`) once per day.
  Run a single API process (the Docker setup does), or the scheduler would run in each one.
- Each recipient is claimed in `update_email_sends` before sending (unique per campaign+user), so nobody gets it twice.
- Every email has a signed unsubscribe link plus `List-Unsubscribe` one-click headers. Set `PUBLIC_API_URL` to the public API origin.

## Anti-abuse: one browser, one account
Each extension install creates a random browser ID (kept in local and Chrome-sync storage) and sends it as `X-Device-Id`.
The server stores only a keyed hash. The first account to sign in on a browser owns it; a second Google account on the same
browser is refused before it is created, so it gets no free credits. One account can use several browsers.
The rule is always on (`REQUIRE_DEVICE_ID`, a fixed default in `app/config.py`). Limits: someone who reinstalls with sync off, or uses another Chrome profile, gets a new ID.
Add an IP or phone check if that becomes a problem.

## Promo codes and pricing
Promo codes use Stripe's own box on the checkout page. Create them in the Stripe dashboard (Coupons, then a promotion code).
The promo-code box is always shown (`STRIPE_ALLOW_PROMO_CODES`, a fixed default). A 100%-off code still grants the credits.
Three numbers are adjustable in `.env`: `FREE_APPLICATIONS`, `PRICE_PER_APPLICATION_USD` and `MINIMUM_CHARGE_USD`. The pack sizes
(50/100/250/500) and the largest purchase (2000) are fixed defaults in `backend/app/config.py`. The extension gets all of them with
the user's usage and the website reads the public `GET /api/pricing` (set `API_URL` in `web/.env.local`; pages refresh every
5 minutes). Restart the API after changing `.env`.

## Settings: what goes in `.env`
`backend/app/config.py` has three labelled groups. **Required** (secrets and deployment values) and **adjustable** (pricing, AI
models, email sender) are the only ones in `deploy/backend.env.production.example`. Everything else is a fixed default in
`config.py`. The API refuses to start on Postgres without a real `JWT_SECRET`, and logs a warning for each other missing required
setting.

## Editing resumes
The pencil icon (tailored resume) and the eye icon (source resume) open a full-tab editor with Edit and Preview tabs.
Sections can be removed, moved up or down and added back; entries inside a section can be moved too. Every AI or manual edit is
undoable, and the AI is told your earlier requests so it does not undo them. The source resume is read into sections by the AI in the
background right after you upload it, so the eye icon opens instantly (if the background step failed, or you open it
mid-parse, it is done or awaited on demand). Edits are written back to the text that tailoring uses.

## Website (Next.js)
`web/` is the marketing site: home, pricing, FAQ, blog, privacy and terms, in the same black-and-white Geist style.
```bash
cd web && cp .env.example .env.local   # NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_CHROME_STORE_URL, NEXT_PUBLIC_SUPPORT_EMAIL
npm install && npm run dev             # http://localhost:3000
npm run build && npm start             # production
```
Copy lives in `web/lib` (`site.ts` pricing and links, `faq.ts`, `posts.ts`). Until `NEXT_PUBLIC_CHROME_STORE_URL` is set,
"Add to Chrome" points at the install steps in the FAQ. Keep the pricing constants in `site.ts` in sync with the backend settings.
