import { notFound } from "next/navigation";
import { getLocationById, getLocationLinksByLocationId } from "@/lib/db/locations";
import LocationEditForm from "./LocationEditForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PlaceEditPage({ params }: Props) {
  const { id } = await params;
  const locationId = parseInt(id);
  if (isNaN(locationId)) notFound();

  const location = await getLocationById(locationId);
  if (!location) notFound();

  const links = await getLocationLinksByLocationId(locationId);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Edycja: {location.location_name}
      </h1>
      <LocationEditForm location={location} initialLinks={links} />
    </div>
  );
}
