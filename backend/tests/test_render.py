from io import BytesIO

from docx import Document
from pypdf import PdfReader

from app.schemas import Education, Experience, Project, TailoredResume
from app.services import render

BULLET = "Led the redesign of a high-traffic service, cutting p95 latency by 40% and saving the team hours each week."


def resume(jobs: int, bullets: int) -> TailoredResume:
    return TailoredResume(
        name="Jane Doe", headline="Backend Engineer", contact=["jane@x.com", "Remote"],
        summary="Engineer with eight years building APIs. " * 12,
        skills=[f"Skill{i}" for i in range(30)],
        experience=[Experience(company=f"Co{i}", title="Engineer", start="2015", end="2020", location="NYC",
                               bullets=[BULLET] * bullets) for i in range(jobs)],
        projects=[Project(name=f"P{i}", bullets=[BULLET] * 3) for i in range(4)],
        education=[Education(school="MIT", degree="BS CS", dates="2014-2018", details=["Honors"] * 3)],
        certifications=[f"Cert {i}" for i in range(8)],
    )


def pages(pdf: bytes) -> int:
    return len(PdfReader(BytesIO(pdf)).pages)


def test_short_resume_untouched_at_full_size():
    r = TailoredResume(
        name="Jane Doe", summary="Backend engineer.", skills=["Python", "SQL"],
        experience=[Experience(company="Acme", title="Engineer", start="2020", end="2024", bullets=[BULLET] * 3)],
    )
    fitted, scale, pdf = render.layout_one_page(r)
    assert pages(pdf) == 1 and scale == 1.0
    assert fitted == r  # nothing trimmed


def test_long_resume_is_always_one_page():
    r = resume(jobs=7, bullets=9)
    assert pages(render._build_pdf(r, 1.0)[0]) > 1  # sanity: this really overflows without fitting
    fitted, scale, pdf = render.layout_one_page(r)
    assert pages(pdf) == 1
    assert scale >= 0.84  # never below the 8pt readable floor
    assert fitted.experience and fitted.name == "Jane Doe"  # still a real resume
    assert len(fitted.experience) <= len(r.experience)
    assert r.experience[0].bullets == [BULLET] * 9  # input is not mutated


def test_trim_keeps_most_recent_content_first():
    fitted = render.fit_to_one_page(resume(jobs=7, bullets=9))
    assert fitted.certifications == [] and fitted.projects == []  # dropped before real experience
    first = fitted.experience[0]
    assert len(first.bullets) >= len(fitted.experience[-1].bullets)  # recent role keeps more


def test_render_pdf_and_docx_for_overflowing_resume():
    r = resume(jobs=7, bullets=9)
    assert pages(render.render(r, "pdf")) == 1
    docx = Document(BytesIO(render.render(r, "docx")))
    assert docx.paragraphs[0].text == "Jane Doe"
    assert docx.sections[0].left_margin <= 685800  # <= 0.75in: same fitted margins as the PDF
