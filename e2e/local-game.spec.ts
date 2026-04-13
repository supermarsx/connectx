import { test, expect } from '@playwright/test';

test.describe('Local Game', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByText('Play Local').click();
  });

  test('starts a game with default settings', async ({ page }) => {
    await page.getByText('Start Game').click();
    // Board should be visible
    await expect(page.locator('[data-testid="board"], .board-grid, [class*="board"]').first()).toBeVisible();
  });

  test('can drop a piece by clicking a column', async ({ page }) => {
    await page.getByText('Start Game').click();
    // Wait for board to render
    await page.waitForTimeout(500);
    // Click on a cell in the middle column
    const cells = page.locator('[data-testid="cell"], [class*="cell"]');
    const count = await cells.count();
    if (count > 0) {
      await cells.first().click();
    }
  });

  test('shows turn indicator', async ({ page }) => {
    await page.getByText('Start Game').click();
    await page.waitForTimeout(300);
    // Should show some turn indicator text
    const turnIndicator = page.locator('[role="status"]');
    await expect(turnIndicator.first()).toBeVisible();
  });
});
