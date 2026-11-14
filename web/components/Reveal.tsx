"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fades its children up as they scroll into view.
 *
 * Only content that is genuinely still below the fold is ever hidden. Anything already on screen, or already scrolled past
 * (anchor links like /#pricing, reloads, the back button), is left alone, so the first screen never flickers and nothing
 * can be stranded invisible. Without JavaScript everything is simply visible.
 */
export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false); // hidden, waiting to be scrolled to
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.95 || rect.bottom < 0) return; // on screen or scrolled past: never hide

    setArmed(true);
    const reveal = () => setShown(true);
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        reveal();
        io.disconnect();
      }
    }, { threshold: 0.12 });
    io.observe(el);

    // Safety net: if the observer never reports (rare), show anything that is near the viewport.
    const safety = window.setTimeout(() => {
      if (el.getBoundingClientRect().top < window.innerHeight * 1.5) reveal();
    }, 3500);

    return () => {
      io.disconnect();
      clearTimeout(safety);
    };
  }, []);

  return (
    <div ref={ref} className={`${armed ? "reveal" : ""} ${shown ? "in" : ""} ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}
