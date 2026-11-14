"""Extract plain text from an uploaded resume file."""
from io import BytesIO

from docx import Document
from pypdf import PdfReader


class UnsupportedFile(ValueError):
    pass


def extract_text(filename: str, data: bytes) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext == "pdf":
        reader = PdfReader(BytesIO(data))
        text = "\n".join((p.extract_text() or "") for p in reader.pages)
    elif ext == "docx":
        text = "\n".join(p.text for p in Document(BytesIO(data)).paragraphs)
    elif ext in {"txt", "md", "markdown", ""}:
        text = data.decode("utf-8", errors="replace")
    else:
        raise UnsupportedFile(f"Unsupported file type .{ext}. Use pdf, docx, md or txt.")
    text = text.strip()
    if len(text) < 80:
        raise UnsupportedFile("Could not read any text from that file. If it is a scanned PDF, export a text-based PDF or use a DOCX file instead.")
    return text
