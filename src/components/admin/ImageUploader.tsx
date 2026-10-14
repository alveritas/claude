"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { registerImages } from "@/app/admin/actions";
import { getBrowserSupabase } from "@/lib/client/supabase";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
const MAX_MB = 20;

/**
 * Uploads straight from the browser to Supabase Storage (allowed for admins only by the storage
 * policies), so large photos don't hit the hosting platform's request size limit. The server
 * then checks and records each file.
 */
export function ImageUploader({ productId }: { productId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("files") as HTMLInputElement | null;
    const files = Array.from(input?.files ?? []);
    if (!files.length) return setMsg({ ok: false, text: "Choose at least one image." });
    const bad = files.find((f) => !TYPES[f.type]);
    if (bad) return setMsg({ ok: false, text: `${bad.name}: use JPG, PNG, WebP or AVIF.` });
    const big = files.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (big) return setMsg({ ok: false, text: `${big.name} is larger than ${MAX_MB} MB.` });
    const sb = getBrowserSupabase();
    if (!sb) return setMsg({ ok: false, text: "Supabase isn’t connected yet." });

    setBusy(true);
    setMsg(null);
    const paths: string[] = [];
    for (const [i, file] of files.entries()) {
      setMsg({ ok: true, text: `Uploading ${i + 1} of ${files.length}…` });
      const path = `${productId}/${crypto.randomUUID()}.${TYPES[file.type]}`;
      const { error } = await sb.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        setBusy(false);
        return setMsg({ ok: false, text: `${file.name}: ${error.message}` });
      }
      paths.push(path);
    }
    const fd = new FormData();
    fd.set("product_id", productId);
    for (const p of paths) fd.append("paths", p);
    const res = await registerImages({}, fd);
    setBusy(false);
    if (res.error) return setMsg({ ok: false, text: res.error });
    setMsg({ ok: true, text: res.ok ?? "Uploaded." });
    if (input) input.value = "";
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      <label className="label" htmlFor="files">
        Add images (JPG, PNG, WebP or AVIF, up to {MAX_MB} MB each)
      </label>
      <input id="files" name="files" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="mt-2 block text-[0.8125rem]" />
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-solid" disabled={busy}>
          {busy ? "Uploading…" : "Upload"}
        </button>
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "form-success" : "form-error"}>
            {msg.text}
          </p>
        )}
      </div>
    </form>
  );
}
