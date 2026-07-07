import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  getCustomerByEmail,
  getCustomerSubscriptions,
  getScanCountsBySubscription,
} from "@/lib/db/portal";
import type { CustomerLocationLink, Review } from "@/lib/types";
import PortalSetupForm from "../settings/PortalSetupForm";
import LogoUpload from "../settings/LogoUpload";
import GoogleLocationEditor from "../settings/GoogleLocationEditor";
import LinktreeLinksEditor from "../settings/LinktreeLinksEditor";
import { updateScanRedirectMode, updateLinktreeSlug, updateFourStarRedirect } from "../settings/actions";
import { updateLocationName, updateSupportEmail } from "../settings/[subscriptionId]/actions";
import { getLocationLinksByLocationId, ensureLinktreeSlug } from "@/lib/db/locations";
import SavedToast from "../SavedToast";
import { getAllReviewsBySubscription } from "@/lib/db/portal";
import { getLanguage } from "@/lib/language";
import { t } from "@/lib/translations";

interface Props {
  params: Promise<{ subscriptionId: string }>;
  searchParams: Promise<{ saved?: string; linktreeError?: string }>;
}

const DATE_LOCALES: Record<string, string> = { en: "en-US", de: "de-DE", pl: "pl-PL" };

function formatDate(d: string | null, lang: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(DATE_LOCALES[lang] ?? "en-US");
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500">
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

export default async function SubscriptionPage({ params, searchParams }: Props) {
  const { subscriptionId: rawId } = await params;
  const { saved, linktreeError } = await searchParams;
  const subscriptionId = Number(rawId);
  if (!subscriptionId) notFound();

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const customer = await getCustomerByEmail(user.email);
  if (!customer) redirect("/portal/login");

  const lang = await getLanguage();

  const subscriptions = await getCustomerSubscriptions(customer.customer_id);
  const sub = subscriptions.find((s) => s.subscription_id === subscriptionId);
  if (!sub) notFound();

  const { total: totalScans, byPlate: scansByPlate } = await getScanCountsBySubscription(subscriptionId);

  const locationLinks: CustomerLocationLink[] = sub.location?.has_linktree_access
    ? await getLocationLinksByLocationId(sub.location.location_id)
    : [];

  if (sub.location?.has_linktree_access && !sub.location.linktree_slug) {
    sub.location.linktree_slug = await ensureLinktreeSlug(
      sub.location.location_id,
      sub.location.location_name
    );
  }

  // --- PENDING ---
  if (sub.status === "pending") {
    return (
      <div className="space-y-6">
        <SubHeader sub={sub} totalScans={totalScans} scansByPlate={scansByPlate} lang={lang} />
        <PortalSetupForm subscriptionId={sub.subscription_id} lang={lang} />
      </div>
    );
  }

  // --- INACTIVE ---
  if (sub.status === "inactive") {
    return (
      <div className="space-y-6">
        <SubHeader sub={sub} totalScans={totalScans} scansByPlate={scansByPlate} lang={lang} />

        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-5">
          <div className="flex gap-3">
            <svg
              className="shrink-0 w-5 h-5 text-red-500 dark:text-red-400 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-300">
                {t("portal_subscription_inactive_title", lang)}
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                {t("portal_subscription_inactive_message", lang)}
              </p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-2">
                {t("portal_contact_to_renew", lang)}{" "}
                <a
                  href="mailto:kontakt@starlinkee.pl"
                  className="underline font-medium hover:text-red-900 dark:hover:text-red-200 transition-colors"
                >
                  kontakt@starlinkee.pl
                </a>
              </p>
            </div>
          </div>
        </div>

        {sub.location && (
          <>
            <p className="text-xs text-gray-400 dark:text-gray-500 px-1">
              {t("portal_data_preserved", lang)}
            </p>
            <div className="opacity-50 pointer-events-none select-none space-y-6">
              <LocationSettings sub={sub} locationLinks={locationLinks} lang={lang} />
            </div>
          </>
        )}
      </div>
    );
  }

  // --- ACTIVE ---
  const allReviews = await getAllReviewsBySubscription(subscriptionId);
  const reviewTotal = allReviews.length;
  const reviewAvg = reviewTotal > 0
    ? Math.round((allReviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviewTotal) * 100) / 100
    : null;
  const reviewByStars: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of allReviews) { if (r.rating) reviewByStars[r.rating]++; }
  const recentReviews = allReviews.slice(0, 10);

  return (
    <div className="space-y-6">
      <SubHeader sub={sub} totalScans={totalScans} scansByPlate={scansByPlate} lang={lang} />
      <ReviewStats total={reviewTotal} avg={reviewAvg} byStars={reviewByStars} subscriptionId={subscriptionId} lang={lang} />
      {sub.location?.has_promo_enabled && (
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t("portal_promo_title", lang)}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t("portal_promo_card_desc", lang)}
              </p>
            </div>
            <a
              href={`/portal/${subscriptionId}/promo`}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
            >
              {t("portal_manage", lang)} →
            </a>
          </div>
        </section>
      )}
      <LocationSettings sub={sub} locationLinks={locationLinks} linktreeError={linktreeError} lang={lang} />
      <ReviewsSection reviews={recentReviews} subscriptionId={subscriptionId} lang={lang} />
      <SavedToast show={saved === "1"} lang={lang} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function ReviewStats({
  total,
  avg,
  byStars,
  subscriptionId,
  lang,
}: {
  total: number;
  avg: number | null;
  byStars: Record<number, number>;
  subscriptionId: number;
  lang: string;
}) {
  const STAR_COLORS: Record<number, string> = {
    1: "#ef4444", 2: "#f97316", 3: "#eab308", 4: "#84cc16", 5: "#22c55e",
  };

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t("portal_google_reviews", lang)}</h3>
        <a
          href={`/portal/${subscriptionId}/reviews`}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          {t("portal_details_link", lang)} →
        </a>
      </div>
      {total === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          {t("portal_no_reviews_yet", lang)}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t("portal_total", lang)}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{total}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t("portal_average", lang)}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {avg !== null ? avg.toFixed(2) : "—"}
                <span className="text-sm font-normal text-amber-500 ml-1">★</span>
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = byStars[star] ?? 0;
              const pct = (count / total) * 100;
              return (
                <a
                  key={star}
                  href={`/portal/${subscriptionId}/reviews?stars=${star}`}
                  className="flex items-center gap-2 text-xs group"
                >
                  <span className="w-[4.5rem] shrink-0 text-amber-500 group-hover:text-amber-600 transition-colors">
                    {"★".repeat(star)}{"☆".repeat(5 - star)}
                  </span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: STAR_COLORS[star] }}
                    />
                  </div>
                  <span className="w-6 text-right text-gray-400 dark:text-gray-500">{count}</span>
                </a>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function SubHeader({
  sub,
  totalScans,
  scansByPlate,
  lang,
}: {
  sub: {
    subscription_name: string;
    status: string;
    plates: { plate_id: number; plate_number: string; number_of_visits: number }[];
    activation_datetime: string | null;
    expiration_datetime: string | null;
    location?: { location_name: string } | null;
  };
  totalScans: number;
  scansByPlate: Record<number, number>;
  lang: string;
}) {
  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    inactive: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  const statusLabel: Record<string, string> = {
    active: t("portal_status_active", lang),
    pending: t("portal_status_pending", lang),
    inactive: t("portal_status_inactive_badge", lang),
  };

  const title = sub.location?.location_name
    ?? (sub.plates.length > 0 ? sub.plates.map((p) => p.plate_number).join(", ") : t("portal_unassigned", lang));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        <span
          className={`shrink-0 inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
            statusColors[sub.status] ?? statusColors.inactive
          }`}
        >
          {statusLabel[sub.status] ?? sub.status}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400 mb-0.5">{t("portal_plates", lang)}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {sub.plates.length}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 mb-0.5">{t("portal_scans", lang)}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {totalScans}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 mb-0.5">{t("portal_activation", lang)}</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {formatDate(sub.activation_datetime, lang)}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 mb-0.5">{t("portal_valid_until", lang)}</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {formatDate(sub.expiration_datetime, lang)}
          </p>
        </div>
      </div>

      {sub.plates.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            {t("portal_plate_numbers", lang)}
          </p>
          <div className="flex flex-wrap gap-2">
            {sub.plates.map((plate) => (
              <div
                key={plate.plate_id}
                className="bg-gray-50 dark:bg-gray-700 rounded px-3 py-1.5 text-sm"
              >
                <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                  {plate.plate_number}
                </span>
                <span className="text-gray-400 dark:text-gray-500 ml-2">
                  {scansByPlate[plate.plate_id] ?? 0} {t("portal_scan_suffix", lang)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LocationSettings({
  sub,
  locationLinks,
  linktreeError,
  lang,
}: {
  sub: {
    subscription_id: number;
    subscription_name: string;
    status: string;
    location: {
      location_id: number;
      location_name: string;
      google_business_name: string | null;
      google_business_address: string | null;
      logo_link: string | null;
      support_email: string | null;
      has_linktree_access: boolean;
      linktree_slug: string | null;
      scan_redirect_mode: "review" | "linktree";
      redirect_four_star_reviews: boolean;
    } | null;
  };
  locationLinks: CustomerLocationLink[];
  linktreeError?: string;
  lang: string;
}) {
  const location = sub.location;
  if (!location) return null;

  return (
    <div className="space-y-4">
      {/* Nazwa lokalu */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t("portal_location_name_title", lang)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("portal_location_name_desc", lang)}
        </p>
        <form action={updateLocationName} className="flex gap-3">
          <input type="hidden" name="subscription_id" value={sub.subscription_id} />
          <input type="hidden" name="location_id" value={location.location_id} />
          <input
            name="location_name"
            required
            type="text"
            defaultValue={location.location_name}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            {t("portal_save", lang)}
          </button>
        </form>
      </section>

      {/* Google Maps */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t("portal_google_maps_location_title", lang)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("portal_google_maps_location_desc", lang)}
        </p>
        <GoogleLocationEditor
          locationId={location.location_id}
          locationName={location.location_name}
          currentBusinessName={location.google_business_name}
          currentBusinessAddress={location.google_business_address}
          lang={lang}
        />
      </section>

      {/* Logo */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t("portal_logo_title", lang)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("portal_logo_desc", lang)}
        </p>
        <LogoUpload
          locationId={location.location_id}
          locationName={location.location_name}
          currentLogoLink={location.logo_link}
          lang={lang}
        />
      </section>

      {/* E-mail pomocniczy */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t("portal_support_email_title", lang)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("portal_support_email_desc", lang)}
        </p>
        <form action={updateSupportEmail} className="flex gap-3">
          <input type="hidden" name="subscription_id" value={sub.subscription_id} />
          <input type="hidden" name="location_id" value={location.location_id} />
          <input
            name="support_email"
            required
            type="email"
            defaultValue={location.support_email ?? ""}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            {t("portal_save", lang)}
          </button>
        </form>
      </section>

      {/* Linki Linktree */}
      {location.has_linktree_access && (
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {t("portal_linktree_links_title", lang)}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {t("portal_linktree_links_desc", lang)}
          </p>
          <LinktreeLinksEditor
            locationId={location.location_id}
            subscriptionId={sub.subscription_id}
            initialLinks={locationLinks.map((l) => ({
              title: l.title_pl || l.title,
              url: l.url,
            }))}
            lang={lang}
          />
        </section>
      )}

      {/* Adres Linktree */}
      {location.has_linktree_access && location.linktree_slug && (
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {t("portal_linktree_slug_title", lang)}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {t("portal_linktree_slug_desc", lang)}
          </p>
          <form action={updateLinktreeSlug} className="flex gap-3">
            <input type="hidden" name="location_id" value={location.location_id} />
            <input type="hidden" name="subscription_id" value={sub.subscription_id} />
            <div className="flex-1 flex items-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-blue-500">
              <span className="pl-3 text-sm text-gray-400 dark:text-gray-500">/l/</span>
              <input
                name="linktree_slug"
                required
                type="text"
                pattern="[a-z0-9-]{3,40}"
                defaultValue={location.linktree_slug}
                className="flex-1 bg-transparent px-1 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
            >
              {t("portal_save", lang)}
            </button>
          </form>
          {linktreeError === "taken" && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              {t("portal_linktree_slug_taken", lang)}
            </p>
          )}
          {linktreeError === "invalid" && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              {t("portal_linktree_slug_invalid", lang)}
            </p>
          )}
        </section>
      )}

      {/* Tryb skanowania */}
      {location.has_linktree_access && location.linktree_slug && (
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {t("portal_scan_mode_title", lang)}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {t("portal_scan_mode_desc", lang)}
          </p>
          <form action={updateScanRedirectMode} className="space-y-3">
            <input type="hidden" name="location_id" value={location.location_id} />
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="scan_redirect_mode"
                value="review"
                defaultChecked={location.scan_redirect_mode === "review"}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t("portal_scan_mode_review_title", lang)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("portal_scan_mode_review_desc", lang)}
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="scan_redirect_mode"
                value="linktree"
                defaultChecked={location.scan_redirect_mode === "linktree"}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t("portal_scan_mode_linktree_title", lang)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("portal_scan_mode_linktree_desc", lang)}
                </p>
              </div>
            </label>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {t("portal_save", lang)}
            </button>
          </form>
        </section>
      )}

      {/* Przekierowanie dla oceny 4 gwiazdek */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t("portal_four_star_title", lang)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          {t("portal_four_star_desc", lang)}
        </p>
        <form action={updateFourStarRedirect} className="space-y-3">
          <input type="hidden" name="location_id" value={location.location_id} />
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="redirect_four_star_reviews"
              defaultChecked={location.redirect_four_star_reviews}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t("portal_four_star_checkbox_label", lang)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("portal_four_star_checkbox_desc", lang)}
              </p>
            </div>
          </label>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {t("portal_save", lang)}
          </button>
        </form>
      </section>
    </div>
  );
}

function ReviewsSection({
  reviews,
  subscriptionId,
  lang,
}: {
  reviews: (Review & { plate_number: string })[];
  subscriptionId: number;
  lang: string;
}) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t("portal_recent_reviews", lang)}
        </h3>
        <a
          href={`/portal/${subscriptionId}/reviews`}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          {t("portal_all_reviews", lang)} →
        </a>
      </div>

      {reviews.length === 0 && (
        <p className="px-5 py-6 text-sm text-gray-400 dark:text-gray-500">
          {t("portal_no_reviews_yet", lang)}
        </p>
      )}
      {reviews.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">{t("portal_date", lang)}</th>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">{t("portal_plate", lang)}</th>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium">{t("portal_rating", lang)}</th>
              <th className="text-left px-5 py-3 text-gray-500 dark:text-gray-400 font-medium hidden sm:table-cell">{t("portal_comment", lang)}</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.review_id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                <td className="px-5 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {formatDate(review.rating_time ?? review.created_at, lang)}
                </td>
                <td className="px-5 py-3 font-mono text-gray-900 dark:text-gray-100">
                  {review.plate_number}
                </td>
                <td className="px-5 py-3">
                  {review.rating ? <Stars rating={review.rating} /> : "—"}
                </td>
                <td className="px-5 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate hidden sm:table-cell">
                  {review.feedback_message ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
