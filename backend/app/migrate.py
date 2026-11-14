"""Run Alembic migrations from code, so a fresh database never lacks tables."""
import logging

from alembic import command
from alembic.config import Config

from app.config import BACKEND_DIR

log = logging.getLogger(__name__)


def upgrade_to_head() -> None:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))  # independent of the working directory
    command.upgrade(cfg, "head")
    log.info("Database is at the latest migration")
