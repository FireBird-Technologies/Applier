import os

# The existing API tests build users and tokens directly and send no browser id; the device rules have their own tests.
os.environ.setdefault("REQUIRE_DEVICE_ID", "false")
