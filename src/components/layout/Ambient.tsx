"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Wordmark } from "@/components/brand/Brand";
import { useUI } from "@/components/providers/UIProvider";
import { useReveal } from "@/lib/client/hooks";

/** Wordmark intro; visibility is decided before paint by INTRO_SCRIPT (lib/shared/intro.ts). */
export function IntroLoader() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (document.documentElement.getAttribute("data-intro") !== "1") {
      setDone(true);
      return;
    }
    const t = window.setTimeout(() => setDone(true), 1600);
    return () => window.clearTimeout(t);
  }, []);
  if (done) return null;
  return (
    <div className="intro" aria-hidden="true">
      <Wordmark className="w-[min(70vw,420px)]" priority sizes="420px" />
    </div>
  );
}

export function Toast() {
  const { toast } = useUI();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4">
      {toast && (
        <p className="border border-rule bg-surface px-5 py-3 text-[0.8125rem]" style={{ animation: "fade-up 0.4s var(--ease-quiet)" }}>
          {toast}
        </p>
      )}
    </div>
  );
}

export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal ${className}`} data-visible={visible}>
      {children}
    </div>
  );
}
