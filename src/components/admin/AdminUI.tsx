"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { AdminState } from "@/app/admin/actions";

type Action = (state: AdminState, fd: FormData) => Promise<AdminState>;

export function Submit({ children, className = "btn btn-solid", pendingText = "Saving…" }: { children: ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

/** Form bound to a server action with inline success / error feedback. */
export function AdminForm({
  action,
  children,
  submitLabel = "Save",
  className = "",
}: {
  action: Action;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {children}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Submit>{submitLabel}</Submit>
        {state.error && <p role="alert" className="form-error">{state.error}</p>}
        {state.ok && <p role="status" className="form-success">{state.ok}</p>}
      </div>
    </form>
  );
}

/** A destructive submit that asks first. Put it inside a <form action={serverAction}>. */
export function ConfirmButton({ children, message, className = "text-link text-[0.75rem] text-[var(--danger)]" }: { children: ReactNode; message: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {pending ? "Working…" : children}
    </button>
  );
}

export function Field({
  label,
  name,
  defaultValue,
  type = "text",
  hint,
  required,
  placeholder,
  multiline,
  rows = 4,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}) {
  const id = `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {multiline ? (
        <textarea id={id} name={name} defaultValue={defaultValue ?? ""} rows={rows} placeholder={placeholder} required={required} className="field resize-y leading-relaxed" />
      ) : (
        <input id={id} name={name} type={type} defaultValue={defaultValue ?? ""} placeholder={placeholder} required={required} className="field" />
      )}
      {hint && <p className="muted mt-1.5 text-[0.75rem]">{hint}</p>}
    </div>
  );
}

export function Check({ label, name, defaultChecked, hint }: { label: string; name: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-3 text-[0.875rem]">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="check" />
      <span>
        {label}
        {hint && <span className="muted block text-[0.75rem]">{hint}</span>}
      </span>
    </label>
  );
}

interface VariantRow {
  id?: string;
  size: string;
  sku: string;
  stock: number | string;
}

/** Sizes, SKUs and stock per size. Serialised to JSON for the saveVariants action. */
export function VariantEditor({ action, productId, initial }: { action: Action; productId: string; initial: VariantRow[] }) {
  const [rows, setRows] = useState<VariantRow[]>(initial);
  const set = (i: number, patch: Partial<VariantRow>) => setRows((r) => r.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  return (
    <AdminForm action={action} submitLabel="Save sizes and stock">
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="variants" value={JSON.stringify(rows)} />
      <table className="w-full text-left text-[0.875rem]">
        <thead className="muted text-[0.75rem]">
          <tr>
            <th className="pb-2 font-normal">Size</th>
            <th className="pb-2 font-normal">SKU (optional)</th>
            <th className="pb-2 font-normal">Stock</th>
            <th className="pb-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? `new-${i}`} className="border-t border-rule">
              <td className="py-2 pr-3">
                <input aria-label="Size" className="field" value={r.size} onChange={(e) => set(i, { size: e.target.value })} placeholder="M" />
              </td>
              <td className="py-2 pr-3">
                <input aria-label="SKU" className="field" value={r.sku} onChange={(e) => set(i, { sku: e.target.value })} />
              </td>
              <td className="py-2 pr-3">
                <input aria-label="Stock" className="field w-24" type="number" min={0} step={1} value={r.stock} onChange={(e) => set(i, { stock: e.target.value })} />
              </td>
              <td className="py-2 text-right">
                <button type="button" className="text-link muted text-[0.75rem]" onClick={() => setRows((rs) => rs.filter((_, k) => k !== i))}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="muted mt-2 text-[0.8125rem]">No sizes yet. Customers see “Sizes coming soon”.</p>}
      <button type="button" className="chip mt-4" onClick={() => setRows((r) => [...r, { size: "", sku: "", stock: 0 }])}>
        Add size
      </button>
    </AdminForm>
  );
}

/** datetime-local in the admin's own timezone, submitted as an ISO timestamp. */
export function LocalDateTime({ name, label, defaultIso, hint }: { name: string; label: string; defaultIso: string | null; hint?: string }) {
  const toLocal = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [local, setLocal] = useState(() => toLocal(defaultIso));
  const iso = local ? new Date(local).toISOString() : "";
  return (
    <div>
      <label htmlFor={`f-${name}`} className="label">
        {label}
      </label>
      <input id={`f-${name}`} type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} className="field" suppressHydrationWarning />
      <input type="hidden" name={name} value={iso} />
      {hint && <p className="muted mt-1.5 text-[0.75rem]">{hint}</p>}
    </div>
  );
}
