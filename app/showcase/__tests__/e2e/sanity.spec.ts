/**
 * Clean WordPress Environment Sanity Checks
 *
 * Verifies WordPress environment without console error tracking
 * to avoid script timing interference that causes lodash errors.
 */

import { test, expect } from '@geekist/wp-kernel-e2e-utils';
import type { Page } from '@playwright/test';

/**
 * Helper function to log into WordPress admin
 * @param page
 */
async function loginToWordPress(page: Page) {
	await page.goto('/wp-login.php');
	await page.fill('#user_login', 'admin');
	await page.fill('#user_pass', 'password');
	await page.click('#wp-submit');
	await page.waitForURL(/\/wp-admin/);
}

test.describe('Clean WordPress Environment Sanity Checks', () => {
	test.beforeEach(async ({ requestUtils }) => {
		await requestUtils.activatePlugin('wp-kernel-showcase');
	});

	test('should login to wp-admin successfully', async ({ page }) => {
		await loginToWordPress(page);

		// Verify we're in wp-admin
		const isInAdmin =
			(await page.locator('#wpadminbar').isVisible()) ||
			(await page.locator('#wpwrap').isVisible()) ||
			(await page.url()).includes('/wp-admin/');

		expect(isInAdmin, 'Should be logged into WordPress admin').toBe(true);
	});

	test('should have showcase plugin activated', async ({ page }) => {
		await loginToWordPress(page);
		await page.goto('/wp-admin/plugins.php');
		await page.waitForSelector('#wpbody-content');

		const pluginActive = await page.evaluate(() => {
			const pageHtml = document.body.innerHTML;
			return (
				(pageHtml.includes('showcase-plugin') ||
					pageHtml.includes('Showcase Plugin')) &&
				pageHtml.includes('Deactivate')
			);
		});

		expect(pluginActive, 'Showcase plugin should be active').toBe(true);
	});

	test('should load admin pages correctly', async ({ page }) => {
		await loginToWordPress(page);
		await page.goto('/wp-admin/');
		await page.waitForTimeout(1000);

		const isAdminPageLoaded = await page.locator('#wpwrap').isVisible();
		expect(isAdminPageLoaded, 'Admin page should load correctly').toBe(
			true
		);
	});

	test('should have accessible REST API', async ({ page }) => {
		await loginToWordPress(page);

		const response = await page.request.get('/wp-json/');
		expect(response.status()).toBe(200);

		const json = await response.json();
		expect(json).toHaveProperty('name');
		expect(json).toHaveProperty('namespaces');
	});
});
