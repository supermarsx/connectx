import { test, expect } from '@playwright/test';

test.describe('Main Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays the ConnectX logo and menu options', async ({ page }) => {
    await expect(page.getByText('ConnectX')).toBeVisible();
    await expect(page.getByText('Play Local')).toBeVisible();
    await expect(page.getByText('vs Bot')).toBeVisible();
    await expect(page.getByText('Play Online')).toBeVisible();
  });

  test('navigates to local play lobby', async ({ page }) => {
    await page.getByText('Play Local').click();
    await expect(page.getByText('Start Game')).toBeVisible();
  });

  test('navigates to bot game lobby', async ({ page }) => {
    await page.getByText('vs Bot').click();
    await expect(page.getByText('Start Game')).toBeVisible();
  });

  test('navigates to settings', async ({ page }) => {
    await page.getByText('Settings').click();
    await expect(page.getByText('Volume')).toBeVisible();
  });
});
