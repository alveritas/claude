import { AdminHead, Panel } from "@/components/admin/AdminHead";
import { AdminForm, Check, ConfirmButton, Field } from "@/components/admin/AdminUI";
import { adminCollections } from "@/lib/server/admin-data";
import { requireAdmin } from "@/lib/server/auth";
import { deleteCollection, saveCollection } from "../actions";

export default async function CollectionsAdmin() {
  const { supabase } = await requireAdmin();
  const collections = await adminCollections(supabase);
  return (
    <>
      <AdminHead title="Collections">Assign products to a collection from each product’s page.</AdminHead>
      {collections.map((c) => (
        <Panel key={c.id} title={c.name}>
          <AdminForm action={saveCollection}>
            <input type="hidden" name="id" value={c.id} />
            <div className="grid gap-6 md:grid-cols-3">
              <Field label="Name" name="name" defaultValue={c.name} required />
              <Field label="Slug" name="slug" defaultValue={c.slug} />
              <Field label="Sort order" name="sort_order" type="number" defaultValue={c.sort_order} />
            </div>
            <div className="mt-6 grid gap-6">
              <Field label="Description" name="description" defaultValue={c.description} multiline rows={2} />
              <Check label="Published" name="is_published" defaultChecked={c.is_published} />
            </div>
          </AdminForm>
          <form action={deleteCollection} className="mt-4">
            <input type="hidden" name="id" value={c.id} />
            <ConfirmButton message={`Delete ${c.name}? Its products stay, unassigned.`}>Delete collection</ConfirmButton>
          </form>
        </Panel>
      ))}
      <Panel title="New collection">
        <AdminForm action={saveCollection} submitLabel="Create collection">
          <div className="grid gap-6 md:grid-cols-3">
            <Field label="Name" name="name" required />
            <Field label="Slug" name="slug" />
            <Field label="Sort order" name="sort_order" type="number" defaultValue={0} />
          </div>
          <div className="mt-6 grid gap-6">
            <Field label="Description" name="description" multiline rows={2} />
            <Check label="Published" name="is_published" defaultChecked />
          </div>
        </AdminForm>
      </Panel>
    </>
  );
}
