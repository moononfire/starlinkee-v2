import { notFound } from "next/navigation";
import { getLocationBySlug, getLocationLinksByLocationId, incrementLinktreeVisits } from "@/lib/db/locations";
import { getPlatesBySubscriptionId } from "@/lib/db/plates";
import LinktreeProfile from "@/components/linktree/LinktreeProfile";
import PageTracker from "@/components/tracking/PageTracker";
import { getLanguage } from "@/lib/language";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ scan?: string }>;
}

export default async function LinktreePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { scan } = await searchParams;

  const location = await getLocationBySlug(slug);
  if (!location) notFound();

  const [links, plates] = await Promise.all([
    getLocationLinksByLocationId(location.location_id),
    getPlatesBySubscriptionId(location.subscription_id),
  ]);
  const plateLanguage = plates[0]?.plate_language ?? "pl";
  const lang = await getLanguage(plateLanguage);

  incrementLinktreeVisits(location.location_id).catch(() => {});

  return (
    <>
      <PageTracker locationId={location.location_id} pagePath={`/l/${slug}`} pageType="linktree" />
      <LinktreeProfile location={location} links={links} slug={slug} scanToken={scan} lang={lang} />
    </>
  );
}
