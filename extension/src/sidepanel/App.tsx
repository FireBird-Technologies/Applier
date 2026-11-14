import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "../api/client";
import type { SourceResume, Usage, User } from "../api/types";
import { signInWithGoogle } from "../lib/auth";
import { clearDetectCache } from "../lib/detectCache";
import { clearToken, getToken } from "../lib/storage";
import { BuyScreen } from "./BuyScreen";
import { CreditsBanner, UsagePill } from "./Credits";
import { JobScreen } from "./JobScreen";
import { Logo, LogoMark } from "./Logo";
import { SourceScreen } from "./SourceScreen";

type Stage = "boot" | "signed-out" | "app";
type View = "main" | "source" | "buy";

export function App() {
  const [stage, setStage] = useState<Stage>("boot");
  const [view, setView] = useState<View>("main");
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [source, setSource] = useState<SourceResume | null>(null);
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const load = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me.user); setUsage(me.usage);
      setSource(await api.getSource());
      setStage("app");
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setError(e.message);  // e.g. this browser belongs to another account
      setStage("signed-out");
    }
  }, []);

  useEffect(() => { getToken().then((t) => (t ? load() : setStage("signed-out"))); }, [load]);

  const signIn = async () => {
    setSigningIn(true); setError("");
    try { await signInWithGoogle(); await load(); } catch (e) { setError((e as Error).message); } finally { setSigningIn(false); }
  };
  const signOut = async () => { await clearToken(); await clearDetectCache(); setUser(null); setSource(null); setView("main"); setStage("signed-out"); };
  const refreshUsage = useCallback(() => { api.me().then((m) => setUsage(m.usage)).catch(() => {}); }, []);
  const closeBuy = useCallback(() => setView("main"), []);
  const [scanTick, setScanTick] = useState(0);
  // From any screen: go to the job screen and scan the current tab.
  const startScan = () => { setView("main"); setScanTick((t) => t + 1); };

  // Coming back to the panel (for example after paying in another tab) shows up-to-date credits.
  useEffect(() => {
    window.addEventListener("focus", refreshUsage);
    return () => window.removeEventListener("focus", refreshUsage);
  }, [refreshUsage]);
  const openSource = () => chrome.tabs.create({ url: chrome.runtime.getURL("editor.html?source=1") });

  // The editor tab announces saves to the source resume; reload its size and name here.
  useEffect(() => {
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "local" && changes.applier_source_saved) api.getSource().then(setSource).catch(() => {});
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

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

  const needsSource = !source || view === "source";
  const buy = () => setView("buy");

  return (
    <div className="min-h-screen">
      <header className="space-y-2 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <Logo />
          <div className="flex items-center gap-2">
            {usage && <UsagePill usage={usage} />}
            <button className="text-[12px] font-medium underline-offset-2 hover:underline" onClick={buy}>Buy credits</button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[12px] text-gray-500">
          {source && (
            <button className="hover:text-black" onClick={() => setView("source")}>Resume</button>
          )}
          {source && <button className="hover:text-black" onClick={startScan} title="Scan the current tab for a job posting">Scan</button>}
          <button className="hover:text-black" onClick={signOut} title={user?.email}>Sign out</button>
        </div>
      </header>

      {usage && view !== "buy" && <CreditsBanner usage={usage} onBuy={buy} />}

      <main className="p-4">
        {view === "buy" && usage ? (
          <BuyScreen usage={usage} onClose={closeBuy} onPurchased={setUsage} />
        ) : needsSource ? (
          <SourceScreen current={source} onView={openSource}
            onSaved={(s) => { setSource(s); setView("main"); }}
            onCancel={source ? () => setView("main") : undefined} />
        ) : (
          usage && <JobScreen usage={usage} onUsage={refreshUsage} onBuy={buy} scanTick={scanTick} />
        )}
      </main>

    </div>
  );
}
