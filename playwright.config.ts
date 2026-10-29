import { defineConfig, devices } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { assertLocalSupabase } from './scripts/local-guard.mjs';

const envFile = resolve('.env.local');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const port = process.env.E2E_PORT ?? '3000';
const baseURL = `http://localhost:${port}`;

// e2e writes and deletes data: refuse to start against anything but a local Supabase.
assertLocalSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL, 'playwright.config');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `next dev -p ${port}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
