"""Turn scraped page text into clean, readable text, and trim it for cheap LLM calls."""
import html
import re
import unicodedata

_TAG = re.compile(r"<[^>]{1,300}>")
_URL = re.compile(r"https?://\S+|www\.\S+")
_JUNK_TOKEN = re.compile(r"\S{41,}")  # hashes, base64, tracking blobs
_SPACES = re.compile(r"[ \t]+")
_BLANKS = re.compile(r"\n{3,}")


def clean_text(s: str, limit: int | None = None) -> str:
    """Keep readable characters only: strip leftover HTML, control/zero-width/private-use chars,
    emoji and symbols, URLs and junk tokens; collapse whitespace; drop repeated short lines (menus)."""
    s = html.unescape(s or "")
    s = _TAG.sub(" ", s)
    s = unicodedata.normalize("NFKC", s)
    out = []
    for ch in s:
        if ch == "\n":
            out.append(ch)
            continue
        cat = unicodedata.category(ch)
        if cat == "Zs" or ch == "\t":
            out.append(" ")
        elif cat[0] in "CZ" or cat == "So":  # control, format, private-use, separators, emoji/symbols
            continue
        else:
            out.append(ch)
    s = _JUNK_TOKEN.sub(" ", _URL.sub(" ", "".join(out)))

    seen: set[str] = set()
    lines = []
    for line in s.split("\n"):
        line = _SPACES.sub(" ", line).strip()
        if line and len(line) < 60:
            if line in seen:
                continue
            seen.add(line)
        lines.append(line)
    s = _BLANKS.sub("\n\n", "\n".join(lines)).strip()
    return trim(s, limit) if limit else s


def trim(s: str, limit: int) -> str:
    """Cut to ~limit chars on a word boundary."""
    if len(s) <= limit:
        return s
    cut = s[:limit].rsplit(None, 1)[0] if " " in s[:limit] else s[:limit]
    return cut.rstrip()


def trim_focus(s: str, limit: int, pattern: re.Pattern) -> str:
    """Keep the start, the end, and the stretch in between where `pattern` matches most often. On pages that open
    with menus or a list of other items, the part that matters is in the middle and head + tail would miss it."""
    if len(s) <= limit:
        return s
    head_n, tail_n = int(limit * 0.3), int(limit * 0.2)
    mid_n = limit - head_n - tail_n
    hits = [m.start() for m in pattern.finditer(s, head_n, len(s) - tail_n)]
    if not hits:
        return trim_head_tail(s, limit)
    best = max(hits, key=lambda h: sum(1 for x in hits if h <= x < h + mid_n))
    start = min(max(head_n, best - 150), len(s) - tail_n - mid_n)  # a little context before the first match
    return f"{trim(s, head_n)}\n...\n{s[start:start + mid_n].strip()}\n...\n{s[-tail_n:].strip()}"


def trim_head_tail(s: str, limit: int) -> str:
    """Keep the start (title, summary) and the end (apply section, benefits) of a long page."""
    if len(s) <= limit:
        return s
    head = trim(s, int(limit * 0.65))
    tail_src = s[-int(limit * 0.35):]
    tail = tail_src.split(None, 1)[1] if " " in tail_src[:30] and len(tail_src.split(None, 1)) > 1 else tail_src
    return f"{head}\n...\n{tail.strip()}"
