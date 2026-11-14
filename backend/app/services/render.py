"""Render a TailoredResume to pdf / docx / md / txt."""
from io import BytesIO
from xml.sax.saxutils import escape

from docx import Document
from docx.shared import Pt
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import HRFlowable, ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer

from app.schemas import TailoredResume

FORMATS = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "md": "text/markdown; charset=utf-8",
    "txt": "text/plain; charset=utf-8",
}


def _dates(a: str, b: str) -> str:
    return " - ".join(x for x in (a, b) if x)


def _sections(r: TailoredResume):
    """Yield (heading, entries); an entry is a plain str or (title, sub_line, bullets)."""
    if r.summary:
        yield "Summary", [r.summary]
    if r.skills:
        yield "Skills", [", ".join(r.skills)]
    if r.experience:
        yield "Experience", [
            (
                " - ".join(x for x in (e.title, e.company) if x),
                " | ".join(x for x in (e.location, _dates(e.start, e.end)) if x),
                e.bullets,
            )
            for e in r.experience
        ]
    if r.projects:
        yield "Projects", [(p.name, "", p.bullets) for p in r.projects]
    if r.education:
        yield "Education", [
            (" - ".join(x for x in (e.degree, e.school) if x), e.dates, e.details) for e in r.education
        ]
    if r.certifications:
        yield "Certifications", [(c, "", []) for c in r.certifications]


def to_markdown(r: TailoredResume) -> str:
    out = [f"# {r.name}"]
    if r.headline:
        out.append(f"**{r.headline}**")
    if r.contact:
        out.append(" | ".join(r.contact))
    for heading, entries in _sections(r):
        out.append(f"\n## {heading}")
        for e in entries:
            if isinstance(e, str):
                out.append(e)
                continue
            title, sub, bullets = e
            out.append(f"\n**{title}**" + (f"  \n*{sub}*" if sub else ""))
            out.extend(f"- {b}" for b in bullets)
    return "\n".join(out).strip() + "\n"


def to_text(r: TailoredResume) -> str:
    out = [r.name.upper()]
    if r.headline:
        out.append(r.headline)
    if r.contact:
        out.append(" | ".join(r.contact))
    for heading, entries in _sections(r):
        out.append(f"\n{heading.upper()}\n" + "-" * len(heading))
        for e in entries:
            if isinstance(e, str):
                out.append(e)
                continue
            title, sub, bullets = e
            out.append(title + (f" ({sub})" if sub else ""))
            out.extend(f"  * {b}" for b in bullets)
            out.append("")
    return "\n".join(out).strip() + "\n"


def to_docx(r: TailoredResume) -> bytes:
    doc = Document()
    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(10.5)
    for s in doc.sections:
        s.left_margin = s.right_margin = Pt(54)
        s.top_margin = s.bottom_margin = Pt(46)

    run = doc.add_paragraph().add_run(r.name)
    run.bold = True
    run.font.size = Pt(20)
    if r.headline:
        doc.add_paragraph(r.headline)
    if r.contact:
        doc.add_paragraph(" | ".join(r.contact))
    for heading, entries in _sections(r):
        hr = doc.add_paragraph().add_run(heading.upper())
        hr.bold = True
        hr.font.size = Pt(11)
        for e in entries:
            if isinstance(e, str):
                doc.add_paragraph(e)
                continue
            title, sub, bullets = e
            p = doc.add_paragraph()
            p.add_run(title).bold = True
            if sub:
                p.add_run(f"   {sub}").italic = True
            for b in bullets:
                doc.add_paragraph(b, style="List Bullet")
    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()


def _pdf_safe(s: str) -> str:
    # Built-in PDF fonts are WinAnsi; degrade unsupported glyphs instead of crashing.
    return escape(s.encode("cp1252", "replace").decode("cp1252"))


def to_pdf(r: TailoredResume) -> bytes:
    base = ParagraphStyle("b", fontName="Helvetica", fontSize=9.5, leading=12.5)
    name = ParagraphStyle("n", parent=base, fontName="Helvetica-Bold", fontSize=20, leading=24)
    head = ParagraphStyle("h", parent=base, fontName="Helvetica-Bold", fontSize=10.5, spaceBefore=9, spaceAfter=2)
    bold = ParagraphStyle("t", parent=base, fontName="Helvetica-Bold", spaceBefore=4)
    muted = ParagraphStyle("m", parent=base, textColor="#555555")

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=LETTER, leftMargin=0.75 * inch, rightMargin=0.75 * inch,
        topMargin=0.65 * inch, bottomMargin=0.65 * inch, title=r.name or "Resume",
    )
    story = [Paragraph(_pdf_safe(r.name), name)]
    if r.headline:
        story.append(Paragraph(_pdf_safe(r.headline), base))
    if r.contact:
        story.append(Paragraph(_pdf_safe("  |  ".join(r.contact)), muted))
    for heading, entries in _sections(r):
        story += [Paragraph(_pdf_safe(heading.upper()), head), HRFlowable(width="100%", thickness=0.6, color="#000000")]
        for e in entries:
            if isinstance(e, str):
                story.append(Paragraph(_pdf_safe(e), base))
                continue
            title, sub, bullets = e
            story.append(Paragraph(_pdf_safe(title), bold))
            if sub:
                story.append(Paragraph(_pdf_safe(sub), muted))
            if bullets:
                story.append(ListFlowable(
                    [ListItem(Paragraph(_pdf_safe(b), base), leftIndent=12) for b in bullets],
                    bulletType="bullet", start="•", leftIndent=12, bulletFontSize=8,
                ))
        story.append(Spacer(1, 2))
    doc.build(story)
    return buf.getvalue()


def render(r: TailoredResume, fmt: str) -> bytes:
    if fmt == "pdf":
        return to_pdf(r)
    if fmt == "docx":
        return to_docx(r)
    if fmt == "md":
        return to_markdown(r).encode()
    if fmt == "txt":
        return to_text(r).encode()
    raise ValueError(fmt)
