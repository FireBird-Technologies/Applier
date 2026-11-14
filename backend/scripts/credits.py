"""Look at or adjust a user's purchased credits. For refunds and support.

  python -m scripts.credits show user@example.com
  python -m scripts.credits add user@example.com 30       give credits (a goodwill gesture, a fix)
  python -m scripts.credits remove user@example.com 30    take back credits after refunding a purchase in Stripe

On the server:  docker exec applier-api python -m scripts.credits show user@example.com
"""
import argparse
import sys

from sqlalchemy import func, select

from app.database import SessionLocal
from app.models.user import User
from app.services.usage import get_usage


def summary(db, user: User) -> str:
    u = get_usage(db, user)
    return (f"{user.email}: {u.remaining} credits left "
            f"({u.used} used of {u.total}: {u.free_limit} free + {u.paid_credits} purchased)")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("show").add_argument("email")
    for name in ("add", "remove"):
        p = sub.add_parser(name)
        p.add_argument("email")
        p.add_argument("credits", type=int)
    a = ap.parse_args(argv)

    with SessionLocal() as db:
        user = db.scalar(select(User).where(func.lower(User.email) == a.email.strip().lower()))
        if user is None:
            print(f"No user with email {a.email}")
            return 1
        if a.cmd != "show":
            if a.credits <= 0:
                print("The number of credits must be positive")
                return 1
            if a.cmd == "remove" and a.credits > user.paid_credits:
                print(f"{user.email} has only {user.paid_credits} purchased credits, so {a.credits} cannot be removed")
                return 1
            user.paid_credits += a.credits if a.cmd == "add" else -a.credits
            db.commit()
            print(f"{'Added' if a.cmd == 'add' else 'Removed'} {a.credits} credits.")
        print(summary(db, user))
    return 0


if __name__ == "__main__":
    sys.exit(main())
