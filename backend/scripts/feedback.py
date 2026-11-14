"""See how generated resumes are rated.

  python -m scripts.feedback               totals, plus the most recent thumbs-down to review
  python -m scripts.feedback --limit 50    show more thumbs-down
"""
import argparse

from sqlalchemy import func, select

from app.database import SessionLocal
from app.models.application import Application, ApplicationStatus


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--limit", type=int, default=15)
    a = ap.parse_args()
    with SessionLocal() as db:
        done = Application.status != ApplicationStatus.GENERATING.value
        total = db.scalar(select(func.count(Application.id)).where(done)) or 0
        up = db.scalar(select(func.count(Application.id)).where(Application.feedback == "up")) or 0
        down = db.scalar(select(func.count(Application.id)).where(Application.feedback == "down")) or 0
        rated = up + down
        print(f"generated: {total}   rated: {rated}   thumbs up: {up}   thumbs down: {down}")
        if rated:
            print(f"approval among rated: {100 * up / rated:.0f}%")
        rows = db.scalars(
            select(Application).where(Application.feedback == "down").order_by(Application.feedback_at.desc()).limit(a.limit)
        ).all()
        if rows:
            print("\nmost recent thumbs-down:")
        for r in rows:
            print(f"  #{r.id}  {r.feedback_at:%Y-%m-%d}  {r.job_title or '(no title)'} at {r.company or '(no company)'}  {r.job_url}")


if __name__ == "__main__":
    main()
