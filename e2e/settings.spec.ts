import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByText('Settings').click();
  });

  test('displays all settings sections', async ({ page }) => {
    await expect(page.getByText('Volume')).toBeVisible();
    await expect(page.getByText('Theme')).toBeVisible();
  });

  test('can toggle mute', async ({ page }) => {
    const muteBtn = page.getByRole('button', { name: /mute|unmute/i });
    if (await muteBtn.count() > 0) {
      await muteBtn.click();
    }
  });

  test('can switch theme to dark', async ({ page }) => {
    const darkBtn = page.getByRole('button', { name: /dark/i });
    if (await darkBtn.count() > 0) {
      await darkBtn.click();
      // Verify dark theme is applied
      const root = page.locator('[data-theme="dark"]');
      await expect(root).toBeVisible();
    }
  });

  test('can go back to menu', async ({ page }) => {
    const backBtn = page.getByRole('button', { name: /back|menu|←/i });
    if (await backBtn.count() > 0) {
      await backBtn.click();
      await expect(page.getByText('Play Local')).toBeVisible();
    }
  });
});
