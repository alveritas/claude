import type { ReactNode } from "react";

export function AdminHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-10 max-w-3xl">
      <h1 className="text-[1.75rem] font-light md:text-[2.25rem]">{title}</h1>
      {children && <div className="muted mt-3 text-[0.875rem] leading-relaxed">{children}</div>}
    </div>
  );
}

export function Panel({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`mb-8 max-w-4xl border border-rule bg-surface p-5 md:p-7 ${className}`}>
      {title && <h2 className="mb-5 text-[1.0625rem] font-normal">{title}</h2>}
      {children}
    </section>
  );
}
