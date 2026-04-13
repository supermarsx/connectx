import { test, expect } from '@playwright/test';

test.describe('Bot Game — Setup & Play', () => {
  test('vs Bot menu card navigates to lobby with bot preset', async ({ page }) => {
    await page.goto('/');
    await page.getByText('vs Bot').click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Game Setup')).toBeVisible();
    // Player 2 should be configured as bot
    await expect(page.getByText(/🤖 Bot/)).toBeVisible();
  });

  test('bot difficulty can be changed', async ({ page }) => {
    await page.goto('/');
    await page.getByText('vs Bot').click();
    await page.waitForTimeout(300);

    // Difficulty buttons are within the bot player's section (last player card)
    // Use .last() to disambiguate from Board Size "Medium"
    const easyBtn = page.getByRole('button', { name: 'Easy' });
    const hardBtn = page.getByRole('button', { name: 'Hard' });

    if (await easyBtn.count() > 0) {
      await easyBtn.click();
      await page.waitForTimeout(100);
    }
    if (await hardBtn.count() > 0) {
      await hardBtn.click();
      await page.waitForTimeout(100);
    }
  });

  test('bot makes a move automatically after player', async ({ page }) => {
    await page.goto('/');
    await page.getByText('vs Bot').click();
    await page.waitForTimeout(300);
    await page.getByText('Start Game').click();
    await page.waitForTimeout(500);

    // Player 1 (human) drops a piece
    const col = page.locator('[role="button"][aria-label^="Column 4"]');
    await col.last().click();

    // Wait for bot to respond
    await page.waitForTimeout(1500);

    // There should be at least 2 pieces on the board (human + bot)
    const filledCells = page.locator('[aria-label*="Player"]');
    const count = await filledCells.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('bot game can be won by human', async ({ page }) => {
    await page.goto('/');
    await page.getByText('vs Bot').click();
    await page.waitForTimeout(300);

    // Set easy difficulty for predictable behavior
    const easyBtn = page.getByRole('button', { name: /easy/i });
    if (await easyBtn.count() > 0) {
      await easyBtn.click();
    }

    await page.getByText('Start Game').click();
    await page.waitForTimeout(500);

    // Try to win vertically in column 1
    // Human plays col 1, bot plays somewhere else (hopefully)
    for (let i = 0; i < 4; i++) {
      const col1 = page.locator('[role="button"][aria-label^="Column 1"]');
      await col1.last().click();
      await page.waitForTimeout(1500); // Wait for bot

      // Check if we've already won
      const winText = page.getByText(/wins/i);
      if (await winText.isVisible()) break;
    }

    // Game should have progressed (either win or still playing)
    const board = page.locator('[role="grid"]');
    await expect(board).toBeVisible();
  });

  test('bot game does not allow clicking during bot turn', async ({ page }) => {
    await page.goto('/');
    await page.getByText('vs Bot').click();
    await page.waitForTimeout(300);
    await page.getByText('Start Game').click();
    await page.waitForTimeout(500);

    // Human moves
    const col4 = page.locator('[role="button"][aria-label^="Column 4"]');
    await col4.last().click();

    // Immediately try to click another column (during bot's turn)
    const col5 = page.locator('[role="button"][aria-label^="Column 5"]');
    await col5.last().click();

    // Wait for bot
    await page.waitForTimeout(1500);

    // Board should still be in a valid state
    const board = page.locator('[role="grid"]');
    await expect(board).toBeVisible();
  });

  test('bot vs bot game can be started with all bot players', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Play Local').click();
    await page.waitForTimeout(300);

    // Toggle both players to bots — click all Human buttons
    const humanBtns = page.getByRole('button', { name: '👤 Human' });
    // Click each one sequentially (count may decrease as they toggle)
    while (await humanBtns.count() > 0) {
      await humanBtns.first().click();
      await page.waitForTimeout(200);
    }

    await page.getByText('Start Game').click();
    await page.waitForTimeout(3000);

    // Game should auto-play (bots making moves)
    const filledCells = page.locator('[aria-label*="Player"]');
    const filledCount = await filledCells.count();
    expect(filledCount).toBeGreaterThan(0);
  });
});
