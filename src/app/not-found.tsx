import Link from "next/link";

export default function RootNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="page-title">Not found</h1>
      <p className="muted">This page doesn’t exist, or it has moved.</p>
      <Link href="/" className="btn btn-line">
        Go home
      </Link>
    </div>
  );
}
