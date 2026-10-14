import Link from "next/link";
import { AdminHead } from "@/components/admin/AdminHead";
import { ProductForm } from "@/components/admin/ProductForm";
import { adminCollections } from "@/lib/server/admin-data";
import { requireAdmin } from "@/lib/server/auth";

export default async function NewProduct() {
  const { supabase } = await requireAdmin();
  const collections = await adminCollections(supabase);
  return (
    <>
      <Link href="/admin/products" className="text-link muted text-[0.75rem]">All products</Link>
      <div className="mt-4"><AdminHead title="New product">Save first, then add images, sizes and stock.</AdminHead></div>
      <ProductForm collections={collections} />
    </>
  );
}
