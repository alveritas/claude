"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Panel = "cart" | "search" | "menu" | null;

interface UIValue {
  panel: Panel;
  open: (p: Exclude<Panel, null>) => void;
  close: () => void;
  quickView: string | null;
  openQuickView: (productId: string) => void;
  closeQuickView: () => void;
  toast: string | null;
  notify: (message: string) => void;
}

const UIContext = createContext<UIValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [quickView, setQuickView] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const open = useCallback((p: Exclude<Panel, null>) => {
    setQuickView(null);
    setPanel(p);
  }, []);
  const close = useCallback(() => setPanel(null), []);
  const openQuickView = useCallback((id: string) => {
    setPanel(null);
    setQuickView(id);
  }, []);
  const closeQuickView = useCallback(() => setQuickView(null), []);

  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Lock page scroll while any overlay is open.
  useEffect(() => {
    const locked = panel !== null || quickView !== null;
    document.body.classList.toggle("scroll-locked", locked);
    return () => document.body.classList.remove("scroll-locked");
  }, [panel, quickView]);

  const value = useMemo(
    () => ({ panel, open, close, quickView, openQuickView, closeQuickView, toast, notify }),
    [panel, open, close, quickView, openQuickView, closeQuickView, toast, notify],
  );
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIValue {
  const v = useContext(UIContext);
  if (!v) throw new Error("useUI must be used inside <UIProvider>");
  return v;
}
