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
.venv/Scripts/alembic upgrade head
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

## Usage and billing
Quota = count of applications with status `applied`. Stripe is not wired yet: after the free limit the API
returns 402. Planned: $0.10 per application, $3 minimum charge (`PRICE_PER_APPLICATION_USD`, `MINIMUM_CHARGE_USD`).

## Job-page detector
`DETECTOR=auto|jev|llm`. With `TYPESAFE_API_KEY` set, Jev (TypeSafe) answers "is this a single job posting?" and a
small DSPy call then extracts role/company. Pages with `JobPosting` JSON-LD skip classification entirely. If Jev errors,
the request falls back to the DSPy LLM detector.

## Testing the extension
1. Backend: `uvicorn app.main:app --reload`, then check http://localhost:8000/api/health (shows the active model).
2. `cd extension && npm run dev` (rebuilds on save). In `chrome://extensions` enable Developer mode -> Load unpacked -> `extension/dist`.
   After a rebuild, click the reload icon on the extension card, then reopen the side panel.
3. Click the toolbar icon to open the side panel. Walk the flow: sign in -> add resume -> open a job page -> generate -> edit -> download.
4. Debug: right-click the side panel -> Inspect (UI + network). Backend logs show LLM/Jev errors.
Without Google OAuth set up yet, mint a dev token (`python -c "from app.auth import create_access_token as t; print(t(1))"`
after inserting a user) and paste it via the side panel's console:
`chrome.storage.local.set({applier_token: "<jwt>"})`, then reopen the panel.
