import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHead, Panel } from "@/components/admin/AdminHead";
import { AdminForm, ConfirmButton, Field, Submit, VariantEditor } from "@/components/admin/AdminUI";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ProductForm } from "@/components/admin/ProductForm";
import { adminCollections } from "@/lib/server/admin-data";
import { requireAdmin } from "@/lib/server/auth";
import { mapProduct, PRODUCT_SELECT } from "@/lib/server/catalog";
import { deleteImage, deleteProduct, moveImage, saveVariants, updateImage } from "../../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> };

export default async function EditProduct({ params, searchParams }: Props) {
  const { id } = await params;
  const { created } = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data }, collections] = await Promise.all([
    supabase.from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle(),
    adminCollections(supabase),
  ]);
  if (!data) notFound();
  const p = mapProduct(data);

  return (
    <>
      <Link href="/admin/products" className="text-link muted text-[0.75rem]">All products</Link>
      <div className="mt-4">
        <AdminHead title={p.name}>
          {created ? "Product created. Add images, then sizes and stock. " : ""}
          {p.status !== "draft" && p.status !== "archived" && (
            <Link href={`/products/${p.slug}`} className="text-link" target="_blank">View on site</Link>
          )}
        </AdminHead>
      </div>

      <ProductForm product={p} collections={collections} />

      <Panel title="Sizes and stock" className="mt-10">
        <p className="muted mb-5 text-[0.8125rem]">Stock is the real quantity you can ship. Orders reduce it automatically.</p>
        <VariantEditor action={saveVariants} productId={p.id} initial={p.variants.map((v) => ({ id: v.id, size: v.size, sku: v.sku ?? "", stock: v.stock }))} />
      </Panel>

      <Panel title="Images">
        <ImageUploader productId={p.id} />
        <ul className="mt-8 divide-y divide-rule border-t border-rule">
          {p.images.map((im, i) => (
            <li key={im.id} className="grid gap-5 py-6 md:grid-cols-[96px_1fr]">
              <div className="frame h-32 w-24">
                <Image src={im.url} alt="" fill sizes="96px" className="object-cover" style={{ objectPosition: im.focal }} />
              </div>
              <div>
                <AdminForm action={updateImage} submitLabel="Save image details">
                  <input type="hidden" name="id" value={im.id} />
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="View name" name="label" defaultValue={im.label} placeholder="Front, on model" />
                    <Field label="Alt text" name="alt" defaultValue={im.alt} hint="Describe the image for screen readers." />
                    <div>
                      <label className="label" htmlFor={`fit-${im.id}`}>Framing</label>
                      <select id={`fit-${im.id}`} name="fit" defaultValue={im.fit} className="select w-full">
                        <option value="cover">Fill the frame (crop)</option>
                        <option value="contain">Show whole image</option>
                      </select>
                    </div>
                    <Field label="Focal point" name="focal" defaultValue={im.focal} hint="Horizontal then vertical, e.g. 50% 30%." />
                  </div>
                </AdminForm>
                <div className="mt-4 flex flex-wrap gap-5">
                  <form action={moveImage}>
                    <input type="hidden" name="id" value={im.id} />
                    <input type="hidden" name="product_id" value={p.id} />
                    <input type="hidden" name="dir" value="up" />
                    <Submit className="text-link muted text-[0.75rem] disabled:opacity-30" pendingText="Moving…">{i === 0 ? "First" : "Move up"}</Submit>
                  </form>
                  <form action={moveImage}>
                    <input type="hidden" name="id" value={im.id} />
                    <input type="hidden" name="product_id" value={p.id} />
                    <input type="hidden" name="dir" value="down" />
                    <Submit className="text-link muted text-[0.75rem]" pendingText="Moving…">Move down</Submit>
                  </form>
                  <form action={deleteImage}>
                    <input type="hidden" name="id" value={im.id} />
                    <ConfirmButton message="Delete this image?">Delete image</ConfirmButton>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Delete product">
        <form action={deleteProduct}>
          <input type="hidden" name="id" value={p.id} />
          <ConfirmButton message={`Delete ${p.name}? This removes its images and sizes and can’t be undone.`}>Delete this product</ConfirmButton>
        </form>
      </Panel>
    </>
  );
}
