"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, ExpandIcon } from "@/components/ui/Icons";
import type { ProductImage as Img } from "@/lib/shared/types";
import { Lightbox } from "./Lightbox";
import { ProductImage } from "./ProductImage";

/**
 * Desktop: thumbnails beside a main frame with crossfading images.
 * Mobile: a swipeable, snap-scrolling track. Either opens the full-screen zoom viewer.
 */
export function ProductGallery({ images, title, priority = false }: { images: Img[]; title: string; priority?: boolean }) {
  const [active, setActive] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const [zoom, setZoom] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  // Desktop: the photo magnifies under the cursor (CSS limits this to fine pointers that hover).
  const onMove = (e: { clientX: number; clientY: number }) => {
    const el = frame.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--zx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
    el.style.setProperty("--zy", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
  };

  useEffect(() => setActive(0), [images]);

  if (!images.length) {
    return (
      <div className="frame grid aspect-[4/5] place-items-center">
        <p className="muted text-[0.8125rem]">Images coming soon</p>
      </div>
    );
  }

  const go = (dir: 1 | -1) => setActive((i) => (i + dir + images.length) % images.length);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    }
  };

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div>
      {/* Mobile track */}
      <div className="relative md:hidden">
        <div
          ref={track}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
          aria-label={`${title} images`}
          role="region"
        >
          {images.map((im, i) => (
            <button
              key={im.id}
              type="button"
              className="frame aspect-[4/5] w-full flex-none snap-center"
              onClick={() => setViewer(i)}
              aria-label={`Open ${im.label} full screen`}
            >
              <ProductImage image={im} sizes="(min-width: 1280px) 600px, (min-width: 768px) 55vw, 100vw" priority={priority && i === 0} />
            </button>
          ))}
        </div>
        <div className="tag pointer-events-none absolute bottom-3 left-3 tabular-nums">
          {active + 1} / {images.length}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden grid-cols-[64px_minmax(0,1fr)] gap-4 md:grid" onKeyDown={onKey}>
        {/* Thumbnails scroll within the height of the main image */}
        <div className="relative">
        <div className="no-scrollbar absolute inset-x-0 top-0 bottom-10 flex flex-col gap-2 overflow-y-auto p-px" role="tablist" aria-label="Choose an image" aria-orientation="vertical">
          {images.map((im, i) => (
            <button
              key={im.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={im.label}
              onClick={() => setActive(i)}
              className={`frame aspect-[4/5] w-full flex-none transition-opacity duration-300 ${
                i === active ? "opacity-100 outline outline-1 outline-offset-2 outline-bone" : "opacity-75 hover:opacity-100"
              }`}
            >
              <Image src={im.url} alt="" fill sizes="64px" className="object-cover" style={{ objectPosition: im.focal }} />
            </button>
          ))}
        </div>
        </div>
        <div className="relative min-w-0">
          <div
            ref={frame}
            className="frame zoomable aspect-[4/5] w-full"
            role="tabpanel"
            aria-label={images[active].label}
            data-zoom={zoom}
            onMouseEnter={(e) => {
              onMove(e);
              setZoom(true);
            }}
            onMouseMove={onMove}
            onMouseLeave={() => setZoom(false)}
          >
            {images.map((im, i) => (
              <div
                key={im.id}
                className="absolute inset-0 transition-opacity duration-700"
                style={{ opacity: i === active ? 1 : 0 }}
                aria-hidden={i !== active}
              >
                <ProductImage
                  image={im}
                  sizes="(min-width: 1280px) 600px, (min-width: 768px) 55vw, 100vw"
                  priority={priority && i === 0}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setViewer(active)}
              className="absolute inset-0 cursor-zoom-in"
              aria-label={`Open ${images[active].label} full screen`}
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="muted text-[0.75rem]">
              <span className="tabular-nums">
                {active + 1} / {images.length}
              </span>
              <span className="ml-3 text-bone">{images[active].label}</span>
            </p>
            <div className="flex items-center">
              <button type="button" className="icon-btn" onClick={() => go(-1)} aria-label="Previous image">
                <ChevronLeft size={18} />
              </button>
              <button type="button" className="icon-btn" onClick={() => go(1)} aria-label="Next image">
                <ChevronRight size={18} />
              </button>
              <button type="button" className="icon-btn" onClick={() => setViewer(active)} aria-label="Open full screen">
                <ExpandIcon size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <Lightbox images={images} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} title={title} />
    </div>
  );
}
