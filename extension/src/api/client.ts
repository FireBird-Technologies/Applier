import { API_URL } from "../config";
import { getDeviceId } from "../lib/device";
import { clearToken, getToken } from "../lib/storage";
import type { Application, AuthOut, Detect, Format, PageData, Resume, SourceDoc, SourceResume } from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("X-Device-Id", await getDeviceId());  // one browser, one account
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Can't reach the Applier server.");
  }
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) await clearToken();  // 403: this browser belongs to another account
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = typeof j.detail === "string" ? j.detail : detail;
    } catch { /* non-JSON error body */ }
    throw new ApiError(res.status, detail);
  }
  return res;
}

const json = async <T,>(p: string, init?: RequestInit): Promise<T> => (await request(p, init)).json();
const post = <T,>(p: string, body: unknown) => json<T>(p, { method: "POST", body: JSON.stringify(body) });

export const api = {
  loginWithGoogle: (credential: string) => post<AuthOut>("/api/auth/google", { credential }),
  me: () => json<AuthOut>("/api/auth/me"),
  getApplication: (id: number) => json<Application>(`/api/applications/${id}`),
  getSource: () => json<SourceResume | null>("/api/source"),
  uploadSource: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return json<SourceResume>("/api/source/upload", { method: "POST", body: fd });
  },
  // The source resume as an editable document (parsed into sections the first time it is opened).
  getSourceDoc: () => json<SourceDoc>("/api/source/resume"),
  saveSourceDoc: (resume: Resume) => json<SourceDoc>("/api/source/resume", { method: "PUT", body: JSON.stringify({ resume }) }),
  editSourceDoc: (instruction: string) => post<SourceDoc>("/api/source/resume/edit", { instruction }),
  undoSourceDoc: () => post<SourceDoc>("/api/source/resume/undo", {}),
  detect: (p: PageData, signal?: AbortSignal) =>
    json<Detect>("/api/detect", {
      method: "POST",
      // Detection only needs the start and end of the page; the backend trims further.
      body: JSON.stringify({ ...p, text: p.text.length > 8000 ? `${p.text.slice(0, 5500)}
...
${p.text.slice(-2500)}` : p.text }),
      signal,
    }),
  generate: (p: PageData, job_title: string, company: string) =>
    post<Application>("/api/applications", { ...p, job_title, company }),
  /** Save hand edits. The server keeps the resume to one page and reports anything it removed in `notice`. */
  saveResume: (id: number, resume: Resume) =>
    json<Application>(`/api/applications/${id}`, { method: "PUT", body: JSON.stringify({ resume }) }),
  /** Step back one edit (AI or manual). The server forgets the undone request. */
  undo: (id: number) => post<Application>(`/api/applications/${id}/undo`, {}),
  createCheckout: (credits: number) =>
    post<{ url: string; credits: number; amount_cents: number }>("/api/billing/checkout", { credits }),
  edit: (id: number, instruction: string) => post<Application>(`/api/applications/${id}/edit`, { instruction }),
  /** Downloading is what marks the application as applied (server-side). */
  async download(id: number, format: Format): Promise<void> {
    const res = await request(`/api/applications/${id}/download?format=${format}`);
    const blob = await res.blob();
    const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `resume.${format}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },
};
