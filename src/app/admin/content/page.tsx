import { AdminHead, Panel } from "@/components/admin/AdminHead";
import { AdminForm, Field } from "@/components/admin/AdminUI";
import { adminContent } from "@/lib/server/admin-data";
import { requireAdmin } from "@/lib/server/auth";
import { CONTENT_FIELDS } from "@/lib/shared/content";
import { saveContent } from "../actions";

export default async function ContentAdmin() {
  const { supabase } = await requireAdmin();
  const { stored } = await adminContent(supabase);
  const groups = ["Homepage", "About", "Pages", "Checkout", "Business"] as const;
  return (
    <>
      <AdminHead title="Content">
        Every block of copy on the site. The policies are written for how this store works (Stripe checkout, worldwide
        shipping, all sales final) — read them through and change anything that doesn’t match your business. They aren’t legal
        advice, so have them checked if you can. <code>{"{contact_email}"}</code> is replaced with the contact email from Launch.
        Clearing a field brings back the default text.
      </AdminHead>
      <AdminForm action={saveContent} submitLabel="Save all content">
        {groups.map((g) => (
          <Panel key={g} title={g}>
            <div className="grid gap-7">
              {CONTENT_FIELDS.filter((f) => f.group === g).map((f) => (
                <Field
                  key={f.key}
                  label={f.label}
                  name={f.key}
                  defaultValue={stored.get(f.key)?.trim() ? stored.get(f.key) : f.defaultValue}
                  placeholder={f.defaultValue}
                  multiline={"multiline" in f && f.multiline}
                  rows={f.group === "Pages" ? 14 : 3}
                />
              ))}
            </div>
          </Panel>
        ))}
      </AdminForm>
    </>
  );
}
