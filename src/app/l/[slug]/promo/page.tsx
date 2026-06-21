import { notFound } from "next/navigation";
import { getLocationBySlug } from "@/lib/db/locations";
import PromoForm from "@/components/linktree/PromoForm";
import PageTracker from "@/components/tracking/PageTracker";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ scan?: string }>;
}

export default async function PromoPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { scan } = await searchParams;

  const location = await getLocationBySlug(slug);
  if (!location || !location.has_promo_enabled) notFound();

  return (
    <>
      <PageTracker locationId={location.location_id} pagePath={`/l/${slug}/promo`} pageType="promo" />
      <main className="min-h-screen bg-gray-50 flex items-start justify-center pt-16 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
          {location.logo_link && (
            <img
              src={location.logo_link}
              alt={location.location_name}
              className="w-16 h-16 object-contain rounded-xl mx-auto mb-4"
            />
          )}
          <h1 className="text-xl font-semibold text-gray-800 text-center mb-1">{location.location_name}</h1>
          <p className="text-sm text-gray-500 text-center mb-8">Odbierz swoją promocję</p>

          <PromoForm slug={slug} bannerText={location.promo_banner_text ?? ""} scanToken={scan} />
        </div>
      </main>
    </>
  );
}
