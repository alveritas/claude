import Image from "next/image";
import Link from "next/link";
import { AdminHead } from "@/components/admin/AdminHead";
import { adminProducts } from "@/lib/server/admin-data";
import { requireAdmin } from "@/lib/server/auth";
import { familyOf } from "@/lib/shared/colorways";
import { formatPrice } from "@/lib/shared/format";
import { CATEGORY_LABELS } from "@/lib/shared/types";

const STATUS: Record<string, string> = { draft: "Draft", coming_soon: "Coming soon", available: "Available", archived: "Archived" };

export default async function ProductsAdmin() {
  const { supabase } = await requireAdmin();
  const products = await adminProducts(supabase);
  return (
    <>
      <AdminHead title="Products">Prices, sizes and stock stay empty until you enter confirmed values. Empty fields show as “to be confirmed” on the site.</AdminHead>
      <Link href="/admin/products/new" className="btn btn-solid mb-8">New product</Link>
      <div className="max-w-5xl overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[0.875rem]">
          <thead className="muted text-[0.75rem]">
            <tr className="border-b border-rule">
              <th className="py-3 font-normal" colSpan={2}>Product</th>
              <th className="py-3 font-normal">Status</th>
              <th className="py-3 font-normal">Price</th>
              <th className="py-3 font-normal">Stock</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-rule">
                <td className="w-14 py-3">
                  <div className="frame h-14 w-11">
                    {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="44px" className="object-cover" />}
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <Link href={`/admin/products/${p.id}`} className="hover:underline">{p.name}</Link>
                  <span className="muted block text-[0.75rem]">{CATEGORY_LABELS[p.category]} · /{p.slug}</span>
                  {familyOf(p, products).length > 1 && (
                    <span className="muted block text-[0.75rem]">
                      Shown as one item with{" "}
                      {familyOf(p, products)
                        .filter((o) => o.id !== p.id)
                        .map((o) => o.name)
                        .join(", ")}
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4">{STATUS[p.status]}</td>
                <td className="py-3 pr-4 tabular-nums">{p.priceCents == null ? <span className="muted">Not set</span> : formatPrice(p.priceCents)}</td>
                <td className="py-3 tabular-nums">
                  {p.variants.length ? p.variants.map((v) => `${v.size}: ${v.stock}`).join("  ") : <span className="muted">No sizes</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
