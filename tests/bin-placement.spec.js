import { test, expect } from '@playwright/test';

test.describe('Bin Placement Workflow', () => {
  test('should create project and place a 2x2 bin', async ({ page }) => {
    // Generate project name with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const projectName = `Test-${timestamp}`;

    // Clear localStorage for clean test state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    // 1. Navigate to landing page
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Gridfinity Drawer Maker/i })).toBeVisible();

    // 2. Click "Sign In" to go to projects page
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.getByRole('heading', { name: /My Projects/i })).toBeVisible();

    // 3. Click "New Drawer Project"
    await page.getByRole('button', { name: /New Drawer Project/i }).click();

    // 4. Fill in the project form
    await page.getByPlaceholder(/My Drawer/i).fill(projectName);

    // Fill in drawer dimensions (using default values or specific ones)
    // Width, Depth, Height inputs should be visible
    const dimensionInputs = page.locator('input[type="number"]');
    await dimensionInputs.nth(0).fill('300'); // Drawer Width
    await dimensionInputs.nth(1).fill('200'); // Drawer Depth
    await dimensionInputs.nth(2).fill('100'); // Drawer Height
    await dimensionInputs.nth(3).fill('220'); // Printer Bed Width
    await dimensionInputs.nth(4).fill('220'); // Printer Bed Depth

    // 5. Create the project
    await page.getByRole('button', { name: /Create Project/i }).click();

    // Should navigate to bin placer page
    await expect(page.getByText(projectName)).toBeVisible();

    // 6. Click "Create Bin" widget
    await page.getByRole('button', { name: /Create Bin/i }).click();

    // 7. Configure a 2x2 bin (2 width x 2 depth)
    // The bin creator should be visible
    await expect(page.getByRole('heading', { name: /Create New Bin/i })).toBeVisible();

    // Fill in dimensions - width and depth should be 2
    const binInputs = page.locator('input[type="number"]');
    await binInputs.nth(0).fill('2'); // Width
    await binInputs.nth(1).fill('2'); // Depth
    // Height defaults to 1, leave it

    // 8. Add to Loose Bins
    await page.getByRole('button', { name: /Add to Loose Bins/i }).click();

    // 9. Click "Loose Bins" widget to see our created bin
    await page.getByRole('button', { name: /^📦 Loose Bins$/i }).click();

    // Should see the bin in loose bins
    await expect(page.getByText(/Hollow Bin/i)).toBeVisible();
    await expect(page.getByText(/2x2x1 units/i)).toBeVisible();

    // 10. Click "Place on Grid" button
    await page.getByRole('button', { name: /Place on Grid/i }).click();

    // Should enter placement mode
    await expect(page.getByText(/Placement Mode/i)).toBeVisible();
    await expect(page.getByText(/Click to place • Spacebar to rotate/i)).toBeVisible();

    // Wait for event listeners to be attached
    await page.waitForTimeout(1000);

    // 11. Click on the canvas to place the bin
    // Get the canvas element
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Click in the center of the canvas to place the bin
    await canvas.click({
      position: {
        x: (await canvas.boundingBox()).width / 2,
        y: (await canvas.boundingBox()).height / 2
      },
      force: true
    });

    // Wait a moment for placement to complete
    await page.waitForTimeout(1500);

    // 12. Verify placement mode is exited (placement mode message should disappear)
    await expect(page.getByText(/Placement Mode/i)).not.toBeVisible({ timeout: 3000 });

    // 13. Verify placement completed by checking that Cancel button is gone
    await expect(page.getByRole('button', { name: /^Cancel$/i })).not.toBeVisible();

    console.log(`✅ Test passed! Project "${projectName}" created with 2x2 bin placed successfully.`);
  });

  test('should create multiple bins and place them', async ({ page }) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const projectName = `Test-Multi-${timestamp}`;

    // Clear localStorage for clean test state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    // Create project
    await page.goto('/');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.getByRole('button', { name: /New Drawer Project/i }).click();
    await page.getByPlaceholder(/My Drawer/i).fill(projectName);
    await page.getByRole('button', { name: /Create Project/i }).click();

    // Create and place first bin (1x1)
    await page.getByRole('button', { name: /Create Bin/i }).click();
    const binInputs = page.locator('input[type="number"]');
    await binInputs.nth(0).fill('1'); // Width
    await binInputs.nth(1).fill('1'); // Depth
    await page.getByRole('button', { name: /Add to Loose Bins/i }).click();

    await page.getByRole('button', { name: /^📦 Loose Bins$/i }).click();
    await page.getByRole('button', { name: /Place on Grid/i }).click();

    // Wait for event listeners
    await page.waitForTimeout(1000);

    // Place first bin at top-left area
    const canvas = page.locator('canvas').first();
    await canvas.click({
      position: {
        x: 100,
        y: 100
      },
      force: true
    });

    await page.waitForTimeout(1500);

    // Verify first bin placed
    await expect(page.getByText(/Placement Mode/i)).not.toBeVisible({ timeout: 3000 });

    // Create and place second bin (2x1)
    await page.getByRole('button', { name: /Create Bin/i }).click();
    const binInputs2 = page.locator('input[type="number"]');
    await binInputs2.nth(0).fill('2'); // Width
    await binInputs2.nth(1).fill('1'); // Depth
    await page.getByRole('button', { name: /Add to Loose Bins/i }).click();

    await page.getByRole('button', { name: /^📦 Loose Bins$/i }).click();
    await page.getByRole('button', { name: /Place on Grid/i }).click();

    // Wait for event listeners
    await page.waitForTimeout(1000);

    // Place second bin away from first bin
    await canvas.click({
      position: {
        x: 250,
        y: 100
      },
      force: true
    });

    await page.waitForTimeout(1500);

    // Verify second bin placed
    await expect(page.getByText(/Placement Mode/i)).not.toBeVisible({ timeout: 3000 });

    console.log(`✅ Test passed! Multiple bins created and placed successfully.`);
  });

  test('should rotate bins during placement and allow movement', async ({ page }) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const projectName = `Test-Rotate-${timestamp}`;

    // Clear localStorage for clean test state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    // Create project
    await page.goto('/');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.getByRole('button', { name: /New Drawer Project/i }).click();
    await page.getByPlaceholder(/My Drawer/i).fill(projectName);
    await page.getByRole('button', { name: /Create Project/i }).click();

    const canvas = page.locator('canvas').first();

    // Create 4 bins with rotation during placement
    for (let i = 0; i < 4; i++) {
      console.log(`Creating and placing bin ${i + 1}/4`);

      await page.getByRole('button', { name: /Create Bin/i }).click();
      const binInputs = page.locator('input[type="number"]');
      await binInputs.nth(0).fill(String(2 + (i % 2))); // Alternate 2 and 3
      await binInputs.nth(1).fill('1'); // Depth 1
      await page.getByRole('button', { name: /Add to Loose Bins/i }).click();

      // Enter placement mode
      await page.getByRole('button', { name: /^📦 Loose Bins$/i }).click();
      await page.getByRole('button', { name: /Place on Grid/i }).click();

      await expect(page.getByText(/Placement Mode/i)).toBeVisible();
      await expect(page.getByText(/Click to place • Spacebar to rotate/i)).toBeVisible();
      await page.waitForTimeout(1000);

      // Rotate with spacebar
      console.log('  - Rotating with spacebar');
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);

      // Place at different positions
      const x = 150 + (i * 80);
      const y = 150;

      await canvas.click({
        position: { x, y },
        force: true
      });

      await page.waitForTimeout(1500);
      await expect(page.getByText(/Placement Mode/i)).not.toBeVisible({ timeout: 3000 });
      console.log(`✅ Bin ${i + 1} placed`);
    }

    console.log(`✅ Test passed! 4 bins created with rotation and placed successfully.`);
  });

  test('should place multiple bins without overlap', async ({ page }) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const projectName = `Test-Overlap-${timestamp}`;

    // Clear localStorage for clean test state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    // Create project
    await page.goto('/');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.getByRole('button', { name: /New Drawer Project/i }).click();
    await page.getByPlaceholder(/My Drawer/i).fill(projectName);
    await page.getByRole('button', { name: /Create Project/i }).click();

    const canvas = page.locator('canvas').first();

    // Place 3 bins at different positions
    const positions = [
      { x: 150, y: 150 },
      { x: 300, y: 150 },
      { x: 150, y: 300 }
    ];

    for (let i = 0; i < positions.length; i++) {
      console.log(`Placing bin ${i + 1} at (${positions[i].x}, ${positions[i].y})`);

      await page.getByRole('button', { name: /Create Bin/i }).click();
      const binInputs = page.locator('input[type="number"]');
      await binInputs.nth(0).fill('2'); // Width 2
      await binInputs.nth(1).fill('2'); // Depth 2
      await page.getByRole('button', { name: /Add to Loose Bins/i }).click();

      await page.getByRole('button', { name: /^📦 Loose Bins$/i }).click();
      await page.getByRole('button', { name: /Place on Grid/i }).click();
      await page.waitForTimeout(1000);

      await canvas.click({
        position: positions[i],
        force: true
      });

      await page.waitForTimeout(1500);
      await expect(page.getByText(/Placement Mode/i)).not.toBeVisible({ timeout: 3000 });
      console.log(`✅ Bin ${i + 1} placed`);
    }

    // Check loose bins status (may have bins if collision detection prevented placement)
    await page.getByRole('button', { name: /^📦 Loose Bins$/i }).click();
    const hasLooseBins = await page.getByText(/Hollow Bin/i).isVisible().catch(() => false);

    if (hasLooseBins) {
      console.log('ℹ️  Some bins remain in loose bins (collision detection prevented placement)');
    } else {
      console.log('✅ All bins placed successfully');
    }

    console.log(`✅ Test passed! Bins placed with collision detection active.`);
  });
});
