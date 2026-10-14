/**
 * Official logos, used exactly as supplied. public/brand holds the original artwork with the
 * black background converted to transparency (no redrawing). The marks are drawn by using that
 * artwork as a mask filled with the current text colour (.brand-mark in globals.css): near-black
 * on the site's off-white pages. tone="light" | "dark" pins the colour, e.g. on a photo.
 */
type Tone = "current" | "light" | "dark";

function Mark({
  kind,
  label,
  tone,
  className,
}: {
  kind: "wordmark" | "monogram";
  label: string | null;
  tone: Tone;
  className: string;
}) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label ?? undefined}
      aria-hidden={label ? undefined : true}
      data-tone={tone === "current" ? undefined : tone}
      className={`brand-mark brand-${kind} select-none ${className}`}
    />
  );
}

export function Wordmark({
  tone = "current",
  className = "",
}: {
  tone?: Tone;
  className?: string;
  /** Kept for call-site compatibility; the mark is a CSS mask, so there is no image to prioritise. */
  priority?: boolean;
  sizes?: string;
}) {
  return <Mark kind="wordmark" label="Neverhollow" tone={tone} className={className} />;
}

export function Monogram({
  tone = "current",
  className = "",
  decorative = false,
}: {
  tone?: Tone;
  className?: string;
  sizes?: string;
  decorative?: boolean;
}) {
  return <Mark kind="monogram" label={decorative ? null : "NH"} tone={tone} className={className} />;
}
