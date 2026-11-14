export interface User { id: number; email: string; name: string; picture: string }
export type CreditLevel = "ok" | "moderate" | "low" | "empty";
export interface Usage {
  free_limit: number; paid_credits: number; total: number; applied: number; remaining: number;
  level: CreditLevel; paywalled: boolean;
  price_per_application_usd: number; minimum_charge_usd: number; min_credits: number;
}
export interface AuthOut { access_token: string; user: User; usage: Usage }
export interface SourceResume { id: number; filename: string; chars: number; preview: string }

export interface PageData {
  url: string; title: string; text: string; structured: Record<string, unknown> | null; signals?: string;
}
export interface Detect {
  is_job: boolean; confidence: number; job_title: string; company: string; reason: string;
  method: "structured" | "heuristic" | "llm";
}

export interface Resume {
  name: string; headline: string; contact: string[]; summary: string; skills: string[];
  experience: { company: string; title: string; location: string; start: string; end: string; bullets: string[] }[];
  projects: { name: string; bullets: string[] }[];
  education: { school: string; degree: string; dates: string; details: string[] }[];
  certifications: string[];
}
export interface Application {
  id: number; job_url: string; job_title: string; company: string;
  status: "draft" | "applied"; version: number; resume: Resume; notice?: string;
  can_undo?: boolean; last_edit?: string;
}
export type Format = "pdf" | "docx" | "md" | "txt";
