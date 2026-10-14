"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/auth";
import { isCountryCode } from "@/lib/shared/countries";

export interface FormState {
  error?: string;
  ok?: string;
}

const text = (fd: FormData, key: string, max = 200) => String(fd.get(key) ?? "").trim().slice(0, max);

export async function saveAddress(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/account/addresses");
  const address = {
    user_id: user.id,
    full_name: text(fd, "full_name"),
    line1: text(fd, "line1"),
    line2: text(fd, "line2") || null,
    city: text(fd, "city"),
    region: text(fd, "region") || null,
    postal_code: text(fd, "postal_code", 32) || null,
    country: text(fd, "country", 2).toUpperCase(),
    phone: text(fd, "phone", 40) || null,
    is_default: fd.get("is_default") === "on",
  };
  if (!address.full_name || !address.line1 || !address.city) return { error: "Name, address line 1 and city are required." };
  if (!isCountryCode(address.country)) return { error: "Choose a country." };
  if (address.is_default) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  }
  const { error } = await supabase.from("addresses").insert(address);
  if (error) return { error: "That address couldn’t be saved. Try again." };
  revalidatePath("/account/addresses");
  return { ok: "Address saved." };
}

export async function deleteAddress(fd: FormData): Promise<void> {
  const { supabase, user } = await requireUser("/account/addresses");
  const id = text(fd, "id", 64);
  await supabase.from("addresses").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/account/addresses");
}

export async function makeDefaultAddress(fd: FormData): Promise<void> {
  const { supabase, user } = await requireUser("/account/addresses");
  const id = text(fd, "id", 64);
  await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  await supabase.from("addresses").update({ is_default: true }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/account/addresses");
}

export async function saveProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/account/settings");
  const { error } = await supabase.from("profiles").update({ full_name: text(fd, "full_name", 120) || null }).eq("id", user.id);
  if (error) return { error: "Your name couldn’t be saved. Try again." };
  revalidatePath("/account");
  return { ok: "Saved." };
}
