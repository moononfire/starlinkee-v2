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
export async function seedPromoLead(token: string) {
  const res = await fetch(`${BASE_URL}/rest/v1/customer_locations?linktree_slug=eq.testrestaurant&select=location_id`, {
    headers: headers(),
  });
  const [location] = await res.json();
  await upsert(
    'location_leads',
    { location_id: location.location_id, phone: '+48500000001', agreed_to_terms: true, claim_token: token },
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
