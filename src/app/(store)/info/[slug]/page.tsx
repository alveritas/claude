import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InfoView } from "@/components/views/MiscViews";
import { INFO_PAGES, type InfoSlug } from "@/lib/shared/content";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(INFO_PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = INFO_PAGES[slug as InfoSlug];
  return page ? { title: page.title, alternates: { canonical: `/info/${slug}` } } : {};
}

export default async function InfoPage({ params }: Props) {
  const { slug } = await params;
  if (!(slug in INFO_PAGES)) notFound();
  return <InfoView slug={slug as InfoSlug} />;
}
