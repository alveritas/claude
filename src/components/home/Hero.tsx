"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/brand/Brand";
import { useStore } from "@/components/providers/StoreProvider";
import { useParallax } from "@/lib/client/hooks";
import { launchCountdown } from "@/lib/shared/commerce";

export function Countdown({ launchDate }: { launchDate: string | null }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  if (now === null) return null;
  const c = launchCountdown(launchDate, now);
  if (!c) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <p className="text-[0.8125rem] tabular-nums tracking-[0.12em]" aria-label="Time until release">
      <span>{c.days}</span>
      <span className="muted"> days </span>
      <span>
        {pad(c.hours)}:{pad(c.minutes)}:{pad(c.seconds)}
      </span>
    </p>
  );
}

/**
 * Full-bleed cover. The cover photo is a studio shot cut out to a transparent WebP
 * (public/images/hero/cover.webp), so the figures stand on the page's own off-white and
 * their legs dissolve under the wordmark. It starts below the header so nothing is cut off, and runs
 * past the bottom of the screen so the fade does the cropping.
 */
export function Hero() {
  const { content, settings } = useStore();
  // The figures drift down at a quarter of the scroll speed as the page moves up.
  const ref = useParallax<HTMLElement>(-0.25, "--hero-shift");
  return (
    <section ref={ref} aria-label="Introduction" className="relative h-[100svh] min-h-[620px] overflow-hidden bg-ink">
      {content.hero_image && (
        <div className="hero-parallax">
        <div className="hero-frame absolute inset-x-0 top-[calc(var(--top-h)+8px)] bottom-[-14svh] lg:bottom-[-18svh]">
          <Image
            src={content.hero_image}
            alt={content.hero_image_alt}
            fill
            priority
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-contain"
            style={{ objectPosition: "50% 0%" }}
          />
        </div>
        </div>
      )}
      <div className="hero-shade pointer-events-none absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-4 pb-[max(9vh,72px)] text-center">
        <h1 data-hero-mark className="hero-mark w-[min(86vw,700px)]">
          <Wordmark priority sizes="(min-width: 768px) 700px, 86vw" className="w-full" />
        </h1>
        <div className="hero-copy mt-6 flex flex-col items-center gap-4 md:mt-8">
          <p className="text-[1rem] font-light tracking-[0.02em] text-bone md:text-[1.125rem]">{content.hero_tagline}</p>
          <p className="caps muted">{settings.mode === "live" ? content.hero_status_live : content.hero_status}</p>
          <Countdown launchDate={settings.launchDate} />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <Link href="/shop" className="btn btn-solid min-w-[230px]">
              Explore collection
            </Link>
            <Link href="/about" className="btn btn-line min-w-[230px]">
              Discover the brand
            </Link>
          </div>
        </div>
      </div>
      <div className="hero-copy absolute bottom-0 left-1/2 hidden -translate-x-1/2 md:block" aria-hidden="true">
        <div className="scroll-cue" />
      </div>
    </section>
  );
}
