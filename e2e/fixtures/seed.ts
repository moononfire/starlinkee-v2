import { createServerClient } from '@supabase/ssr';
import { assertLocalSupabase } from '../../scripts/local-guard.mjs';

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
assertLocalSupabase(BASE_URL, 'e2e/fixtures/seed');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function headers() {
  return {
    'Content-Type': 'application/json',
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  };
}

async function upsert(table: string, data: object | object[], onConflict?: string) {
  const url = new URL(`${BASE_URL}/rest/v1/${table}`);
  if (onConflict) url.searchParams.set('on_conflict', onConflict);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { ...headers(), Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`upsert ${table} failed: ${await res.text()}`);
}

async function del(table: string, filter: string) {
  const res = await fetch(`${BASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!res.ok) throw new Error(`delete ${table} failed: ${await res.text()}`);
}

export async function seedTestData() {
  await upsert(
    'customers',
    {
      customer_id: 1,
      customer_type: 'business',
      customer_name: 'Test Restaurant GmbH',
      email: 'test@example.com',
      phone: '+48123456789',
      preferred_language: 'pl',
      country: 'PL',
    },
    'customer_id',
  );

  await upsert(
    'subscriptions',
    [
      {
        subscription_id: 1,
        customer_id: 1,
        subscription_name: '1_YEAR_SUB',
        duration_in_days: 365,
        status: 'active',
        activation_datetime: new Date().toISOString(),
        expiration_datetime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
      ...[3, 4].map((id) => ({
        subscription_id: id,
        customer_id: 1,
        subscription_name: '1_YEAR_SUB',
        duration_in_days: 365,
        status: 'active',
        activation_datetime: new Date().toISOString(),
        expiration_datetime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      })),
      {
        subscription_id: 2,
        customer_id: 1,
        subscription_name: '1_YEAR_SUB',
        duration_in_days: 365,
        status: 'pending',
        activation_datetime: null,
        expiration_datetime: null,
      },
    ],
    'subscription_id',
  );

  await upsert(
    'plates',
    [
      { plate_number: 'ACTIVE', plate_language: 'pl', secret_key: 'testsecretactive', subscription_id: 1 },
      { plate_number: 'PENDNG', plate_language: 'pl', secret_key: 'testsecretpending', subscription_id: 2 },
      { plate_number: 'NOSSUB', plate_language: 'pl', secret_key: 'testsecretnosub', subscription_id: null },
      { plate_number: 'ENACTL', plate_language: 'en', secret_key: 'testsecreteng', subscription_id: 1 },
      { plate_number: 'ITOLDP', plate_language: 'it', secret_key: 'testsecretitold', subscription_id: 4 },
      { plate_number: 'ITPLAT', plate_language: 'it', secret_key: 'testsecretit', subscription_id: 3 },
      { plate_number: 'DEPLAT', plate_language: 'de', secret_key: 'testsecretde', subscription_id: 1 },
    ],
    'plate_number',
  );

  await upsert(
    'customer_locations',
    {
      subscription_id: 1,
      location_name: 'Restauracja Testowa',
      google_business_name: 'Restauracja Testowa',
      google_business_address: 'ul. Testowa 1, Warszawa',
      city: 'Warszawa',
      google_review_link: 'https://g.page/r/test-review-link',
      support_email: 'support@restauracjatestowa.pl',
      linktree_slug: 'testrestaurant',
      has_linktree_access: true,
      has_promo_enabled: true,
      has_loyalty_enabled: true,
      promo_banner_text: 'Odbierz 10% zniżki na pierwsze zamówienie!',
      promo_sms_text: 'Twoja zniżka: {link}',
      owner_email: 'owner@restauracjatestowa.pl',
    },
    'linktree_slug',
  );

  // Venue as createLocation() makes it for an Italian plate: 'it' is in active_languages.
  await upsert(
    'customer_locations',
    {
      subscription_id: 3,
      active_languages: ['pl', 'en', 'de', 'it'],
      location_name: 'Ristorante Test',
      google_business_name: 'Ristorante Test',
      google_business_address: 'Via Test 1, Roma',
      city: 'Roma',
      google_review_link: 'https://g.page/r/test-review-link-it',
      support_email: 'support@ristorantetest.it',
      linktree_slug: 'testristorante',
      owner_email: 'owner@ristorantetest.it',
    },
    'linktree_slug',
  );

  // Venue created before the fix: default languages only, the plate itself is Italian.
  await upsert(
    'customer_locations',
    {
      subscription_id: 4,
      location_name: 'Ristorante Vecchio',
      google_business_name: 'Ristorante Vecchio',
      google_business_address: 'Via Test 2, Roma',
      city: 'Roma',
      google_review_link: 'https://g.page/r/test-review-link-it-old',
      support_email: 'support@ristorantevecchio.it',
      linktree_slug: 'testristorantevecchio',
      owner_email: 'owner@ristorantevecchio.it',
    },
    'linktree_slug',
  );
}

export async function cleanupTestReviews() {
  const res = await fetch(
    `${BASE_URL}/rest/v1/plates?plate_number=in.(ACTIVE,PENDNG,NOSSUB,ENACTL,DEPLAT,ITPLAT,ITOLDP)&select=plate_id`,
    { headers: headers() },
  );
  if (!res.ok) return;
  const plates: { plate_id: number }[] = await res.json();
  if (!plates.length) return;

  const ids = plates.map((p) => p.plate_id).join(',');
  await del('reviews', `plate_id=in.(${ids})`);
}

export const PORTAL_DE_USER = { email: 'e2e-portal-de@example.com', password: 'e2e-portal-pass-1' };

/** Owner with preferred_language=de and no subscriptions: /portal shows a language-dependent empty state. */
export async function seedGermanPortalUser() {
  await upsert(
    'customers',
    {
      customer_id: 9001,
      customer_type: 'individual',
      customer_name: 'E2E Portal DE',
      email: PORTAL_DE_USER.email,
      preferred_language: 'de',
      country: 'DE',
    },
    'customer_id',
  );
  const res = await fetch(`${BASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ ...PORTAL_DE_USER, email_confirm: true }),
  });
  // 422 = user already exists from a previous run
  if (!res.ok && res.status !== 422) throw new Error(`create auth user failed: ${await res.text()}`);
}

/**
 * Session cookies for the portal user. Password login is off on a local Supabase with signups
 * disabled (the committed config), so mint a session from an admin-generated magic link.
 */
export async function portalSessionCookies(appUrl: string, email: string = PORTAL_DE_USER.email) {
  const linkRes = await fetch(`${BASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ type: 'magiclink', email }),
  });
  if (!linkRes.ok) throw new Error(`generate_link failed: ${await linkRes.text()}`);
  const { hashed_token } = await linkRes.json();

  const jar = new Map<string, string>();
  const supabase = createServerClient(BASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: hashed_token });
  if (error) throw new Error(`verifyOtp failed: ${error.message}`);
  return [...jar].map(([name, value]) => ({ name, value, url: appUrl }));
}

/** Sets (or clears, with null) the Google review link of a seeded location. Tests that clear it must restore it. */
export async function setLocationGoogleLink(subscriptionId: number, link: string | null) {
  const res = await fetch(`${BASE_URL}/rest/v1/customer_locations?subscription_id=eq.${subscriptionId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ google_review_link: link }),
  });
  if (!res.ok) throw new Error(`setLocationGoogleLink failed: ${await res.text()}`);
}

/** The customers.email as stored (capitals, from an admin or a Stripe checkout) vs. the login e-mail Auth stores. */
export const PORTAL_MIXED_USER = {
  stored: 'E2E.Mixed.Case@Example.com',
  login: 'e2e.mixed.case@example.com',
  password: 'e2e-portal-pass-2',
};

/**
 * Owner whose customers.email has capitals and whose subscription is "active" in the DB but already past its
 * end date (the nightly cron has not run yet): portal must find the customer and offer renewal.
 */
export async function seedMixedCaseExpiredOwner() {
  await upsert(
    'customers',
    {
      customer_id: 9002,
      customer_type: 'individual',
      customer_name: 'E2E Mixed Case',
      email: PORTAL_MIXED_USER.stored,
      preferred_language: 'pl',
      country: 'PL',
    },
    'customer_id',
  );
  await upsert(
    'subscriptions',
    {
      subscription_id: 9002,
      customer_id: 9002,
      subscription_name: '1_MONTH_SUB',
      duration_in_days: 30,
      status: 'active',
      activation_datetime: new Date(Date.now() - 31 * 86_400_000).toISOString(),
      expiration_datetime: new Date(Date.now() - 86_400_000).toISOString(),
    },
    'subscription_id',
  );
  const res = await fetch(`${BASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email: PORTAL_MIXED_USER.login, password: PORTAL_MIXED_USER.password, email_confirm: true }),
  });
  if (!res.ok && res.status !== 422) throw new Error(`create auth user failed: ${await res.text()}`);
}

/** A promo lead for the seeded venue, so /l/testrestaurant/promo/claim/<token> renders the claim button. */
export async function seedPromoLead(
  token: string,
  opts: { slug?: string; couponCode?: string; phone?: string } = {},
) {
  const res = await fetch(
    `${BASE_URL}/rest/v1/customer_locations?linktree_slug=eq.${opts.slug ?? 'testrestaurant'}&select=location_id`,
    { headers: headers() },
  );
  const [location] = await res.json();
  await upsert(
    'location_leads',
    {
      location_id: location.location_id,
      phone: opts.phone ?? '+48500000001',
      agreed_to_terms: true,
      claim_token: token,
      ...(opts.couponCode ? { coupon_code: opts.couponCode } : {}),
    },
    'claim_token',
  );
}

export async function deletePromoLead(token: string) {
  await del('location_leads', `claim_token=eq.${token}`);
}

export const LAPSED_VENUE = { slug: 'e2e-lapsed', plate: 'LAPSED', secret: 'e2elapsedsecret', name: 'Lapsed Cafe E2E' };

/** A venue whose subscription is no longer active, with everything a linktree needs (plate, promo, loyalty, wifi). */
export async function seedLapsedVenue() {
  await upsert(
    'subscriptions',
    {
      subscription_id: 9003,
      customer_id: 1,
      subscription_name: '1_MONTH_SUB',
      duration_in_days: 30,
      status: 'inactive',
      activation_datetime: new Date(Date.now() - 60 * 86_400_000).toISOString(),
      expiration_datetime: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    },
    'subscription_id',
  );
  await upsert(
    'plates',
    { plate_number: LAPSED_VENUE.plate, plate_language: 'pl', secret_key: LAPSED_VENUE.secret, subscription_id: 9003 },
    'plate_number',
  );
  await upsert(
    'customer_locations',
    {
      subscription_id: 9003,
      location_name: LAPSED_VENUE.name,
      google_business_name: LAPSED_VENUE.name,
      city: 'Warszawa',
      google_review_link: 'https://g.page/r/lapsed-review-link',
      support_email: 'support@lapsed.example.com',
      linktree_slug: LAPSED_VENUE.slug,
      has_linktree_access: true,
      has_promo_enabled: true,
      has_loyalty_enabled: true,
      has_wifi_enabled: true,
      wifi_ssid: 'LapsedWifi',
      owner_email: 'owner@lapsed.example.com',
    },
    'linktree_slug',
  );
}

export const MOVER = {
  plate: 'MOVER',
  secret: 'e2emoversecret',
  ownerA: { email: 'e2e.owner.a@example.com', customerId: 9004, subscriptionId: 9004 },
  ownerB: { email: 'e2e.owner.b@example.com', customerId: 9005, subscriptionId: 9005 },
  complaint: 'Old guest complaint about MOVER',
  scanId: 'e2e-mover-scan',
};

async function ensureAuthUser(email: string) {
  const res = await fetch(`${BASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, password: 'e2e-portal-pass-3', email_confirm: true }),
  });
  if (!res.ok && res.status !== 422) throw new Error(`create auth user failed: ${await res.text()}`);
}

/**
 * Two owners with active subscriptions and one plate that starts on owner A's, with a guest complaint thread
 * created under A's subscription. Call movePlateTo(MOVER.ownerB.subscriptionId) to re-assign it.
 */
export async function seedReassignablePlate() {
  for (const o of [MOVER.ownerA, MOVER.ownerB]) {
    await upsert(
      'customers',
      {
        customer_id: o.customerId,
        customer_type: 'individual',
        customer_name: `E2E Owner ${o.customerId}`,
        email: o.email,
        preferred_language: 'pl',
        country: 'PL',
      },
      'customer_id',
    );
    await upsert(
      'subscriptions',
      {
        subscription_id: o.subscriptionId,
        customer_id: o.customerId,
        subscription_name: '1_YEAR_SUB',
        duration_in_days: 365,
        status: 'active',
        activation_datetime: new Date().toISOString(),
        expiration_datetime: new Date(Date.now() + 365 * 86_400_000).toISOString(),
      },
      'subscription_id',
    );
    await ensureAuthUser(o.email);
  }

  await upsert(
    'plates',
    { plate_number: MOVER.plate, plate_language: 'pl', secret_key: MOVER.secret, subscription_id: MOVER.ownerA.subscriptionId },
    'plate_number',
  );
  const plate = await getPlate(MOVER.plate);

  // The thread: a complaint that was left while the plate was on A's subscription.
  const existing = await (await fetch(`${BASE_URL}/rest/v1/reviews?scan_id=eq.${MOVER.scanId}&select=review_id`, { headers: headers() })).json();
  for (const r of existing) await del('review_messages', `review_id=eq.${r.review_id}`);
  await del('reviews', `scan_id=eq.${MOVER.scanId}`);
  await del('reviews', `plate_id=eq.${plate.plate_id}`);
  const created = await fetch(`${BASE_URL}/rest/v1/reviews`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=representation' },
    body: JSON.stringify({
      plate_id: plate.plate_id,
      subscription_id: MOVER.ownerA.subscriptionId,
      scan_id: MOVER.scanId,
      rating: 1,
      rating_time: new Date().toISOString(),
      feedback_message: MOVER.complaint,
      contact_email: 'guest@example.com',
      feedback_time: new Date().toISOString(),
    }),
  });
  if (!created.ok) throw new Error(`seed review failed: ${await created.text()}`);
  const [review] = await created.json();
  const msg = await fetch(`${BASE_URL}/rest/v1/review_messages`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ review_id: review.review_id, sender: 'reporter', body: MOVER.complaint }),
  });
  if (!msg.ok) throw new Error(`seed message failed: ${await msg.text()}`);
}

async function getPlate(plateNumber: string): Promise<{ plate_id: number }> {
  const res = await fetch(`${BASE_URL}/rest/v1/plates?plate_number=eq.${plateNumber}&select=plate_id`, { headers: headers() });
  return (await res.json())[0];
}

/** Re-assigns the MOVER plate to another subscription (what a renewal onto a new subscription or an admin does). */
export async function movePlateTo(subscriptionId: number) {
  const res = await fetch(`${BASE_URL}/rest/v1/plates?plate_number=eq.${MOVER.plate}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ subscription_id: subscriptionId }),
  });
  if (!res.ok) throw new Error(`movePlateTo failed: ${await res.text()}`);
}

/** subscription_id of the newest review of a plate. */
export async function newestReviewSubscription(plateNumber: string): Promise<number | null> {
  const plate = await getPlate(plateNumber);
  const res = await fetch(
    `${BASE_URL}/rest/v1/reviews?plate_id=eq.${plate.plate_id}&order=created_at.desc&limit=1&select=subscription_id`,
    { headers: headers() },
  );
  return (await res.json())[0]?.subscription_id ?? null;
}

/** guest_language of the newest review of a plate. */
export async function newestReviewGuestLanguage(plateNumber: string): Promise<string | null> {
  const plate = await getPlate(plateNumber);
  const res = await fetch(
    `${BASE_URL}/rest/v1/reviews?plate_id=eq.${plate.plate_id}&order=created_at.desc&limit=1&select=guest_language`,
    { headers: headers() },
  );
  return (await res.json())[0]?.guest_language ?? null;
}

export const CANCEL_OWNER = {
  email: 'e2e-cancel@example.com',
  password: 'e2e-portal-pass-3',
  subscriptionId: 9003,
  cancellingSubscriptionId: 9004,
};

/** Polish owner with two active Stripe-billed subscriptions: 9003 renews, 9004 is already set to end with the period. */
export async function seedCancelOwner() {
  await upsert(
    'customers',
    { customer_id: 9003, customer_type: 'individual', customer_name: 'E2E Cancel', email: CANCEL_OWNER.email, preferred_language: 'pl', country: 'PL' },
    'customer_id',
  );
  const base = {
    customer_id: 9003,
    subscription_name: '1_YEAR_SUB',
    duration_in_days: 365,
    status: 'active',
    activation_datetime: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    expiration_datetime: new Date(Date.now() + 200 * 86_400_000).toISOString(),
  };
  await upsert(
    'subscriptions',
    [
      { ...base, subscription_id: CANCEL_OWNER.subscriptionId, stripe_subscription_id: 'sub_e2e_9003', cancel_at_period_end: false },
      { ...base, subscription_id: CANCEL_OWNER.cancellingSubscriptionId, stripe_subscription_id: 'sub_e2e_9004', cancel_at_period_end: true },
    ],
    'subscription_id',
  );
  const res = await fetch(`${BASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email: CANCEL_OWNER.email, password: CANCEL_OWNER.password, email_confirm: true }),
  });
  if (!res.ok && res.status !== 422) throw new Error(`create auth user failed: ${await res.text()}`);
}

export const ITALIAN_OWNER = { email: 'e2e-owner-it@example.com', password: 'e2e-portal-pass-4', customerId: 9005 };

/** Owner with preferred_language=it and one active subscription: portal must speak Italian without any switcher cookie. */
export async function seedItalianOwner() {
  await upsert(
    'customers',
    { customer_id: ITALIAN_OWNER.customerId, customer_type: 'individual', customer_name: 'E2E Italiano', email: ITALIAN_OWNER.email, preferred_language: 'it', country: 'IT' },
    'customer_id',
  );
  await upsert(
    'subscriptions',
    {
      subscription_id: 9005,
      customer_id: ITALIAN_OWNER.customerId,
      subscription_name: '1_YEAR_SUB',
      duration_in_days: 365,
      status: 'active',
      activation_datetime: new Date(Date.now() - 30 * 86_400_000).toISOString(),
      expiration_datetime: new Date(Date.now() + 200 * 86_400_000).toISOString(),
      stripe_subscription_id: 'sub_e2e_9005',
    },
    'subscription_id',
  );
  const res = await fetch(`${BASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email: ITALIAN_OWNER.email, password: ITALIAN_OWNER.password, email_confirm: true }),
  });
  if (!res.ok && res.status !== 422) throw new Error(`create auth user failed: ${await res.text()}`);
}
