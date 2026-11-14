"""Edit history shared by tailored resumes and the user's source resume.

`owner` is any object with `.resume` (dict) and `.edits` (ordered list of edit rows with kind/instruction/resume);
`edit_cls` builds a new row. The first row is the starting version, so undo can never go past it.
"""
from app.schemas import TailoredResume


def describe(e) -> str:
    return e.instruction if e.kind == "ai" else "your manual edits"


def record(owner, edit_cls, kind: str, instruction: str = "") -> None:
    """Snapshot the resume as it is now. Anything without history yet gets a baseline of its previous state first."""
    if not owner.edits:
        owner.edits.append(edit_cls(kind="generate", resume=owner.resume))
    owner.edits.append(edit_cls(kind=kind, instruction=instruction, resume=owner.resume))


def history_text(owner) -> str:
    """Earlier requests, oldest first, for the reviser. Undone edits are gone, so they are never re-applied."""
    lines = []
    for e in owner.edits[1:][-20:]:
        lines.append(f"- {e.instruction}" if e.kind == "ai" else "- (the user edited the text by hand)")
    return "\n".join(lines)


def clean_resume(r: TailoredResume) -> TailoredResume:
    """Trim whitespace and drop empty list items/entries from a hand-edited resume."""
    def lines(xs): return [x.strip() for x in xs if x and x.strip()]
    r = r.model_copy(deep=True)
    r.name, r.headline, r.summary = r.name.strip(), r.headline.strip(), r.summary.strip()
    r.contact, r.skills, r.certifications = lines(r.contact), lines(r.skills), lines(r.certifications)
    for e in r.experience:
        e.bullets = lines(e.bullets)
    for p in r.projects:
        p.bullets = lines(p.bullets)
    for e in r.education:
        e.details = lines(e.details)
    r.experience = [e for e in r.experience if e.title.strip() or e.company.strip() or e.bullets]
    r.projects = [p for p in r.projects if p.name.strip() or p.bullets]
    r.education = [e for e in r.education if e.school.strip() or e.degree.strip()]
    return r
