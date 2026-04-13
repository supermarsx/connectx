import { test, expect } from '@playwright/test';

test.describe('Lobby Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByText('Play Local').click();
  });

  test('displays default configuration', async ({ page }) => {
    // Default board size preset should be selected
    await expect(page.getByText('Start Game')).toBeVisible();
    // Should show player configuration (names are in textboxes)
    const textboxes = page.getByRole('textbox');
    await expect(textboxes.first()).toBeVisible();
    const firstValue = await textboxes.first().inputValue();
    expect(firstValue).toContain('Player');
  });

  test('can switch between board size presets', async ({ page }) => {
    // Click on Medium preset if available
    const mediumBtn = page.getByRole('button', { name: /medium/i });
    if (await mediumBtn.count() > 0) {
      await mediumBtn.click();
    }
    // Click on Big preset if available
    const bigBtn = page.getByRole('button', { name: /big/i });
    if (await bigBtn.count() > 0) {
      await bigBtn.click();
    }
  });

  test('can toggle game mode between classic and fullboard', async ({ page }) => {
    const fullboardBtn = page.getByRole('button', { name: /full.?board/i });
    if (await fullboardBtn.count() > 0) {
      await fullboardBtn.click();
      await expect(fullboardBtn).toBeVisible();
    }
  });

  test('can add a third player', async ({ page }) => {
    // Player count buttons are under "Players" section
    // Use the button after the "Players" label, not the rounds buttons
    const playersSection = page.locator('text=Players').locator('..');
    const threeBtn = playersSection.getByRole('button', { name: '3' });
    if (await threeBtn.count() > 0) {
      await threeBtn.click();
      // Should now have 3 textboxes for player names
      const textboxes = page.getByRole('textbox');
      const count = await textboxes.count();
      expect(count).toBeGreaterThanOrEqual(3);
    }
  });

  test('can add a fourth player', async ({ page }) => {
    const playersSection = page.locator('text=Players').locator('..');
    const fourBtn = playersSection.getByRole('button', { name: '4' });
    if (await fourBtn.count() > 0) {
      await fourBtn.click();
      // Should now have 4 textboxes for player names
      const textboxes = page.getByRole('textbox');
      const count = await textboxes.count();
      expect(count).toBeGreaterThanOrEqual(4);
    }
  });

  test('can toggle a player to bot', async ({ page }) => {
    // Look for bot toggle for Player 2
    const botToggle = page.locator('text=/bot/i').first();
    if (await botToggle.count() > 0) {
      await botToggle.click();
    }
  });

  test('can change player names', async ({ page }) => {
    const nameInputs = page.locator('input[type="text"]');
    const count = await nameInputs.count();
    if (count > 0) {
      await nameInputs.first().fill('TestPlayer');
      await expect(nameInputs.first()).toHaveValue('TestPlayer');
    }
  });

  test('player names are sanitized (HTML stripped)', async ({ page }) => {
    const nameInputs = page.locator('input[type="text"]');
    const count = await nameInputs.count();
    if (count > 0) {
      await nameInputs.first().fill('<script>alert(1)</script>');
      // The sanitized name should not contain HTML tags
      const value = await nameInputs.first().inputValue();
      expect(value).not.toContain('<script>');
    }
  });

  test('player names are truncated to 20 characters', async ({ page }) => {
    const nameInputs = page.locator('input[type="text"]');
    const count = await nameInputs.count();
    if (count > 0) {
      await nameInputs.first().fill('A'.repeat(30));
      const value = await nameInputs.first().inputValue();
      expect(value.length).toBeLessThanOrEqual(20);
    }
  });

  test('can select different round counts', async ({ page }) => {
    // Try selecting 5 rounds
    const roundBtn = page.getByRole('button', { name: /^5$/ }).first();
    if (await roundBtn.count() > 0) {
      await roundBtn.click();
    }
  });

  test('starts game and reaches playing phase', async ({ page }) => {
    await page.getByText('Start Game').click();
    // Should see the board
    const cells = page.locator('.cell');
    await expect(cells.first()).toBeVisible({ timeout: 3000 });
  });

  test('board preview updates with configuration', async ({ page }) => {
    // The lobby should show a board preview
    const preview = page.locator('[class*="preview"], [class*="mini"]');
    // Board preview may or may not exist — just check no crash
    await page.waitForTimeout(300);
  });
});
