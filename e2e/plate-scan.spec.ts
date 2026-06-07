import { test, expect } from '@playwright/test';
import { seedTestData, cleanupTestReviews } from './fixtures/seed';

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
    await page.getByRole('button', { name: 'Send feedback' }).click();

    await expect(page.getByText('Thank you!')).toBeVisible();
  });
});

// ── Flow 2 — Pending plate (setup form) ─────────────────────────────────────

test.describe('Pending plate (setup)', () => {
  test('shows PlateSetupForm', async ({ page }) => {
    await page.goto('/plate/PENDNG/testsecretpending');
    await expect(page.getByRole('heading', { name: 'Set up your plate' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Activate plate' })).toBeVisible();
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
    // NOSSUB has plate_language=pl → "Tablica Nieaktywna"
    await expect(page.getByText('Tablica Nieaktywna')).toBeVisible();
  });
});
