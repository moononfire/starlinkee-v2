import { notFound } from "next/navigation";
import { getLocationBySlug } from "@/lib/db/locations";
import { getPlatesBySubscriptionId } from "@/lib/db/plates";
import { createScanRecord } from "@/lib/db/reviews";
import RatingStars from "@/components/plate/RatingStars";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LinktreeReviewPage({ params }: Props) {
  const { slug } = await params;

  const location = await getLocationBySlug(slug);
  if (!location) notFound();

  const plates = await getPlatesBySubscriptionId(location.subscription_id);
  if (plates.length === 0) notFound();

  const plate = plates[0];
  const scanId = await createScanRecord(plate.plate_id);
  const lang = plate.plate_language;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="max-w-sm w-full flex flex-col items-center gap-6">
        {location.logo_link && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={location.logo_link}
            alt={location.location_name}
            className="h-24 w-auto object-contain"
          />
        )}

        <h1 className="text-xl font-semibold text-gray-800 text-center">
          {location.location_name}
        </h1>

        <RatingStars
          scanId={scanId}
          googleReviewLink={location.google_review_link ?? ""}
          lang={lang}
        />
      </div>
    </main>
  );
}
