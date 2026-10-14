"use client";

import Link from "next/link";

export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="shell flex min-h-[60vh] flex-col items-start justify-center gap-6 py-24">
      <h1 className="page-title">Something went wrong</h1>
      <p className="muted max-w-md">This page couldn’t load. Try again, or come back in a moment.</p>
      <div className="flex gap-3">
        <button type="button" className="btn btn-solid" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn btn-line">
          Go home
        </Link>
      </div>
    </div>
  );
}
