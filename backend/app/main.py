import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.migrate import upgrade_to_head
from app.routers import applications, auth, billing, sources, unsubscribe
from app.services.updates import scheduler_loop

logging.basicConfig(level=logging.INFO)
if settings.RESEND_API_KEY and "example.com" in settings.EMAIL_FROM:
    logging.getLogger(__name__).warning(
        "EMAIL_FROM (%s) uses example.com, which Resend rejects. Set it to an address on a verified domain.", settings.EMAIL_FROM
    )


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.auto_migrate:
        await asyncio.to_thread(upgrade_to_head)
    task = asyncio.create_task(scheduler_loop()) if settings.UPDATE_EMAIL_SCHEDULER else None
    yield
    if task:
        task.cancel()


app = FastAPI(title="Applier API", lifespan=lifespan)

# The extension authenticates with a Bearer token (no cookies), so a broad origin match is safe.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"chrome-extension://.*|http://localhost:\d+",
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Applications-Remaining", "Content-Disposition"],
)

app.include_router(auth.router)
app.include_router(sources.router)
app.include_router(applications.router)
app.include_router(billing.router)
app.include_router(unsubscribe.router)


@app.get("/api/health")
def health():
    return {"ok": True, "env": settings.ENVIRONMENT, "model": settings.LLM_MODEL}
