"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductImage as Img } from "@/lib/shared/types";

/**
 * A product photo filling its frame. Below-the-fold photos fade in once loaded (skeleton shows
 * meanwhile); priority photos show immediately, so the first paint doesn't wait for JavaScript.
 */
export function ProductImage({
  image,
  sizes,
  priority = false,
  className = "",
  fit,
}: {
  image: Img;
  sizes: string;
  priority?: boolean;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const [loaded, setLoaded] = useState(false);
  const mode = fit ?? image.fit;
  return (
    <Image
      src={image.url}
      alt={image.alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={90}
      onLoad={() => setLoaded(true)}
      data-loaded={loaded}
      className={priority ? className : `img-fade ${className}`}
      style={{ objectFit: mode, objectPosition: mode === "cover" ? image.focal : "50% 50%" }}
      draggable={false}
    />
  );
}
