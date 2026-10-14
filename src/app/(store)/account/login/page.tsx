import { redirect } from "next/navigation";
import { AuthForm } from "@/components/account/AuthForm";
import { getSessionUser } from "@/lib/server/auth";

type Props = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  if (await getSessionUser()) redirect(safe);
  return <AuthForm mode="login" next={safe} />;
}
