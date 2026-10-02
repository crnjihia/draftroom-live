import { test, expect } from '@playwright/test';

/**
 * Basic collaboration E2E test.
 * TODO: Implement multi‑context test where two browsers edit the same doc.
 */
test('placeholder collaboration test', async ({ page }) => {
  // Navigate to the app (assuming dev server is running on localhost:3000)
  await page.goto('http://localhost:3000');
  await expect(page).toHaveTitle(/Andika Live/);
  // Further steps will be added later.
});
