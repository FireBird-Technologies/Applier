import dspy

from app.schemas import TailoredResume


class DetectJobPage(dspy.Signature):
    """Decide whether a web page is a single job posting/application page.
    Listing/search pages, company career landing pages, articles and unrelated
    sites are NOT job postings. If it is one, extract the role title and company."""

    page_url: str = dspy.InputField()
    page_title: str = dspy.InputField()
    page_text: str = dspy.InputField(desc="visible text of the page, truncated")
    is_job_posting: bool = dspy.OutputField()
    confidence: float = dspy.OutputField(desc="0.0 to 1.0")
    job_title: str = dspy.OutputField(desc="empty if not a job posting")
    company: str = dspy.OutputField(desc="empty if not a job posting")
    reason: str = dspy.OutputField(desc="one short sentence")


class ExtractJobMeta(dspy.Signature):
    """Extract the role title and hiring company from a job posting page."""

    page_url: str = dspy.InputField()
    page_title: str = dspy.InputField()
    page_text: str = dspy.InputField()
    job_title: str = dspy.OutputField(desc="the role being hired for")
    company: str = dspy.OutputField(desc="the hiring company; empty if unknown")


class TailorResume(dspy.Signature):
    """Rewrite the candidate's resume so it is tailored to the job description.

    Rules:
    - Use ONLY facts present in the source resume. Never invent employers, titles,
      dates, degrees, metrics, skills or technologies.
    - Reorder and reword to emphasise the experience most relevant to the job;
      mirror the job's vocabulary where it is truthful (ATS keywords).
    - Lead bullets with strong verbs, keep them concise and quantified when the
      source already has numbers. Drop clearly irrelevant material.
    - Keep to one page of content where possible."""

    source_resume: str = dspy.InputField(desc="the candidate's base resume text")
    job_title: str = dspy.InputField()
    company: str = dspy.InputField()
    job_description: str = dspy.InputField()
    resume: TailoredResume = dspy.OutputField()


class ReviseResume(dspy.Signature):
    """Apply the user's requested edit to the tailored resume and return the full
    updated resume. Make only the requested change. Still never invent facts that
    are not in the source resume or stated by the user in the instruction."""

    source_resume: str = dspy.InputField()
    current_resume: TailoredResume = dspy.InputField()
    job_description: str = dspy.InputField()
    instruction: str = dspy.InputField()
    resume: TailoredResume = dspy.OutputField()
