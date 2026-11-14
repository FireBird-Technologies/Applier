import dspy

from app.schemas import TailoredResume


class DetectJobPage(dspy.Signature):
    """Decide whether a web page is a single job posting/application page.
    Listing/search pages, company career landing pages, articles and unrelated
    sites are NOT job postings. If it is one, extract the role title and company."""

    page_url: str = dspy.InputField()
    page_title: str = dspy.InputField()
    page_text: str = dspy.InputField(desc="text of the page, truncated")
    page_signals: str = dspy.InputField(desc="hints from the page HTML: meta tags, h1, apply buttons, resume upload field")
    is_job_posting: bool = dspy.OutputField()
    confidence: float = dspy.OutputField(desc="0.0 to 1.0")
    job_title: str = dspy.OutputField(desc="empty if not a job posting")
    company: str = dspy.OutputField(desc="empty if not a job posting")
    reason: str = dspy.OutputField(desc="one short sentence")


class TailorResume(dspy.Signature):
    """Rewrite the candidate's resume so it is tailored to the job description.

    Rules:
    - Use ONLY facts present in the source resume. Never invent employers, titles,
      dates, degrees, metrics, skills or technologies.
    - Reorder and reword to emphasise the experience most relevant to the job;
      mirror the job's vocabulary where it is truthful (ATS keywords).
    - Lead bullets with strong verbs, keep them concise and quantified when the
      source already has numbers. Drop clearly irrelevant material.
    - The resume MUST fit on ONE page. Budget: summary at most 2 short sentences; at most 12 skills;
      4 to 5 bullets for the most recent or most relevant role, 2 to 3 for older ones; one line per bullet
      (about 25 words max); omit projects and certifications unless they clearly help for this job."""

    source_resume: str = dspy.InputField(desc="the candidate's base resume text")
    job_title: str = dspy.InputField()
    company: str = dspy.InputField()
    job_description: str = dspy.InputField()
    resume: TailoredResume = dspy.OutputField()


class ReviseResume(dspy.Signature):
    """Apply the user's requested edit to the tailored resume and return the full
    updated resume. Make only the requested change. Still never invent facts that
    are not in the source resume or stated by the user in the instruction.
    Keep EVERY change listed in previous_edits: the current resume already contains them, so start from the
    current resume and never revert its wording, length or content back toward the source resume. Text the user
    edited by hand must stay exactly as it is unless the new instruction targets it.
    The resume must still fit on ONE page: if an addition makes it too long, shorten or drop the
    least relevant content rather than growing the resume."""

    source_resume: str = dspy.InputField(desc="the user's original resume: a source of facts only, NOT of wording")
    current_resume: TailoredResume = dspy.InputField(desc="the resume as it stands now, including every earlier edit")
    previous_edits: str = dspy.InputField(desc="changes the user already asked for or made by hand, oldest first")
    job_description: str = dspy.InputField()
    instruction: str = dspy.InputField(desc="the new change to make now")
    resume: TailoredResume = dspy.OutputField()
