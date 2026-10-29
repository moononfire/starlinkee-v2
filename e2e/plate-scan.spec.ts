import { test, expect } from '@playwright/test';
import { seedTestData, cleanupTestReviews, seedGermanPortalUser, portalSessionCookies, setLocationGoogleLink, seedMixedCaseExpiredOwner, PORTAL_MIXED_USER } from './fixtures/seed';

test.beforeAll(async () => {
  await seedTestData();
});

test.afterEach(async () => {
  await cleanupTestReviews();
});

// ── Flow 1 — Active plate ────────────────────────────────────────────────────

test.describe('Active plate', () => {
  test('redirects to scan page with rating stars', async ({ page }) => {
    await page.goto('/plate/ACTIVE/testsecretactive');
    await expect(page).toHaveURL(/\/plate\/ACTIVE\/scan\/.+/);
    await expect(page.getByLabel('4 star')).toBeVisible();
    await expect(page.getByLabel('5 star')).toBeVisible();
  });

  test('rating >= 4 redirects to Google Review', async ({ page }) => {
    await page.goto('/plate/ACTIVE/testsecretactive');
    await page.waitForURL(/\/plate\/ACTIVE\/scan\/.+/);

    // intercept external redirect
    await page.route('https://g.page/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html>ok</html>' })
    );

    await page.getByLabel('4 star').click();
    await page.waitForURL('https://g.page/**');
  });

  test('rating <= 3 shows feedback form and submits', async ({ page }) => {
    await page.goto('/plate/ACTIVE/testsecretactive');
    await page.waitForURL(/\/plate\/ACTIVE\/scan\/.+/);

    await page.getByLabel('2 star').click();

    const textarea = page.locator('textarea[name="feedback_message"]');
    await expect(textarea).toBeVisible();

    await textarea.fill('Test feedback message from E2E');
    await page.locator('input[name="contact_email"]').fill('test@example.com');
    await page.getByRole('button', { name: 'Wyślij opinię' }).click();

    await expect(page.getByText('Dziękujemy!')).toBeVisible();
  });
});

// ── Flow 1a — Feedback form never pretends a failed save was sent (F1) ──────

test.describe('Feedback form errors', () => {
  test('server error keeps the form and the typed text and shows an error', async ({ page }) => {
    await page.goto('/plate/ACTIVE/testsecretactive');
    await page.waitForURL(/\/plate\/ACTIVE\/scan\/.+/);
    await page.getByLabel('2 star').click();

    await page.route('**/api/review/feedback', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"Failed to save feedback"}' })
    );

    const textarea = page.locator('textarea[name="feedback_message"]');
    await textarea.fill('This must not be lost');
    await page.locator('input[name="contact_email"]').fill('test@example.com');
    await page.getByRole('button', { name: 'Wyślij opinię' }).click();

    await expect(page.locator('form [role="alert"]')).toContainText('Nie udało się wysłać opinii');
    await expect(page.getByText('Dziękujemy!')).toHaveCount(0);
    await expect(textarea).toHaveValue('This must not be lost');
    await expect(page.getByRole('button', { name: 'Wyślij opinię' })).toBeEnabled();
  });

  test('network failure shows the error and unblocks the button', async ({ page }) => {
    await page.goto('/plate/ACTIVE/testsecretactive');
    await page.waitForURL(/\/plate\/ACTIVE\/scan\/.+/);
    await page.getByLabel('1 star').click();

    await page.route('**/api/review/feedback', (route) => route.abort('failed'));

    await page.locator('textarea[name="feedback_message"]').fill('offline text');
    await page.locator('input[name="contact_email"]').fill('test@example.com');
    await page.getByRole('button', { name: 'Wyślij opinię' }).click();

    await expect(page.locator('form [role="alert"]')).toContainText('Nie udało się wysłać opinii');
    await expect(page.getByRole('button', { name: 'Wyślij opinię' })).toBeEnabled();
  });
});

// ── Flow 1a2 — 5 stars without a usable Google link (F8) ────────────────────

test.describe('Positive rating without a Google link', () => {
  test('5 stars shows the thank-you, not the complaint form', async ({ page }) => {
    await setLocationGoogleLink(1, null);
    try {
      await page.goto('/plate/ACTIVE/testsecretactive');
      await page.waitForURL(/\/plate\/ACTIVE\/scan\/.+/);
      await page.getByLabel('5 star').click();

      await expect(page.getByText('Dziękujemy za wysoką ocenę!')).toBeVisible();
      await expect(page.locator('textarea[name="feedback_message"]')).toHaveCount(0);
    } finally {
      await setLocationGoogleLink(1, 'https://g.page/r/test-review-link');
    }
  });
});

// ── Flow 1b — Returning guest (same device) ─────────────────────────────────

test.describe('Returning guest', () => {
  test('5 stars then rescan shows thank-you, not the complaint form', async ({ page }) => {
    await page.goto('/plate/ACTIVE/testsecretactive');
    await page.waitForURL(/\/plate\/ACTIVE\/scan\/.+/);

    await page.route('https://g.page/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html>ok</html>' })
    );
    await page.getByLabel('5 star').click();
    await page.waitForURL('https://g.page/**');

    // Rescan with the same browser context (same _did cookie)
    await page.goto('/plate/ACTIVE/testsecretactive');
    await expect(page).toHaveURL(/\/plate\/ACTIVE\/scan\/.+/);
    await expect(page.getByText('Dziękujemy za wysoką ocenę!')).toBeVisible();
    await expect(page.locator('textarea[name="feedback_message"]')).toHaveCount(0);
  });

  test('1 star then rescan still shows the complaint form', async ({ page }) => {
    await page.goto('/plate/ACTIVE/testsecretactive');
    await page.waitForURL(/\/plate\/ACTIVE\/scan\/.+/);
    await page.getByLabel('1 star').click();
    await expect(page.locator('textarea[name="feedback_message"]')).toBeVisible();

    await page.goto('/plate/ACTIVE/testsecretactive');
    await expect(page).toHaveURL(/\/plate\/ACTIVE\/scan\/.+/);
    await expect(page.locator('textarea[name="feedback_message"]')).toBeVisible();
  });
});

// ── Flow 1c — Language rule: guest follows the plate, owner follows the customer ──

test.describe('Languages', () => {
  test('guest on a German plate sees German even though the customer is Polish', async ({ page }) => {
    await page.goto('/plate/DEPLAT/testsecretde');
    await expect(page).toHaveURL(/\/plate\/DEPLAT\/scan\/.+/);
    await expect(page.getByText('Wie bewerten Sie Ihre Erfahrung?')).toBeVisible();
  });

  test('guest language cookie beats the plate language', async ({ page }) => {
    await page.context().addCookies([{ name: 'lang_DEPLAT', value: 'en', url: 'http://localhost:' + (process.env.E2E_PORT ?? '3100') }]);
    await page.goto('/plate/DEPLAT/testsecretde');
    await expect(page.getByText('How would you rate your experience?')).toBeVisible();
    await expect(page.getByText('Wie bewerten Sie Ihre Erfahrung?')).toHaveCount(0);
  });

  test('Italian plate on a venue created with default languages is shown in Italian', async ({ page }) => {
    await page.goto('/plate/ITPLAT/testsecretit');
    await expect(page).toHaveURL(/\/plate\/ITPLAT\/scan\/.+/);
    await expect(page.getByText('Come valuti la tua esperienza?')).toBeVisible();
  });

  test('plate language the venue does not offer falls back to English, not Polish', async ({ page }) => {
    await page.goto('/plate/ITOLDP/testsecretitold');
    await expect(page).toHaveURL(/\/plate\/ITOLDP\/scan\/.+/);
    await expect(page.getByText('How would you rate your experience?')).toBeVisible();
  });

  test('portal opens in the customer preferred_language', async ({ page }) => {
    await seedGermanPortalUser();
    const appUrl = 'http://localhost:' + (process.env.E2E_PORT ?? '3100');
    await page.context().addCookies(await portalSessionCookies(appUrl));
    await page.goto('/portal');
    await expect(page.getByText('Sie haben noch keine Abonnements.')).toBeVisible();
  });
});

// ── Flow 1d — Portal: e-mail case and expiry before the cron (F6, F14) ───────

test.describe('Portal owner', () => {
  test('customer stored with capitals in the e-mail logs in and sees the subscription, expired by date -> renewal offered', async ({ page }) => {
    await seedMixedCaseExpiredOwner();
    const appUrl = 'http://localhost:' + (process.env.E2E_PORT ?? '3100');
    await page.context().addCookies(await portalSessionCookies(appUrl, PORTAL_MIXED_USER.login));

    await page.goto('/portal');
    // Not the empty state (customer found despite the capitals) ...
    await expect(page).toHaveURL(/\/portal\/9002$/);
    await expect(page.getByText('Nie masz jeszcze żadnych subskrypcji.')).toHaveCount(0);
    // ... and the date-expired "active" subscription already offers renewal.
    await expect(page.getByRole('button', { name: 'Odnów na miesiąc' })).toBeVisible();
  });
});

// ── Flow 2 — Pending plate (setup form) ─────────────────────────────────────

test.describe('Pending plate (setup)', () => {
  test('shows PlateSetupForm', async ({ page }) => {
    await page.goto('/plate/PENDNG/testsecretpending');
    await expect(page.getByRole('heading', { name: 'Skonfiguruj swoją płytkę' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aktywuj płytkę' })).toBeVisible();
  });
});

// ── Flow 3 — Error cases ─────────────────────────────────────────────────────

test.describe('Error cases', () => {
  test('wrong secret returns 404', async ({ page }) => {
    const res = await page.goto('/plate/ACTIVE/wrongsecret');
    expect(res?.status()).toBe(404);
  });

  test('non-existent plate returns 404', async ({ page }) => {
    const res = await page.goto('/plate/XXXXXX/anysecret');
    expect(res?.status()).toBe(404);
  });

  test('plate without subscription shows inactive message', async ({ page }) => {
    await page.goto('/plate/NOSSUB/testsecretnosub');
    // NOSSUB has plate_language=pl → neutral guest screen
    await expect(page.getByText('Ta tabliczka jest chwilowo niedostępna')).toBeVisible();
  });
});
