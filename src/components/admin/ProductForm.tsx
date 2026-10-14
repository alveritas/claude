import type { Product } from "@/lib/shared/types";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/shared/types";
import { saveProduct } from "@/app/admin/actions";
import { AdminForm, Check, Field } from "./AdminUI";
import { Panel } from "./AdminHead";

export function ProductForm({ product, collections }: { product?: Product; collections: { id: string; name: string }[] }) {
  const p = product;
  return (
    <AdminForm action={saveProduct} submitLabel={p ? "Save product" : "Create product"}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <Panel title="Basics">
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Name" name="name" defaultValue={p?.name} required hint="Shown after “NEVERHOLLOW”, e.g. Vow Waffle Long Sleeve. Another color of the same piece: same name and category, ending in its color word (Hush Tee Obsidian, Hush Tee Bone). The shop then shows them as one item with color options. Words that work include Obsidian, Bone, Fawn, Black, White, Cream, Stone, Olive, Navy and Brown." />
          <Field label="URL slug" name="slug" defaultValue={p?.slug} hint="Lowercase and hyphens. Leave empty to generate from the name." />
          <div>
            <label htmlFor="f-category" className="label">Category</label>
            <select id="f-category" name="category" defaultValue={p?.category ?? "tops"} className="select w-full">
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-status" className="label">Status</label>
            <select id="f-status" name="status" defaultValue={p?.status ?? "draft"} className="select w-full">
              <option value="draft">Draft — hidden</option>
              <option value="coming_soon">Coming soon — visible, not purchasable</option>
              <option value="available">Available — purchasable when the store is live</option>
              <option value="archived">Archived — hidden</option>
            </select>
          </div>
          <Field label="Price" name="price" defaultValue={p?.priceCents != null ? (p.priceCents / 100).toFixed(2) : ""} placeholder="Not set" hint="Leave empty until the price is confirmed." />
          <Field label="Color" name="color" defaultValue={p?.color} />
          <div>
            <label htmlFor="f-collection" className="label">Collection</label>
            <select id="f-collection" name="collection_id" defaultValue={p?.collectionId ?? ""} className="select w-full">
              <option value="">None</option>
              {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Field label="Sort order" name="sort_order" type="number" defaultValue={p?.sortOrder ?? 0} hint="Lower numbers appear first." />
        </div>
        <div className="mt-6">
          <Check label="Featured on the homepage" name="featured" defaultChecked={p?.featured ?? false} />
        </div>
      </Panel>
      <Panel title="Details">
        <div className="grid gap-6">
          <Field label="Description" name="description" defaultValue={p?.description} multiline rows={3} />
          <Field label="Fit" name="fit" defaultValue={p?.fit} multiline rows={3} hint="Only confirmed information. Empty shows “Fit notes are coming soon”." />
          <Field label="Fabric composition and origin" name="composition" defaultValue={p?.composition} multiline rows={2} hint="Fibre content and country of origin, as on the care label, e.g. “100% cotton. Made in Portugal.” Required for clothing sold online in the US, UK and EU." />
          <Field label="Care instructions" name="care" defaultValue={p?.care} multiline rows={3} />
          <Field label="Size guide" name="size_guide" defaultValue={p?.sizeGuide} multiline rows={6} hint="Paste the measurements from your manufacturer as a table: one line per size, columns separated by tabs (copying cells from a spreadsheet does this) or |. The first line is the header, e.g. Size | Chest (cm) | Length (cm) | Sleeve (cm). Lines without columns show as notes, e.g. “Measured flat.” or “Model is 6’1” and wears L.”" />
        </div>
      </Panel>
    </AdminForm>
  );
}
