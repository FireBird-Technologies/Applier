"""Render a TailoredResume to pdf / docx / md / txt, always fitting PDF and DOCX on ONE page.

Fitting strategy (layout_one_page): try the full-size layout first, then shrink font/spacing/margins
down to a readable floor, and only if it still overflows drop the lowest-value content one piece at a
time (certifications, projects, older bullets, ...) and try again.
"""
import re
from io import BytesIO
from xml.sax.saxutils import escape

from docx import Document
from docx.enum.text import WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt
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

# Layout scales tried from largest to smallest. 0.84 * 9.5pt body = 8pt, the readable floor.
SCALES = (1.0, 0.95, 0.9, 0.87, 0.84)
BODY_PT, LEADING_PT = 9.5, 12.5


def _dates(a: str, b: str) -> str:
    return " - ".join(x for x in (a, b) if x)


HEADINGS = {"summary": "Summary", "skills": "Skills", "experience": "Experience", "projects": "Projects",
            "education": "Education", "certifications": "Certifications"}


def _entries(r: TailoredResume, key: str) -> list:
    """Entries of one section; an entry is a plain str or (title, sub_line, bullets). Empty list = nothing to show."""
    if key == "summary":
        return [r.summary] if r.summary else []
    if key == "skills":
        return [", ".join(r.skills)] if r.skills else []
    if key == "experience":
        return [(" - ".join(x for x in (e.title, e.company) if x),
                 " | ".join(x for x in (e.location, _dates(e.start, e.end)) if x), e.bullets) for e in r.experience]
    if key == "projects":
        return [(p.name, "", p.bullets) for p in r.projects]
    if key == "education":
        return [(" - ".join(x for x in (e.degree, e.school) if x), e.dates, e.details) for e in r.education]
    if key == "certifications":
        return [(c, "", []) for c in r.certifications]
    return []


def _sections(r: TailoredResume):
    """Yield (heading, entries) for the visible, non-empty sections, in the user's order."""
    for key in r.section_order:
        entries = _entries(r, key)
        if entries:
            yield HEADINGS[key], entries


# ---------------------------------------------------------------- md / txt
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


# ---------------------------------------------------------------- pdf
def _pdf_safe(s: str) -> str:
    # Built-in PDF fonts are WinAnsi; degrade unsupported glyphs instead of crashing.
    return escape(s.encode("cp1252", "replace").decode("cp1252"))


def _margins(s: float) -> tuple[float, float]:
    return 0.75 * inch * s, 0.65 * inch * s  # (left/right, top/bottom)


def _build_story(r: TailoredResume, s: float) -> tuple[list, list]:
    """Returns (story for the PDF, [(flowable, indent)] used to measure height without building a PDF)."""
    base = ParagraphStyle("b", fontName="Helvetica", fontSize=BODY_PT * s, leading=LEADING_PT * s)
    name = ParagraphStyle("n", parent=base, fontName="Helvetica-Bold", fontSize=20 * s, leading=24 * s)
    head = ParagraphStyle("h", parent=base, fontName="Helvetica-Bold", fontSize=10.5 * s,
                          spaceBefore=9 * s, spaceAfter=2 * s)
    bold = ParagraphStyle("t", parent=base, fontName="Helvetica-Bold", spaceBefore=4 * s)
    muted = ParagraphStyle("m", parent=base, textColor="#555555")

    story = [Paragraph(_pdf_safe(r.name), name)]
    if r.headline:
        story.append(Paragraph(_pdf_safe(r.headline), base))
    if r.contact:
        story.append(Paragraph(_pdf_safe("  |  ".join(r.contact)), muted))
    measure = [(f, 0.0) for f in story]
    for heading, entries in _sections(r):
        top = [Paragraph(_pdf_safe(heading.upper()), head), HRFlowable(width="100%", thickness=0.6, color="#000000")]
        story += top
        measure += [(f, 0.0) for f in top]
        for e in entries:
            if isinstance(e, str):
                p = Paragraph(_pdf_safe(e), base)
                story.append(p)
                measure.append((p, 0.0))
                continue
            title, sub, bullets = e
            for text, style in ((title, bold), (sub, muted)):
                if text:
                    p = Paragraph(_pdf_safe(text), style)
                    story.append(p)
                    measure.append((p, 0.0))
            if bullets:
                paras = [Paragraph(_pdf_safe(b), base) for b in bullets]
                story.append(ListFlowable(
                    [ListItem(p, leftIndent=12 * s) for p in paras],
                    bulletType="bullet", start="•", leftIndent=12 * s, bulletFontSize=8 * s,
                ))
                measure += [(p, 12.0 * s) for p in paras]
        sp = Spacer(1, 2 * s)
        story.append(sp)
        measure.append((sp, 0.0))
    return story, measure


def _fits_estimate(r: TailoredResume, s: float) -> bool:
    """Cheap check: lay the flowables out and add up their heights. No PDF is built."""
    mx, my = _margins(s)
    avail_w = LETTER[0] - 2 * mx - 12  # SimpleDocTemplate's frame has 6pt padding on each side
    avail_h = LETTER[1] - 2 * my - 12
    total = 0.0
    for f, indent in _build_story(r, s)[1]:
        _, h = f.wrap(avail_w - indent, avail_h)
        total += h + f.getSpaceBefore() + f.getSpaceAfter()
        if total > avail_h:
            return False
    return True


def _build_pdf(r: TailoredResume, s: float) -> tuple[bytes, int]:
    """Render at scale s. Returns (pdf bytes, page count)."""
    mx, my = _margins(s)
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=LETTER, leftMargin=mx, rightMargin=mx, topMargin=my, bottomMargin=my, title=r.name or "Resume",
    )
    doc.build(_build_story(r, s)[0])
    return buf.getvalue(), doc.page


# ---------------------------------------------------------------- one-page fitting
def _first_sentences(text: str, n: int) -> str:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return " ".join(parts[:n])


def _trim_one_step(r: TailoredResume) -> bool:
    """Remove the least valuable piece of VISIBLE content. Returns False when nothing is left to remove.
    Hidden sections are never touched: removing them would not help the layout and would destroy content."""
    shown = set(r.section_order)
    if "summary" in shown and len(r.summary) > 260:  # keep a summary to ~2 sentences before touching real content
        short = _first_sentences(r.summary, 2)
        if short != r.summary:
            r.summary = short
            return True
    if "certifications" in shown and r.certifications:
        r.certifications.pop()
        return True
    if "projects" in shown and r.projects:
        r.projects.pop()
        return True
    if "education" in shown and any(e.details for e in r.education):
        for e in r.education:
            e.details = []
        return True
    if "experience" in shown:
        # Oldest experience loses bullets first, but every role keeps 3, then 2, then 1.
        for floor in (3, 2, 1):
            for e in reversed(r.experience):
                if len(e.bullets) > floor:
                    e.bullets.pop()
                    return True
    if "skills" in shown and len(r.skills) > 8:
        r.skills.pop()
        return True
    if "experience" in shown and len(r.experience) > 1:
        r.experience.pop()  # oldest role
        return True
    return False


def layout_one_page(r: TailoredResume) -> tuple[TailoredResume, float, bytes]:
    """Return (resume, scale, pdf) where the PDF is one page. The returned resume may have been trimmed.

    1. Trim content only until it fits at the SMALLEST (still readable) scale, using the cheap estimate.
    2. Use the largest scale at which it fits, confirmed by a real render.
    3. If the estimate was optimistic, keep trimming against real renders.
    """
    r = r.model_copy(deep=True)
    floor = SCALES[-1]
    while not _fits_estimate(r, floor) and _trim_one_step(r):
        pass
    for s in SCALES:
        if _fits_estimate(r, s):
            data, pages = _build_pdf(r, s)
            if pages <= 1:
                return r, s, data
    while True:
        data, pages = _build_pdf(r, floor)
        if pages <= 1 or not _trim_one_step(r):
            return r, floor, data


def describe_trim(before: TailoredResume, after: TailoredResume) -> str:
    """Human-readable summary of what fit_to_one_page removed ('' when nothing was cut)."""
    def bullets(r: TailoredResume) -> int:
        return (sum(len(e.bullets) for e in r.experience) + sum(len(p.bullets) for p in r.projects)
                + sum(len(e.details) for e in r.education))

    diffs = [
        (len(before.certifications) - len(after.certifications), "certification"),
        (len(before.projects) - len(after.projects), "project"),
        (len(before.experience) - len(after.experience), "role"),
        (bullets(before) - bullets(after), "bullet"),
        (len(before.skills) - len(after.skills), "skill"),
    ]
    parts = [f"{n} {word}{'s' if n != 1 else ''}" for n, word in diffs if n > 0]
    if len(after.summary) < len(before.summary):
        parts.append("part of the summary")
    return ("To keep it on one page, removed " + ", ".join(parts) + ".") if parts else ""


def fit_to_one_page(r: TailoredResume) -> TailoredResume:
    """Trim content so the resume fits one page. Stored at generation time so the preview matches downloads."""
    return layout_one_page(r)[0]


# ---------------------------------------------------------------- docx
def _bottom_border(paragraph) -> None:
    ppr = paragraph._p.get_or_add_pPr()
    borders = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    for k, v in (("w:val", "single"), ("w:sz", "6"), ("w:space", "1"), ("w:color", "000000")):
        bottom.set(qn(k), v)
    borders.append(bottom)
    ppr.append(borders)


def to_docx(r: TailoredResume, s: float = 1.0) -> bytes:
    """Same sizes, spacing and margins as the PDF (Arial has Helvetica's metrics) so it stays on one page."""
    doc = Document()
    normal = doc.styles["Normal"]
    normal.font.name = "Arial"
    normal.element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
    normal.font.size = Pt(BODY_PT * s)
    for sec in doc.sections:
        sec.page_width, sec.page_height = Inches(8.5), Inches(11)
        sec.left_margin = sec.right_margin = Inches(0.75 * s)
        sec.top_margin = sec.bottom_margin = Inches(0.65 * s)

    def para(text="", size=BODY_PT, leading=LEADING_PT, bold=False, italic=False, before=0.0, style=None, color=None):
        p = doc.add_paragraph(style=style)
        pf = p.paragraph_format
        pf.space_before, pf.space_after = Pt(before * s), Pt(0)
        pf.line_spacing_rule, pf.line_spacing = WD_LINE_SPACING.EXACTLY, Pt(leading * s)
        if text:
            run = p.add_run(text)
            run.bold, run.italic = bold, italic
            run.font.size = Pt(size * s)
            if color:
                from docx.shared import RGBColor
                run.font.color.rgb = RGBColor.from_string(color)
        return p

    para(r.name, size=20, leading=24, bold=True)
    if r.headline:
        para(r.headline)
    if r.contact:
        para(" | ".join(r.contact), color="555555")
    for heading, entries in _sections(r):
        _bottom_border(para(heading.upper(), size=10.5, bold=True, before=9))
        for e in entries:
            if isinstance(e, str):
                para(e)
                continue
            title, sub, bullets = e
            para(title, bold=True, before=4)
            if sub:
                para(sub, color="555555")
            for b in bullets:
                para(b, style="List Bullet")
    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()


def render(r: TailoredResume, fmt: str) -> bytes:
    if fmt in ("pdf", "docx"):
        fitted, scale, pdf = layout_one_page(r)
        return pdf if fmt == "pdf" else to_docx(fitted, scale)
    if fmt == "md":
        return to_markdown(r).encode()
    if fmt == "txt":
        return to_text(r).encode()
    raise ValueError(fmt)
