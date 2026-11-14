# Applier

Chrome extension: open a job posting, get a tailored resume (PDF / DOCX / MD / TXT).
A job only counts as **applied** when you download the resume. First 10 applications are free.

Flow: Google sign-in -> source resume -> auto-detect job page (manual override) -> generate -> suggest edits -> download.

## Stack
- `backend/`: FastAPI, SQLAlchemy + Alembic, Postgres (integer IDs), DSPy (LiteLLM), JWT
- `extension/`: Manifest V3 side panel, Vite + React + Tailwind, Geist (bundled), black/white only

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
1 credit = 1 application (the first download of a tailored resume). Everyone gets `FREE_APPLICATIONS` (10) free;
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
- A scheduler in the API process wakes every 10 min and runs a campaign's batch in `UPDATE_EMAIL_SEND_HOUR` (UTC) once per day.
  Disable with `UPDATE_EMAIL_SCHEDULER=false` on extra workers.
- Each recipient is claimed in `update_email_sends` before sending (unique per campaign+user), so nobody gets it twice.
- Every email has a signed unsubscribe link plus `List-Unsubscribe` one-click headers. Set `PUBLIC_API_URL` to the public API origin.
