import { test, expect, type Page } from '@playwright/test';
import { seedTestData, seedAdminWithShipments, portalSessionCookies, ADMIN_USER } from './fixtures/seed';

const appUrl = 'http://localhost:' + (process.env.E2E_PORT ?? '3100');

async function loginAdmin(page: Page) {
  await seedAdminWithShipments();
  await page.context().addCookies(await portalSessionCookies(appUrl, ADMIN_USER.email));
}

/** Widths of the document and of <main> (which has overflow-auto, so wide content scrolls there, not in the document). */
async function widths(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector('main')!;
    return { doc: document.documentElement.scrollWidth, win: window.innerWidth, mainScroll: main.scrollWidth, mainClient: main.clientWidth };
  });
}

/** True when the document OR <main> scrolls sideways. */
async function hasHorizontalScroll(page: Page) {
  const w = await widths(page);
  return w.doc > w.win || w.mainScroll > w.mainClient;
}

test.describe('Admin on a phone (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeAll(async () => {
    await seedTestData(); // NOSSUB is a free plate for quick-activate
  });

  test('hamburger opens the menu, a link navigates and closes it', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('/admin/dashboard');
    expect(await hasHorizontalScroll(page)).toBe(false);

    await expect(page.locator('aside')).toBeHidden();
    await page.getByRole('button', { name: 'Menu' }).click();
    const drawer = page.getByRole('dialog', { name: 'Menu' });
    await expect(drawer).toBeVisible();

    const link = drawer.getByRole('link', { name: 'Wysyłki' });
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await link.click();
    await expect(page).toHaveURL(/\/admin\/shipments/);
    await expect(drawer).toBeHidden();
  });

  test('menu closes with Escape and with a click on the backdrop', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('/admin/dashboard');
    const drawer = page.getByRole('dialog', { name: 'Menu' });

    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();

    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(drawer).toBeVisible();
    await page.getByTestId('admin-drawer-backdrop').click({ position: { x: 370, y: 400 } });
    await expect(drawer).toBeHidden();
  });

  test('quick-activate runs to the end on a phone: full-width fields, big buttons, no sideways scroll', async ({ page }) => {
    await loginAdmin(page);
    await page.route('**/api/google/autocomplete**', (r) =>
      r.fulfill({ json: { predictions: [{ place_id: 'p1', description: 'Cafe E2E, Warszawa' }] } }),
    );
    await page.route('**/api/google/place-details**', (r) =>
      r.fulfill({ json: { name: 'Cafe E2E', address: 'Testowa 1, Warszawa', website: '', google_review_link: 'https://g.page/r/e2e/review', place_id: 'p1' } }),
    );
    await page.route('**/api/admin/plates/quick-activate', (r) =>
      r.fulfill({ json: { plateNumber: 'NOSSUB', googleReviewLink: 'https://g.page/r/e2e/review' } }),
    );

    await page.goto('/admin/plates/quick-activate');
    expect(await hasHorizontalScroll(page)).toBe(false);

    const select = page.locator('form select').first();
    await select.selectOption({ label: 'NOSSUB (pl)' });
    const search = page.getByPlaceholder('Wyszukaj nazwę firmy...');
    await search.fill('Cafe');
    await page.getByText('Cafe E2E, Warszawa').click();
    await expect(search).toHaveValue('Cafe E2E');

    const email = page.getByPlaceholder('np. adres znaleziony na stronie firmy');
    await email.fill('klient@example.com');

    // Fields use the card's full width; the submit button is a comfortable touch target.
    const form = (await page.locator('form.space-y-4').boundingBox())!;
    expect((await email.boundingBox())!.width).toBeGreaterThan(form.width - 2);
    expect((await select.boundingBox())!.width).toBeGreaterThan(form.width - 2);
    const submit = page.getByRole('button', { name: /Aktywuj tabliczkę/ });
    expect((await submit.boundingBox())!.height).toBeGreaterThanOrEqual(44);

    await submit.click();
    await expect(page.getByText('Tabliczka NOSSUB aktywowana.')).toBeVisible();
    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  test('shipments list shows a card with the plate count; no sideways scroll', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('/admin/shipments');
    await expect(page.locator('table')).toBeHidden();
    const card = page.getByTestId('shipment-card').filter({ hasText: '#9101 ·' });
    await expect(card).toBeVisible();
    await expect(card.getByText('Tabliczki')).toBeVisible();
    await expect(card.locator('dd').first()).toHaveText('3');
    const old = page.getByTestId('shipment-card').filter({ hasText: '#9102 ·' });
    await expect(old.locator('dd').first()).toHaveText('—');
    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  test('orders list shows cards; new order form is one column with no sideways scroll', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('/admin/orders');
    await expect(page.locator('table')).toBeHidden();
    await expect(page.getByTestId('order-card').first()).toBeVisible();
    expect(await hasHorizontalScroll(page)).toBe(false);

    await page.goto('/admin/orders/new');
    await expect(page.getByRole('heading', { name: 'Nowe zamówienie' })).toBeVisible();
    const pay = page.locator('select[name="payment_method"]');
    const ref = page.locator('input[name="reference"]');
    const a = (await pay.boundingBox())!;
    const b = (await ref.boundingBox())!;
    expect(b.y).toBeGreaterThan(a.y + a.height - 1); // stacked, not side by side
    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  test('lists of customers, subscriptions, reviews and plates are cards on a phone', async ({ page }) => {
    await loginAdmin(page);
    for (const [path, cards] of [['customers', 'customer-cards'], ['subscriptions', 'subscription-cards'], ['reviews', 'review-cards'], ['plates', 'plate-cards']]) {
      await page.goto(`/admin/${path}`);
      await expect(page.getByTestId(cards)).toBeVisible();
      await expect(page.locator('table')).toBeHidden();
      expect(await hasHorizontalScroll(page), `/admin/${path}`).toBe(false);
    }
  });

  test('customer card opens the edit form, which fits the screen', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('/admin/customers');
    const card = page.getByTestId('customer-card').filter({ hasText: 'E2E Shipments Customer' });
    await expect(card).toBeVisible();
    const edit = card.getByRole('link', { name: 'Edytuj' });
    expect((await edit.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await edit.click();
    await expect(page).toHaveURL(/\/admin\/customers\/9007/);
    expect(await hasHorizontalScroll(page)).toBe(false);
    const field = page.locator('main input').first();
    const box = (await field.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  });

  test('order card shows the reference', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('/admin/orders');
    await expect(page.getByTestId('order-card').first().getByText('Ref.')).toBeVisible();
  });

  test('audit: horizontal scroll per admin page', async ({ page }) => {
    await loginAdmin(page);
    const pages = ['dashboard', 'plates', 'plates/quick-activate', 'plates/assign', 'plates/generate', 'plates/import', 'orders', 'orders/new', 'customers', 'customers/new', 'customers/9007', 'subscriptions', 'shipments', 'shipments/new', 'reviews', 'places', 'analytics'];
    const wide: string[] = [];
    const mustBeClean = pages; // P33: every admin page, document and <main>
    for (const p of pages) {
      await page.goto(`/admin/${p}`);
      await page.waitForLoadState('networkidle');
      const w = await widths(page);
      console.log(`AUDIT /admin/${p}: doc=${w.doc}/${w.win} main=${w.mainScroll}/${w.mainClient}`);
      if (await hasHorizontalScroll(page)) wide.push(p);
    }
    console.log('AUDIT wide pages:', wide.join(', ') || 'none');
    for (const p of mustBeClean) expect(wide, `/admin/${p} scrolls sideways`).not.toContain(p);
  });
});

test.describe('Admin on desktop (1280x800)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('side navigation is visible, hamburger is not', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('/admin/dashboard');
    await expect(page.locator('aside').getByRole('link', { name: 'Wysyłki' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden();
  });
});

test.describe('Admin nav highlight', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('on quick-activate only "Szybka aktywacja" is active', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('/admin/plates/quick-activate');
    const nav = page.locator('aside nav');
    await expect(nav.getByRole('link', { name: 'Szybka aktywacja' })).toHaveClass(/bg-blue-600/);
    await expect(nav.getByRole('link', { name: 'Tabliczki', exact: true })).not.toHaveClass(/bg-blue-600/);
  });
});

test.describe('Admin lists on desktop keep their tables', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('lists show the table, not the cards', async ({ page }) => {
    await loginAdmin(page);
    for (const p of ['shipments', 'orders', 'customers', 'subscriptions', 'reviews', 'plates']) {
      await page.goto(`/admin/${p}`);
      await expect(page.locator('table')).toBeVisible();
      await expect(page.locator('ul[data-testid$="-cards"]')).toBeHidden();
    }
  });
});
