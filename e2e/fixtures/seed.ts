const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
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
}

export async function cleanupTestReviews() {
  const res = await fetch(
    `${BASE_URL}/rest/v1/plates?plate_number=in.(ACTIVE,PENDNG,NOSSUB,ENACTL)&select=plate_id`,
    { headers: headers() },
  );
  if (!res.ok) return;
  const plates: { plate_id: number }[] = await res.json();
  if (!plates.length) return;

  const ids = plates.map((p) => p.plate_id).join(',');
  await del('reviews', `plate_id=in.(${ids})`);
}
