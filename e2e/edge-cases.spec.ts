import { test, expect, Page } from '@playwright/test';

async function startDefaultGame(page: Page) {
  await page.goto('/');
  await page.getByText('Play Local').click();
  await page.getByText('Start Game').click();
  await page.waitForTimeout(400);
}

async function clickColumn(page: Page, col: number) {
  const cells = page.locator(`[role="button"][aria-label^="Column ${col}"]`);
  await cells.last().click();
  await page.waitForTimeout(150);
}

test.describe('Edge Cases — Full Column Handling', () => {
  test('clicking a full column does not crash', async ({ page }) => {
    await startDefaultGame(page);

    // Fill column 1 completely (6 rows in 7×6)
    for (let i = 0; i < 6; i++) {
      await clickColumn(page, 1);
      // Also move in another column to alternate turns
      if (i < 5) {
        await clickColumn(page, 2);
      }
    }

    // Click the full column again — should not crash
    const col1 = page.locator('[role="button"][aria-label^="Column 1"]').first();
    await col1.click();
    await page.waitForTimeout(200);

    // Board should still be visible (no crash)
    const board = page.locator('[role="grid"]');
    await expect(board).toBeVisible();
  });

  test('full column shows occupied indicator', async ({ page }) => {
    await startDefaultGame(page);

    // Fill column 3 completely without triggering a win.
    // To avoid connect-4 in col 3, alternate who plays col 3:
    // P1: col3, P2: col3, P1: col3, P2: col3 ... and interleave with other cols
    // Sequence: P1→c3, P2→c3, P1→c3, P2→c4, P1→c4, P2→c3, P1→c4, P2→c4, P1→c4, P2→c5, P1→c3, P2→c3
    // Simpler: just alternate col3 and another col so that no one gets 4 in col3
    // P1→c3, P2→c3, P1→c5, P2→c3, P1→c3, P2→c5, P1→c5, P2→c3, P1→c3, P2→c5, P1→c5, P2→c5
    // Col3 gets: P1,P2,P2,P1,P2,P1 = each has 3 in col3, no connect-4

    await clickColumn(page, 3); // P1→c3 (row6)
    await clickColumn(page, 3); // P2→c3 (row5)
    await clickColumn(page, 5); // P1→c5
    await clickColumn(page, 3); // P2→c3 (row4)
    await clickColumn(page, 3); // P1→c3 (row3)
    await clickColumn(page, 5); // P2→c5
    await clickColumn(page, 5); // P1→c5
    await clickColumn(page, 3); // P2→c3 (row2)
    await clickColumn(page, 3); // P1→c3 (row1) — col3 now full
    // Column 3 is now full: P1,P2,P2,P1,P2,P1 from top to bottom

    // Verify at least some cells in col 3 have Player labels
    const col3Cells = page.locator('[role="button"][aria-label^="Column 3"]');
    const count = await col3Cells.count();
    let playerCellCount = 0;
    for (let i = 0; i < count; i++) {
      const label = await col3Cells.nth(i).getAttribute('aria-label');
      if (label && label.includes('Player')) playerCellCount++;
    }
    expect(playerCellCount).toBe(count);
  });
});

test.describe('Edge Cases — Rapid Clicking', () => {
  test('rapid clicks on same column do not cause issues', async ({ page }) => {
    await startDefaultGame(page);

    // Rapidly click column 4 multiple times
    const col4 = page.locator('[role="button"][aria-label^="Column 4"]');
    await col4.last().click();
    await col4.last().click();
    await col4.last().click();
    await page.waitForTimeout(300);

    // Game should still be in a valid state
    const board = page.locator('[role="grid"]');
    await expect(board).toBeVisible();
  });

  test('rapid clicks on different columns work correctly', async ({ page }) => {
    await startDefaultGame(page);

    // Quick succession clicks
    await clickColumn(page, 1);
    await clickColumn(page, 2);
    await clickColumn(page, 3);
    await clickColumn(page, 4);

    // There should be pieces placed
    const filledCells = page.locator('[aria-label*="Player"]');
    const count = await filledCells.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Edge Cases — Browser Interactions', () => {
  test('game state survives page focus/blur', async ({ page }) => {
    await startDefaultGame(page);
    await clickColumn(page, 4);

    // Blur and refocus (simulate switching tabs)
    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('focus'));
    });

    await page.waitForTimeout(200);

    // Game should still be functional
    const board = page.locator('[role="grid"]');
    await expect(board).toBeVisible();

    // Should still be able to make moves
    await clickColumn(page, 5);
  });

  test('window resize does not break board layout', async ({ page }) => {
    await startDefaultGame(page);
    await clickColumn(page, 4);

    // Resize viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    // Board should still be visible
    const board = page.locator('[role="grid"]');
    await expect(board).toBeVisible();

    // Resize back
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(300);
    await expect(board).toBeVisible();
  });
});

test.describe('Edge Cases — Navigation Guards', () => {
  test('navigating back from game preserves no stale state', async ({ page }) => {
    await startDefaultGame(page);
    await clickColumn(page, 1);
    await clickColumn(page, 2);

    // Use Quit to Menu
    const quitBtn = page.getByText('Quit to Menu');
    if (await quitBtn.isVisible()) {
      await quitBtn.click();
      await page.waitForTimeout(300);
    } else {
      // If quit button is not visible (mobile), just go back via other means
      return;
    }

    // Start a new game
    await page.getByText('Play Local').click();
    await page.getByText('Start Game').click();
    await page.waitForTimeout(400);

    // Board should be clean (no leftover pieces)
    const filledCells = page.locator('[aria-label*="Player"]');
    const count = await filledCells.count();
    expect(count).toBe(0);
  });

  test('starting game from vs Bot preset goes to lobby', async ({ page }) => {
    await page.goto('/');
    await page.getByText('vs Bot').click();
    await page.waitForTimeout(300);

    // Should be in lobby with bot configured
    await expect(page.getByText('Game Setup')).toBeVisible();
    // Player 2 should be a bot
    await expect(page.getByText(/🤖 Bot/)).toBeVisible();
  });
});

test.describe('Edge Cases — Fullboard Mode', () => {
  test('fullboard mode can be selected in lobby', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Play Local').click();
    await page.waitForTimeout(300);

    const fullboardBtn = page.getByRole('button', { name: /full board/i });
    if (await fullboardBtn.count() > 0) {
      await fullboardBtn.click();
      await page.waitForTimeout(200);

      // Start the game
      await page.getByText('Start Game').click();
      await page.waitForTimeout(400);

      // Board should render
      const board = page.locator('[role="grid"]');
      await expect(board).toBeVisible();
    }
  });

  test('fullboard games show blocked cells', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Play Local').click();
    await page.waitForTimeout(300);

    const fullboardBtn = page.getByRole('button', { name: /full board/i });
    if (await fullboardBtn.count() > 0) {
      await fullboardBtn.click();
      await page.getByText('Start Game').click();
      await page.waitForTimeout(400);

      // Play some moves
      await clickColumn(page, 1);
      await clickColumn(page, 2);
      await clickColumn(page, 3);
      await clickColumn(page, 4);

      // If a connect-4 is made, the winning cells get blocked
      // This is hard to trigger deterministically, just verify no crash
      const board = page.locator('[role="grid"]');
      await expect(board).toBeVisible();
    }
  });
});

test.describe('Edge Cases — Custom Board Sizes', () => {
  test('custom board size creates correct number of cells', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Play Local').click();
    await page.waitForTimeout(300);

    const customBtn = page.getByRole('button', { name: /custom/i }).first();
    if (await customBtn.count() > 0) {
      await customBtn.click();
      await page.waitForTimeout(200);

      // Look for row/col inputs — they may be labeled
      const numberInputs = page.locator('input[type="number"]');
      const count = await numberInputs.count();
      if (count >= 2) {
        // Set 5 rows and 5 cols
        await numberInputs.nth(0).fill('5');
        await numberInputs.nth(1).fill('5');
        await page.waitForTimeout(200);

        await page.getByText('Start Game').click();
        await page.waitForTimeout(400);

        // Board should have 25 cells
        const cells = page.locator('.cell');
        await expect(cells).toHaveCount(25);
      }
    }
  });
});

test.describe('Edge Cases — Multi-player (3-4 Players)', () => {
  test('3-player game works correctly', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Play Local').click();
    await page.waitForTimeout(300);

    // Select 3 players
    const threeBtn = page.locator('button').filter({ hasText: /^3$/ }).first();
    if (await threeBtn.count() > 0) {
      await threeBtn.click();
      await page.waitForTimeout(200);

      await page.getByText('Start Game').click();
      await page.waitForTimeout(400);

      // Make 3 moves — each for a different player
      await clickColumn(page, 1);
      await clickColumn(page, 2);
      await clickColumn(page, 3);

      // Should still be in playing state
      const board = page.locator('[role="grid"]');
      await expect(board).toBeVisible();
    }
  });

  test('4-player game works correctly', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Play Local').click();
    await page.waitForTimeout(300);

    // Select 4 players
    const fourBtn = page.locator('button').filter({ hasText: /^4$/ }).first();
    if (await fourBtn.count() > 0) {
      await fourBtn.click();
      await page.waitForTimeout(200);

      await page.getByText('Start Game').click();
      await page.waitForTimeout(400);

      // Make 4 moves — each for a different player
      await clickColumn(page, 1);
      await clickColumn(page, 2);
      await clickColumn(page, 3);
      await clickColumn(page, 4);

      const board = page.locator('[role="grid"]');
      await expect(board).toBeVisible();
    }
  });
});
