import { notFound } from "next/navigation";
import { getLocationBySlug, getLocationLinksByLocationId, incrementLinktreeVisits } from "@/lib/db/locations";
import { getPlatesBySubscriptionId } from "@/lib/db/plates";
import { claimLinktreeVisit } from "@/lib/db/scan-tokens";
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
  const lang = await getLanguage(slug, plateLanguage, location.active_languages);

  // Count a linktree visit only once per physical scan — revisits with the
  // same token (e.g. via the back button) and tokenless visits don't count.
  if (scan) {
    claimLinktreeVisit(scan, location.location_id)
      .then((firstVisit) => {
        if (firstVisit) return incrementLinktreeVisits(location.location_id);
      })
      .catch(() => {});
  }

  return (
    <>
      <PageTracker locationId={location.location_id} pagePath={`/l/${slug}`} pageType="linktree" />
      <LinktreeProfile location={location} links={links} slug={slug} scanToken={scan} lang={lang} />
    </>
  );
}
