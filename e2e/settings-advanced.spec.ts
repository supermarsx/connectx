import { test, expect } from '@playwright/test';

test.describe('Settings — Persistence & Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByText('Settings').click();
    await page.waitForTimeout(300);
  });

  test('settings page renders all sections', async ({ page }) => {
    await expect(page.getByText('Settings').first()).toBeVisible();
    await expect(page.getByText('AUDIO')).toBeVisible();
    await expect(page.getByText('ACCESSIBILITY')).toBeVisible();
    await expect(page.getByText('THEME')).toBeVisible();
    await expect(page.getByText('PREFERRED COLOR')).toBeVisible();
  });

  test('volume slider changes value', async ({ page }) => {
    const slider = page.locator('input[type="range"]');
    await expect(slider).toBeVisible();
    // Drag to the right (higher volume)
    await slider.fill('0.8');
    await expect(page.getByText('80%')).toBeVisible();
  });

  test('mute toggle works as switch', async ({ page }) => {
    const muteSwitch = page.locator('[role="switch"]').first();
    await expect(muteSwitch).toBeVisible();
    const initialChecked = await muteSwitch.getAttribute('aria-checked');
    await muteSwitch.click();
    const newChecked = await muteSwitch.getAttribute('aria-checked');
    expect(newChecked).not.toEqual(initialChecked);
  });

  test('high contrast toggle works', async ({ page }) => {
    const switches = page.locator('[role="switch"]');
    // High Contrast is the second switch (after Mute)
    const highContrastSwitch = switches.nth(1);
    if (await highContrastSwitch.count() > 0) {
      const initial = await highContrastSwitch.getAttribute('aria-checked');
      await highContrastSwitch.click();
      const updated = await highContrastSwitch.getAttribute('aria-checked');
      expect(updated).not.toEqual(initial);
    }
  });

  test('colorblind patterns toggle works', async ({ page }) => {
    const switches = page.locator('[role="switch"]');
    const colorblindSwitch = switches.nth(2);
    if (await colorblindSwitch.count() > 0) {
      const initial = await colorblindSwitch.getAttribute('aria-checked');
      await colorblindSwitch.click();
      const updated = await colorblindSwitch.getAttribute('aria-checked');
      expect(updated).not.toEqual(initial);
    }
  });

  test('reduce motion toggle works', async ({ page }) => {
    const switches = page.locator('[role="switch"]');
    const reduceMotionSwitch = switches.nth(3);
    if (await reduceMotionSwitch.count() > 0) {
      const initial = await reduceMotionSwitch.getAttribute('aria-checked');
      await reduceMotionSwitch.click();
      const updated = await reduceMotionSwitch.getAttribute('aria-checked');
      expect(updated).not.toEqual(initial);
    }
  });

  test('theme buttons switch between light/dark/system', async ({ page }) => {
    // Click Dark
    await page.getByText('🌙 Dark').click();
    await page.waitForTimeout(200);
    // Root should have data-theme="dark"
    const theme = await page.locator('[data-theme]').first().getAttribute('data-theme');
    expect(theme).toBe('dark');

    // Click Light
    await page.getByText('☀️ Light').click();
    await page.waitForTimeout(200);
    const lightTheme = await page.locator('[data-theme]').first().getAttribute('data-theme');
    expect(lightTheme).toBe('light');
  });

  test('selected theme button is highlighted', async ({ page }) => {
    await page.getByText('🌙 Dark').click();
    await page.waitForTimeout(200);
    const darkBtn = page.getByText('🌙 Dark');
    // Check for pink background (#FF6FAF)
    const bgColor = await darkBtn.evaluate(el => getComputedStyle(el).backgroundColor);
    // Should have some non-transparent background
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('preferred color swatches are clickable', async ({ page }) => {
    const colorBtns = page.locator('[aria-label^="Select color"]');
    const count = await colorBtns.count();
    expect(count).toBeGreaterThan(0);
    // Click second color
    if (count > 1) {
      await colorBtns.nth(1).click();
    }
  });

  test('back button returns to menu', async ({ page }) => {
    await page.getByText('← Back').click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Drop. Connect. Win.')).toBeVisible();
  });
});

test.describe('Settings — Persistence Across Navigation', () => {
  test('theme persists when navigating away and back', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Settings').click();

    // Set dark theme
    await page.getByText('🌙 Dark').click();
    await page.waitForTimeout(200);

    // Go back to menu
    await page.getByText('← Back').click();
    await page.waitForTimeout(200);

    // Theme should still be dark
    const theme = await page.locator('[data-theme]').first().getAttribute('data-theme');
    expect(theme).toBe('dark');

    // Go back to settings
    await page.getByText('Settings').click();
    await page.waitForTimeout(200);

    // Dark button should still be selected
    const darkBtn = page.getByText('🌙 Dark');
    const bgColor = await darkBtn.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('mute persists when navigating away and back', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Settings').click();

    // Toggle mute on
    const muteSwitch = page.locator('[role="switch"]').first();
    await muteSwitch.click();
    const afterClick = await muteSwitch.getAttribute('aria-checked');

    // Navigate away and back
    await page.getByText('← Back').click();
    await page.waitForTimeout(200);
    await page.getByText('Settings').click();
    await page.waitForTimeout(200);

    // Check mute is still in same state
    const muteSwitch2 = page.locator('[role="switch"]').first();
    const persisted = await muteSwitch2.getAttribute('aria-checked');
    expect(persisted).toBe(afterClick);
  });

  test('theme persists after page reload', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Settings').click();

    // Set dark theme
    await page.getByText('🌙 Dark').click();
    await page.waitForTimeout(300);

    // Reload page
    await page.reload();
    await page.waitForTimeout(500);

    // Theme should still be dark (persisted to localStorage)
    const theme = await page.locator('[data-theme]').first().getAttribute('data-theme');
    expect(theme).toBe('dark');
  });

  test('volume persists after page reload', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Settings').click();

    // Set volume
    const slider = page.locator('input[type="range"]');
    await slider.fill('0.3');
    await page.waitForTimeout(200);

    // Reload
    await page.reload();
    await page.waitForTimeout(500);

    // Navigate back to settings
    await page.getByText('Settings').click();
    await page.waitForTimeout(300);

    // Volume should be 30%
    const slider2 = page.locator('input[type="range"]');
    const value = await slider2.inputValue();
    expect(parseFloat(value)).toBeCloseTo(0.3, 1);
  });
});

test.describe('Settings — Sound Toggle from Menu', () => {
  test('mute button on menu toggles audio', async ({ page }) => {
    await page.goto('/');

    const muteBtn = page.locator('[aria-label="Mute audio"], [aria-label="Unmute audio"]');
    if (await muteBtn.count() > 0) {
      const initialLabel = await muteBtn.getAttribute('aria-label');
      await muteBtn.click();
      await page.waitForTimeout(200);
      const newLabel = await muteBtn.getAttribute('aria-label');
      expect(newLabel).not.toEqual(initialLabel);
    }
  });

  test('mute button on game screen toggles audio', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Play Local').click();
    await page.getByText('Start Game').click();
    await page.waitForTimeout(400);

    const muteBtn = page.locator('[aria-label="Mute audio"], [aria-label="Unmute audio"]');
    if (await muteBtn.count() > 0) {
      const initialLabel = await muteBtn.getAttribute('aria-label');
      await muteBtn.click();
      await page.waitForTimeout(200);
      const newLabel = await muteBtn.getAttribute('aria-label');
      expect(newLabel).not.toEqual(initialLabel);
    }
  });
});
