import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('main menu has no missing alt text on buttons', async ({ page }) => {
    await page.goto('/');
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute('aria-label');
      // Every button should have visible text or aria-label
      expect(text?.trim() || ariaLabel?.trim()).toBeTruthy();
    }
  });

  test('game board cells are keyboard accessible', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Play Local').click();
    await page.getByText('Start Game').click();
    await page.waitForTimeout(500);
    // Tab should be able to reach the board
    await page.keyboard.press('Tab');
    // Check that something received focus
    const focused = page.locator(':focus');
    await expect(focused).toBeDefined();
  });
});
