from html import escape

from fastapi.responses import HTMLResponse


def simple_page(title: str, message: str, status: int = 200) -> HTMLResponse:
    """Tiny black-and-white confirmation page for links opened from emails or Stripe redirects."""
    html = f"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(title)} - Applier</title>
<style>body{{margin:0;font-family:Geist,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#000;background:#fff}}
.w{{max-width:420px;margin:96px auto;padding:0 24px}}.l{{font-size:18px;font-weight:600;letter-spacing:-.03em;margin-bottom:24px}}
h1{{font-size:20px;letter-spacing:-.02em;margin:0 0 8px}}p{{color:#525252;line-height:1.6;margin:0}}</style></head>
<body><div class="w"><div class="l">applier</div><h1>{escape(title)}</h1><p>{escape(message)}</p></div></body></html>"""
    return HTMLResponse(html, status_code=status)
