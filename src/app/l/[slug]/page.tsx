import { notFound } from "next/navigation";
import { getLocationBySlug, getLocationLinksByLocationId, incrementLinktreeVisits } from "@/lib/db/locations";
import LinktreeProfile from "@/components/linktree/LinktreeProfile";
import PageTracker from "@/components/tracking/PageTracker";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ scan?: string }>;
}

export default async function LinktreePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { scan } = await searchParams;

  const location = await getLocationBySlug(slug);
  if (!location) notFound();

  const links = await getLocationLinksByLocationId(location.location_id);

  incrementLinktreeVisits(location.location_id).catch(() => {});

  return (
    <>
      <PageTracker locationId={location.location_id} pagePath={`/l/${slug}`} pageType="linktree" />
      <LinktreeProfile location={location} links={links} slug={slug} scanToken={scan} />
    </>
  );
}
