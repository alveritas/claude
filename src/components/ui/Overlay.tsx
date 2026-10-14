"use client";

import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap, useMounted } from "@/lib/client/hooks";

interface Props {
  open: boolean;
  onClose: () => void;
  label: string;
  variant: "drawer" | "drawer-left" | "dialog" | "fullscreen";
  className?: string;
  children: ReactNode;
}

/** Accessible modal surface: portal, scrim, focus trap, Escape to close. */
export function Overlay({ open, onClose, label, variant, className = "", children }: Props) {
  const mounted = useMounted();
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open, onClose);
  if (!mounted || !open) return null;
  const surface =
    variant === "drawer" ? "drawer" : variant === "drawer-left" ? "drawer drawer-left" : variant;
  return createPortal(
    <>
      {variant !== "fullscreen" && <div className="scrim" onClick={onClose} aria-hidden="true" />}
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`${surface} ${className}`}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
