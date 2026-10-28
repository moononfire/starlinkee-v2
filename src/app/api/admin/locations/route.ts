import { NextRequest, NextResponse } from "next/server";
import { updateLocation, upsertLocationLinks } from "@/lib/db/locations";
import { requireAdmin } from "@/lib/api-auth";
import { isSafeHttpUrl, isSafeGoogleReviewUrl } from "@/lib/urls";

// Only the fields the admin form edits; anything else (subscription_id, ids, ...) is rejected.
const EDITABLE_FIELDS = [
  "linktree_slug",
  "has_linktree_access",
  "has_promo_enabled",
  "has_loyalty_enabled",
  "promo_banner_text",
  "promo_sms_text",
  "google_review_link",
  "google_places_id",
  "support_email",
  "logo_link",
  "owner_email",
];

export async function PUT(req: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = await req.json();
  const { location_id, links, ...updates } = body;

  if (!location_id) {
    return NextResponse.json({ error: "location_id required" }, { status: 400 });
  }

  const unknown = Object.keys(updates).filter((k) => !EDITABLE_FIELDS.includes(k));
  if (unknown.length > 0) {
    return NextResponse.json({ error: `Unknown field(s): ${unknown.join(", ")}` }, { status: 400 });
  }
  if (updates.google_review_link && !isSafeGoogleReviewUrl(updates.google_review_link)) {
    return NextResponse.json({ error: "Invalid Google review link" }, { status: 400 });
  }

  if (Array.isArray(links)) {
    const badLink = links.find((l) => !isSafeHttpUrl(String(l?.url ?? "")));
    if (badLink) {
      return NextResponse.json(
        { error: "Link URLs must start with http:// or https://" },
        { status: 400 }
      );
    }
  }

  const location = await updateLocation(location_id, updates);

  if (Array.isArray(links)) {
    await upsertLocationLinks(location_id, links);
  }

  return NextResponse.json({ location });
}
