import { test, expect } from '@playwright/test';
import {
  seedLoyaltyOwner, LOYALTY_OWNER, loyaltyOwnerLocation, seedAdminWithShipments, portalSessionCookies, ADMIN_USER,
} from './fixtures/seed';

const appUrl = 'http://localhost:' + (process.env.E2E_PORT ?? '3100');
const portal = `/portal/${LOYALTY_OWNER.subscriptionId}`;

// LOYALTY_ENABLED=false in src/lib/features.ts; the seeded location still has has_loyalty_enabled=true.
test.describe('Loyalty card is switched off', () => {
  test.beforeAll(async () => {
    await seedLoyaltyOwner();
  });

  test('portal shows no loyalty tab', async ({ page }) => {
    await page.context().addCookies(await portalSessionCookies(appUrl, LOYALTY_OWNER.email));
    await page.goto(portal);
    await expect(page.locator('a[href$="/wifi"]').first()).toBeVisible(); // page rendered, tabs present
    await expect(page.locator('a[href$="/loyalty"]')).toHaveCount(0);
    await expect(page.getByText('Treueprogramm')).toHaveCount(0);
  });

  test('direct /loyalty address redirects to the subscription page', async ({ page }) => {
    await page.context().addCookies(await portalSessionCookies(appUrl, LOYALTY_OWNER.email));
    await page.goto(`${portal}/loyalty`);
    await expect(page).toHaveURL(new RegExp(`${portal}$`));
    await expect(page.locator('input[name="has_loyalty_enabled"]')).toHaveCount(0);
  });

  test('Linktree editor has no loyalty module row', async ({ page }) => {
    await page.context().addCookies(await portalSessionCookies(appUrl, LOYALTY_OWNER.email));
    await page.goto(`${portal}/linktree`);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByText('Treuekarte')).toHaveCount(0);
  });

  test('admin cannot enable the card through the API', async ({ page }) => {
    await seedAdminWithShipments();
    await page.context().addCookies(await portalSessionCookies(appUrl, ADMIN_USER.email));
    const loc = await loyaltyOwnerLocation();
    const res = await page.request.put('/api/admin/locations', {
      data: { location_id: loc.location_id, has_loyalty_enabled: true },
    });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: 'Loyalty card is disabled' });
    expect((await loyaltyOwnerLocation()).has_loyalty_enabled).toBe(loc.has_loyalty_enabled);
  });
});
