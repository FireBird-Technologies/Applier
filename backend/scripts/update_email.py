"""Manage product update email campaigns.

  python -m scripts.update_email create --subject "What's new" --body-file body.txt --filter all
  python -m scripts.update_email list
  python -m scripts.update_email preview <id>        # audience size, no sending
  python -m scripts.update_email send-now <id>       # run one batch immediately (ignores send hour)
  python -m scripts.update_email cancel <id>
"""
import argparse
import sys

from sqlalchemy import func, select

from app.database import SessionLocal
from app.models.update_email import UpdateEmail
from app.services.updates import FILTERS, eligible_users, run_batch


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("create")
    c.add_argument("--subject", required=True)
    c.add_argument("--body-file", required=True)
    c.add_argument("--filter", choices=FILTERS, default="all")
    c.add_argument("--batch-size", type=int, default=50, help="recipients per daily run")
    c.add_argument("--send-hour", type=int, default=-1, help="UTC hour 0-23; -1 = UPDATE_EMAIL_SEND_HOUR")
    sub.add_parser("list")
    for name in ("preview", "send-now", "cancel"):
        sub.add_parser(name).add_argument("id", type=int)
    a = ap.parse_args()

    with SessionLocal() as db:
        if a.cmd == "create":
            body = open(a.body_file, encoding="utf-8").read().strip()
            if not body:
                return print("body file is empty") or 1
            e = UpdateEmail(subject=a.subject, body=body, user_filter=a.filter,
                            batch_size=a.batch_size, send_hour=a.send_hour)
            db.add(e)
            db.commit()
            n = db.scalar(select(func.count()).select_from(eligible_users(e.user_filter).subquery()))
            print(f"created campaign {e.id}: {n} eligible users, {a.batch_size}/day")
        elif a.cmd == "list":
            for e in db.scalars(select(UpdateEmail).order_by(UpdateEmail.id)):
                print(f"{e.id:>4} {e.status:<10} {e.user_filter:<10} sent={e.sent_count} failed={e.failed_count}/"
                      f"{e.total_users}  {e.subject}")
        else:
            e = db.get(UpdateEmail, a.id)
            if e is None:
                return print("no such campaign") or 1
            if a.cmd == "preview":
                n = db.scalar(select(func.count()).select_from(eligible_users(e.user_filter).subquery()))
                print(f"{e.subject!r}: {n} eligible users ({e.user_filter}), status={e.status}")
            elif a.cmd == "send-now":
                print(f"attempted {run_batch(db, e.id)} emails")
            elif a.cmd == "cancel":
                e.status = "completed"
                db.commit()
                print("cancelled")
    return 0


if __name__ == "__main__":
    sys.exit(main())
