import { notFound } from "next/navigation";
import { getLocationBySlug, getLocationLinksByLocationId, incrementLinktreeVisits } from "@/lib/db/locations";
import LinktreeProfile from "@/components/linktree/LinktreeProfile";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LinktreePage({ params }: Props) {
  const { slug } = await params;

  const location = await getLocationBySlug(slug);
  if (!location) notFound();

  const links = await getLocationLinksByLocationId(location.location_id);

  incrementLinktreeVisits(location.location_id).catch(() => {});

  return <LinktreeProfile location={location} links={links} slug={slug} />;
}
