import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ShopSkeleton } from "@/components/views/Skeletons";
import { ShopView } from "@/components/views/ShopView";
import { getStoreData } from "@/lib/server/catalog";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { collections } = await getStoreData();
  return collections.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { collections } = await getStoreData();
  const c = collections.find((x) => x.slug === slug);
  return c
    ? { title: c.name, description: c.description ?? undefined, alternates: { canonical: `/collections/${c.slug}` } }
    : { title: "Not found" };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const { collections } = await getStoreData();
  const collection = collections.find((c) => c.slug === slug);
  if (!collection) notFound();
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <ShopView collection={collection} />
    </Suspense>
  );
}
