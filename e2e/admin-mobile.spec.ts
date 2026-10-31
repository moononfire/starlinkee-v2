import { test, expect, type Page } from '@playwright/test';
import { seedAdminWithShipments, portalSessionCookies, ADMIN_USER } from './fixtures/seed';

const appUrl = 'http://localhost:' + (process.env.E2E_PORT ?? '3100');

async function loginAdmin(page: Page) {
  await seedAdminWithShipments();
  await page.context().addCookies(await portalSessionCookies(appUrl, ADMIN_USER.email));
}

/** True when the page itself scrolls sideways. */
async function hasHorizontalScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
}

test.describe('Admin on a phone (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

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

  test('audit: horizontal scroll per admin page', async ({ page }) => {
    await loginAdmin(page);
    const pages = ['dashboard', 'plates', 'plates/quick-activate', 'orders', 'orders/new', 'customers', 'subscriptions', 'shipments', 'reviews', 'places', 'analytics'];
    const wide: string[] = [];
    for (const p of pages) {
      await page.goto(`/admin/${p}`);
      await page.waitForLoadState('networkidle');
      const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      console.log(`AUDIT /admin/${p}: scrollWidth=${w[0]} innerWidth=${w[1]}`);
      if (w[0] > w[1]) wide.push(p);
    }
    console.log('AUDIT wide pages:', wide.join(', ') || 'none');
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
