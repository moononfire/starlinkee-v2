import { notFound } from "next/navigation";
import { getLeadByToken } from "@/lib/db/leads";
import { getLocationBySlug } from "@/lib/db/locations";
import ClaimClient from "./ClaimClient";
import PageTracker from "@/components/tracking/PageTracker";

interface Props {
  params: Promise<{ slug: string; token: string }>;
}

export default async function ClaimPage({ params }: Props) {
  const { slug, token } = await params;

  const lead = await getLeadByToken(token);
  if (!lead) notFound();

  const location = await getLocationBySlug(slug);
  if (!location) notFound();

  return (
    <>
      <PageTracker locationId={location.location_id} pagePath={`/l/${slug}/promo/claim`} pageType="promo_claim" />
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
          <p className="text-sm text-gray-500 text-center mb-8">Twój kupon promocyjny</p>

          <ClaimClient
            isUsed={lead.is_used}
            bannerText={location.promo_banner_text ?? ""}
            couponCode={lead.coupon_code ?? ""}
          />
        </div>
      </main>
    </>
  );
}
