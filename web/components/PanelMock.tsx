import { LogoMark } from "./Logo";

const Line = ({ w }: { w: string }) => <div className="h-1.5 rounded-full bg-neutral-200" style={{ width: w }} />;
const H = ({ children }: { children: string }) => (
  <div className="border-b border-black pb-0.5 pt-1 text-[9px] font-semibold uppercase tracking-wider">{children}</div>
);

/** A static, monochrome picture of the extension's side panel after generating a resume. */
export function PanelMock() {
  return (
    <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-xl border border-black bg-white text-left" aria-hidden>
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <span className="inline-flex items-center gap-1.5">
          <LogoMark size={18} />
          <span className="text-[15px] font-semibold" style={{ letterSpacing: "-0.03em" }}>applier</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="rounded-full border border-neutral-200 px-2 py-0.5 font-mono text-[11px]">7/10</span>
          <span className="rounded-md bg-black px-2 py-1 text-[11px] font-medium text-white">Buy credits</span>
        </span>
      </div>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-medium">Backend Engineer</div>
            <div className="text-[12px] text-neutral-500">Acme</div>
          </div>
          <span className="rounded-full border border-black px-2 py-0.5 text-[10px] font-medium">Draft</span>
        </div>
        <div className="space-y-2.5 rounded-md border border-neutral-200 p-3">
          <div className="text-[13px] font-semibold" style={{ letterSpacing: "-0.02em" }}>Jane Doe</div>
          <Line w="70%" />
          <H>Experience</H>
          <Line w="55%" /><Line w="92%" /><Line w="84%" /><Line w="90%" />
          <H>Skills</H>
          <Line w="78%" />
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {["PDF", "DOCX", "MD", "TXT"].map((f) => (
            <div key={f} className="rounded-md bg-black py-1.5 text-center text-[11px] font-medium text-white">{f}</div>
          ))}
        </div>
        <div className="text-[11px] text-neutral-500">Downloading marks this job as applied and uses 1 credit.</div>
      </div>
    </div>
  );
}
