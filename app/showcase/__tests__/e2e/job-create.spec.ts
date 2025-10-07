import { test, expect } from '@geekist/wp-kernel-e2e-utils';
import type { Page } from '@playwright/test';
import type { ResourceConfig } from '@geekist/wp-kernel';
import type { Job } from '../../types/job';

const JOB_RESOURCE_CONFIG: ResourceConfig<Job> = {
	name: 'job',
	routes: {
		create: { path: '/wp-kernel-showcase/v1/jobs', method: 'POST' },
		remove: { path: '/wp-kernel-showcase/v1/jobs/:id', method: 'DELETE' },
	},
};

async function login(page: Page) {
	await page.goto('/wp-login.php');
	await page.fill('#user_login', 'admin');
	await page.fill('#user_pass', 'password');
	await page.click('#wp-submit');
	await page.waitForURL(/\/wp-admin/);
}

async function openJobsPage(page: Page) {
	await login(page);
	await page.goto('/wp-admin/admin.php?page=wpk-jobs');
	await page.waitForSelector('[data-testid="jobs-admin-root"]');
}

async function waitForJobsTableSettled(page: Page): Promise<void> {
	const loading = page.locator('[data-testid="jobs-table-loading"]');
	// If the spinner becomes visible, wait for it to disappear
	await loading
		.waitFor({ state: 'visible', timeout: 200 })
		.catch(() => undefined);
	await loading
		.waitFor({ state: 'detached', timeout: 20000 })
		.catch(() => undefined);
}

test.describe.serial('Job creation workflow', () => {
	const createdJobIds: number[] = [];

	test.beforeEach(async ({ requestUtils }) => {
		await requestUtils.activatePlugin('wp-kernel-showcase');
	});

	test.afterEach(async ({ kernel }) => {
		if (!createdJobIds.length) {
			return;
		}

		const jobResource = kernel.resource<Job>(JOB_RESOURCE_CONFIG);
		for (const id of createdJobIds.splice(0, createdJobIds.length)) {
			try {
				await jobResource.remove(id);
			} catch (error) {
				console.warn(`Failed to cleanup job ${id}:`, error);
			}
		}
	});

	test('creates a job via the admin form and displays it in the table', async ({
		page,
	}) => {
		await openJobsPage(page);
		const jobTitle = `Platform QA Lead ${Date.now()}`;
		await page.fill('[data-testid="job-title-input"]', jobTitle);
		await page.fill('[data-testid="job-department-input"]', 'Quality');
		await page.fill('[data-testid="job-location-input"]', 'Remote');
		await page.fill(
			'[data-testid="job-description-input"]',
			'Owns platform quality operations.'
		);
		await page.selectOption('[data-testid="job-status-select"]', 'publish');
		await page.click('[data-testid="job-submit-button"]');

		// Wait for submission to complete - button becomes enabled again
		await expect(
			page.locator('[data-testid="job-submit-button"]')
		).toBeEnabled({ timeout: 15000 });

		// Check feedback message appears (should be visible after submission completes)
		await expect(
			page.locator('[data-testid="job-create-feedback"]')
		).toBeVisible({ timeout: 5000 });
		await expect(
			page.locator('[data-testid="job-create-feedback"]')
		).toHaveText(/Job created successfully/i);

		// Wait for table to update
		await waitForJobsTableSettled(page);

		// Verify the job appears in the table
		const rowLocator = page
			.locator('[data-testid^="jobs-table-row-"]')
			.filter({ hasText: jobTitle });
		await expect(rowLocator).toBeVisible({ timeout: 30000 });
		const jobIdAttr = await rowLocator.first().getAttribute('data-job-id');
		const jobId = jobIdAttr ? Number(jobIdAttr) : NaN;
		if (Number.isNaN(jobId)) {
			throw new Error('Failed to capture created job ID for cleanup');
		} else {
			createdJobIds.push(jobId);
		}
	});
});
