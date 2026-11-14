import { API_URL } from "../config";
import { clearToken, getToken } from "../lib/storage";
import type { Application, AuthOut, Detect, Format, PageData, SourceResume } from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Can't reach the Applier server.");
  }
  if (!res.ok) {
    if (res.status === 401) await clearToken();
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
  getSource: () => json<SourceResume | null>("/api/source"),
  uploadSource: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return json<SourceResume>("/api/source/upload", { method: "POST", body: fd });
  },
  pasteSource: (text: string) => post<SourceResume>("/api/source/text", { text }),
  detect: (p: PageData) => post<Detect>("/api/detect", p),
  generate: (p: PageData, job_title: string, company: string) =>
    post<Application>("/api/applications", { ...p, job_title, company }),
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
