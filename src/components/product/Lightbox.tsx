"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight, CloseIcon, MinusIcon, PlusIcon } from "@/components/ui/Icons";
import { Overlay } from "@/components/ui/Overlay";
import { clamp } from "@/lib/shared/format";
import type { ProductImage } from "@/lib/shared/types";

const MAX_SCALE = 3;

interface View {
  s: number;
  x: number;
  y: number;
}
const RESET: View = { s: 1, x: 0, y: 0 };

/** Pan/zoom surface: wheel, double-click/double-tap, pinch, drag, and keyboard (+ / − / 0). */
function ZoomStage({ image, onSwipe }: { image: ProductImage; onSwipe: (dir: 1 | -1) => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(RESET);
  const viewRef = useRef(view);
  viewRef.current = view;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; s: number; mid: { x: number; y: number }; t: View } | null>(null);
  const drag = useRef<{ x: number; y: number; t: View; startX: number; moved: boolean } | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);

  useEffect(() => setView(RESET), [image.id]);

  const bound = useCallback((v: View): View => {
    const el = stage.current;
    if (!el) return v;
    const s = clamp(v.s, 1, MAX_SCALE);
    const maxX = ((s - 1) * el.clientWidth) / 2;
    const maxY = ((s - 1) * el.clientHeight) / 2;
    return { s, x: clamp(v.x, -maxX, maxX), y: clamp(v.y, -maxY, maxY) };
  }, []);

  const zoomAt = useCallback(
    (nextS: number, clientX?: number, clientY?: number) => {
      const el = stage.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = clientX === undefined ? 0 : clientX - (r.left + r.width / 2);
      const py = clientY === undefined ? 0 : clientY - (r.top + r.height / 2);
      const v = viewRef.current;
      const s = clamp(nextS, 1, MAX_SCALE);
      const k = s / v.s;
      setView(bound({ s, x: px - k * (px - v.x), y: py - k * (py - v.y) }));
    },
    [bound],
  );

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(viewRef.current.s * Math.exp(-e.deltaY * 0.0022), e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "+" || e.key === "=") zoomAt(viewRef.current.s + 0.5);
      else if (e.key === "-" || e.key === "_") zoomAt(viewRef.current.s - 0.5);
      else if (e.key === "0") setView(RESET);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomAt]);

  const onPointerDown = (e: ReactPointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        s: viewRef.current.s,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        t: viewRef.current,
      };
      drag.current = null;
    } else if (pointers.current.size === 1) {
      drag.current = { x: e.clientX, y: e.clientY, t: viewRef.current, startX: e.clientX, moved: false };
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gesture.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const g = gesture.current;
      const el = stage.current!;
      const r = el.getBoundingClientRect();
      const px = g.mid.x - (r.left + r.width / 2);
      const py = g.mid.y - (r.top + r.height / 2);
      const s = clamp((g.s * dist) / g.dist, 1, MAX_SCALE);
      const k = s / g.t.s;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      setView(
        bound({
          s,
          x: px - k * (px - g.t.x) + (mid.x - g.mid.x),
          y: py - k * (py - g.t.y) + (mid.y - g.mid.y),
        }),
      );
    } else if (drag.current) {
      const d = drag.current;
      if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 4) d.moved = true;
      if (viewRef.current.s > 1) {
        setView(bound({ s: d.t.s, x: d.t.x + (e.clientX - d.x), y: d.t.y + (e.clientY - d.y) }));
      }
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
    const d = drag.current;
    if (d && pointers.current.size === 0) {
      drag.current = null;
      const dx = e.clientX - d.startX;
      // Swipe between images when not zoomed.
      if (viewRef.current.s === 1 && Math.abs(dx) > 60) {
        onSwipe(dx < 0 ? 1 : -1);
        return;
      }
      if (!d.moved) {
        const now = Date.now();
        const lt = lastTap.current;
        if (lt && now - lt.t < 320 && Math.hypot(lt.x - e.clientX, lt.y - e.clientY) < 30) {
          lastTap.current = null;
          if (viewRef.current.s > 1) setView(RESET);
          else zoomAt(2.2, e.clientX, e.clientY);
        } else {
          lastTap.current = { t: now, x: e.clientX, y: e.clientY };
        }
      }
    }
  };

  return (
    <div className="relative h-full w-full">
      <div
        ref={stage}
        className="relative h-full w-full touch-none select-none overflow-hidden"
        style={{ cursor: view.s > 1 ? "grab" : "zoom-in" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.s})`,
            transition: pointers.current.size ? "none" : "transform 0.25s var(--ease-quiet)",
          }}
        >
          <Image
            key={image.id}
            src={image.url}
            alt={image.alt}
            fill
            sizes="100vw"
            className="object-contain"
            draggable={false}
            priority
          />
        </div>
      </div>
      <div className="absolute bottom-4 right-4 flex gap-1 bg-ink/70 backdrop-blur">
        <button type="button" className="icon-btn" onClick={() => zoomAt(view.s - 0.5)} aria-label="Zoom out" disabled={view.s <= 1}>
          <MinusIcon size={16} />
        </button>
        <button type="button" className="icon-btn" onClick={() => zoomAt(view.s + 0.5)} aria-label="Zoom in" disabled={view.s >= MAX_SCALE}>
          <PlusIcon size={16} />
        </button>
      </div>
    </div>
  );
}

export function Lightbox({
  images,
  index,
  onIndex,
  onClose,
  title,
}: {
  images: ProductImage[];
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
  title: string;
}) {
  const open = index !== null;
  const i = index ?? 0;
  const go = useCallback(
    (dir: 1 | -1) => onIndex((i + dir + images.length) % images.length),
    [i, images.length, onIndex],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  const img = images[i];
  return (
    <Overlay open={open && !!img} onClose={onClose} label={`${title} images`} variant="fullscreen">
      {img && (
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center justify-between px-4 md:px-6">
            <p className="text-[0.8125rem]">
              <span className="muted tabular-nums">
                {i + 1} / {images.length}
              </span>
              <span className="ml-4">{img.label}</span>
            </p>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close full screen view" data-autofocus>
              <CloseIcon />
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            <ZoomStage image={img} onSwipe={go} />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="icon-btn absolute left-2 top-1/2 -translate-y-1/2 bg-ink/50 max-md:hidden"
                  onClick={() => go(-1)}
                  aria-label="Previous image"
                >
                  <ChevronLeft />
                </button>
                <button
                  type="button"
                  className="icon-btn absolute right-2 top-1/2 -translate-y-1/2 bg-ink/50 max-md:hidden"
                  onClick={() => go(1)}
                  aria-label="Next image"
                >
                  <ChevronRight />
                </button>
              </>
            )}
          </div>
          <p className="muted px-4 py-2 text-center text-[0.6875rem] md:hidden">Pinch or double-tap to zoom. Swipe for more.</p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-4 md:justify-center">
            {images.map((im, k) => (
              <button
                key={im.id}
                type="button"
                onClick={() => onIndex(k)}
                aria-label={`Show ${im.label}`}
                aria-current={k === i}
                className={`frame h-16 w-12 flex-none transition-opacity ${k === i ? "opacity-100 outline outline-1 outline-bone" : "opacity-50 hover:opacity-80"}`}
              >
                <Image src={im.url} alt="" fill sizes="48px" className="object-cover" style={{ objectPosition: im.focal }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </Overlay>
  );
}
