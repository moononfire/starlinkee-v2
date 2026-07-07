import { notFound, redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { getLocationBySlug } from "@/lib/db/locations";
import { getPlatesBySubscriptionId } from "@/lib/db/plates";
import { createScanRecord, findScanIdByDevice } from "@/lib/db/reviews";

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

  const [headersList, cookieStore] = await Promise.all([headers(), cookies()]);
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headersList.get("x-real-ip") ?? null;
  const userAgent = headersList.get("user-agent") ?? null;
  const deviceId = cookieStore.get("_did")?.value ?? null;

  // Reuse this device's existing scan for this plate instead of minting a
  // fresh one — otherwise a visitor could go back to the linktree page and
  // tap "leave a review" again to re-roll a low rating into a 5-star one.
  const existingScanId = deviceId ? await findScanIdByDevice(plate.plate_id, deviceId) : null;
  const scanId =
    existingScanId ??
    (await createScanRecord(plate.plate_id, { ip_address: ip, user_agent: userAgent, device_id: deviceId }));

  redirect(`/plate/${plate.plate_number}/scan/${scanId}`);
}
