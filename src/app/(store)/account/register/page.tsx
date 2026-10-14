import { AuthForm } from "@/components/account/AuthForm";

type Props = { searchParams: Promise<{ next?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return <AuthForm mode="register" next={next} />;
}
