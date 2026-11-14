import os

# The existing API tests build users and tokens directly and send no browser id; the device rules have their own tests.
os.environ.setdefault("REQUIRE_DEVICE_ID", "false")

import pytest


@pytest.fixture(autouse=True)
def _no_real_resume_parsing(monkeypatch):
    """Uploading a resume now parses it in the background. Keep that off the network in every test; tests that care
    about parsing install their own stub, which takes precedence over this one."""
    from app.schemas import TailoredResume
    import app.routers.sources as sources

    monkeypatch.setattr(sources, "parse_resume", lambda text: TailoredResume(name="Parsed"))
