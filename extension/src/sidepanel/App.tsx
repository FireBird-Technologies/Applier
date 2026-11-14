import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { SourceResume, Usage, User } from "../api/types";
import { signInWithGoogle } from "../lib/auth";
import { clearToken, getToken } from "../lib/storage";
import { JobScreen } from "./JobScreen";
import { Logo, LogoMark } from "./Logo";
import { SourceScreen } from "./SourceScreen";

type Stage = "boot" | "signed-out" | "app";

export function App() {
  const [stage, setStage] = useState<Stage>("boot");
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [source, setSource] = useState<SourceResume | null>(null);
  const [editingSource, setEditingSource] = useState(false);
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const load = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me.user); setUsage(me.usage);
      setSource(await api.getSource());
      setStage("app");
    } catch {
      setStage("signed-out");
    }
  }, []);

  useEffect(() => { getToken().then((t) => (t ? load() : setStage("signed-out"))); }, [load]);

  const signIn = async () => {
    setSigningIn(true); setError("");
    try { await signInWithGoogle(); await load(); } catch (e) { setError((e as Error).message); } finally { setSigningIn(false); }
  };
  const signOut = async () => { await clearToken(); setUser(null); setSource(null); setStage("signed-out"); };
  const refreshUsage = () => api.me().then((m) => setUsage(m.usage)).catch(() => {});

  if (stage === "boot") return <div className="p-4 text-gray-500">Loading...</div>;

  if (stage === "signed-out") {
    return (
      <div className="flex min-h-screen flex-col justify-center gap-6 p-6">
        <div className="space-y-3">
          <LogoMark size={36} />
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight" style={{ letterSpacing: "-0.03em" }}>
            Apply to jobs<br />with a resume that fits.
          </h1>
          <p className="text-gray-500">Open a job posting, get a tailored resume in seconds. Free to start.</p>
        </div>
        <button className="btn-primary w-full py-2.5" onClick={signIn} disabled={signingIn}>
          {signingIn ? "Waiting for Google..." : "Continue with Google"}
        </button>
        {error && <p className="border-l-2 border-black pl-2">{error}</p>}
      </div>
    );
  }

  const needsSource = !source || editingSource;
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <Logo />
        <div className="flex items-center gap-3 text-[12px]">
          {usage && <span className="rounded-full border border-gray-200 px-2 py-0.5 font-mono">{usage.remaining_free}/{usage.free_limit} free</span>}
          {source && !editingSource && <button className="text-gray-500 hover:text-black" onClick={() => setEditingSource(true)}>Resume</button>}
          <button className="text-gray-500 hover:text-black" onClick={signOut} title={user?.email}>Sign out</button>
        </div>
      </header>
      <main className="p-4">
        {needsSource ? (
          <SourceScreen current={source} onSaved={(s) => { setSource(s); setEditingSource(false); }}
            onCancel={source ? () => setEditingSource(false) : undefined} />
        ) : (
          usage && <JobScreen usage={usage} onUsage={refreshUsage} />
        )}
      </main>
    </div>
  );
}
