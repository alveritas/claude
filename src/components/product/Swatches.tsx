"use client";

import Image from "next/image";
import Link from "next/link";
import { colorwayLabel, swatchBackground } from "@/lib/shared/colorways";
import type { Product } from "@/lib/shared/types";

const describe = (p: Product) => `${colorwayLabel(p)}${p.color && p.color !== colorwayLabel(p) ? ` (${p.color})` : ""}`;

/**
 * Round colour dots that switch a card (or quick view) in place. On devices with a mouse,
 * pointing at a dot previews that colour; tapping or clicking selects it.
 */
export function SwatchButtons({
  members,
  currentId,
  onPick,
  size = "sm",
  label,
  hoverPreview = true,
}: {
  members: Product[];
  currentId: string;
  onPick: (id: string) => void;
  size?: "sm" | "md";
  label: string;
  /** Pointing at a dot with a mouse previews that colour. */
  hoverPreview?: boolean;
}) {
  if (members.length < 2) return null;
  return (
    <ul className="flex items-center gap-1" aria-label={label}>
      {members.map((p) => {
        const selected = p.id === currentId;
        return (
          <li key={p.id}>
            <button
              type="button"
              className={`swatch swatch-${size}`}
              data-selected={selected}
              aria-pressed={selected}
              aria-label={describe(p)}
              title={colorwayLabel(p)}
              onPointerEnter={hoverPreview ? (e) => e.pointerType === "mouse" && onPick(p.id) : undefined}
              onClick={() => onPick(p.id)}
            >
              <span style={{ background: swatchBackground(p.color) }} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Product pages: one photo tile per colour. Choosing one swaps the page to that colour without
 * moving the scroll position or adding a history entry, and the chosen size carries over.
 */
export function ColorwayTiles({ members, currentId }: { members: Product[]; currentId: string }) {
  if (members.length < 2) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Colors">
      {members.map((p) => {
        const selected = p.id === currentId;
        const im = p.images[0];
        return (
          <li key={p.id}>
            <Link
              href={`/products/${p.slug}`}
              replace
              scroll={false}
              className="cw-tile"
              data-selected={selected}
              aria-current={selected ? "true" : undefined}
              aria-label={describe(p)}
              title={colorwayLabel(p)}
            >
              <span className="frame block h-full w-full">
                {im ? (
                  <Image src={im.url} alt="" fill sizes="64px" className="object-contain" draggable={false} />
                ) : (
                  <span className="absolute inset-3 rounded-full" style={{ background: swatchBackground(p.color) }} />
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
