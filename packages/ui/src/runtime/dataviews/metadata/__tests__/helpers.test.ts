import type { View } from '@wordpress/dataviews';
import type { ResourceDataViewActionConfig } from '../../../../dataviews/types';
import type { DataViewMetadataIssue } from '../types';
import { normalizeActions } from '../actions';
import { normalizeMenu } from '../menu';
import { buildConfig } from '../config';
import { normalizeFields } from '../fields';
import { normalizePerPageSizes, normalizeDefaultLayouts } from '../pagination';
import { applyOptional, isRecord, isNonEmptyString } from '../primitives';
import { normalizeView, normalizeSavedViews } from '../views';
import {
	createAction,
	createConfig,
} from '../../../../../tests/ResourceDataView.test-support';

function makeIssues(): DataViewMetadataIssue[] {
	return [];
}

const validView: View = { type: 'table' };

describe('metadata helpers', () => {
	describe('normalizeActions', () => {
		it('fails when actions is not an array', () => {
			const issues = makeIssues();

			expect(
				normalizeActions({ foo: true } as unknown, issues, ['actions'])
			).toBeUndefined();
			expect(issues).toHaveLength(1);
		});

		it('normalizes valid actions', () => {
			const issues = makeIssues();
			const actionFn = createAction(jest.fn(), {
				scope: 'crossTab',
				bridged: true,
			});
			const action: ResourceDataViewActionConfig<
				unknown,
				unknown,
				unknown
			> = {
				id: 'run',
				action: actionFn,
				label: 'Run',
				getActionArgs: () => ({ selection: [], items: [] }),
			};
			const normalized = normalizeActions([action], issues, ['actions']);

			expect(normalized).toBeDefined();
			expect(normalized).toHaveLength(1);
			const normalizedList = normalized ?? [];
			expect(normalizedList).toHaveLength(1);
			const firstNormalized = normalizedList[0];
			expect(firstNormalized).toBeDefined();
			if (firstNormalized) {
				expect(firstNormalized.id).toBe('run');
			}
			expect(issues).toHaveLength(0);
		});
	});

	describe('normalizeMenu', () => {
		it('reports issues for non-objects', () => {
			const issues = makeIssues();

			expect(normalizeMenu('bad', issues, ['menu'])).toBeUndefined();
			expect(issues).toHaveLength(1);
		});

		it('accepts required fields and preserves extra keys', () => {
			const issues = makeIssues();
			const menu = normalizeMenu(
				{
					slug: 'jobs',
					title: 'Jobs',
					capability: 'view',
					position: 10,
					extra: 'value',
				},
				issues,
				['menu']
			);

			expect(menu).toMatchObject({
				slug: 'jobs',
				title: 'Jobs',
				capability: 'view',
				position: 10,
				extra: 'value',
			});
			expect(issues).toHaveLength(0);
		});
	});

	describe('buildConfig', () => {
		it('builds configuration when provided valid metadata', () => {
			const issues = makeIssues();
			const metadata: Record<string, unknown> = {
				...createConfig({
					search: true,
					searchLabel: 'Find',
					getItemId: () => 'id',
					actions: [
						{
							id: 'run',
							action: createAction(jest.fn(), {
								scope: 'crossTab',
								bridged: true,
							}),
							label: 'Run',
							getActionArgs: () => ({ selection: [], items: [] }),
						},
					],
					perPageSizes: [10, 25],
					defaultLayouts: { table: { layout: 'grid' } },
					views: [
						{
							id: 'all',
							label: 'All',
							view: validView,
							isDefault: true,
						},
					],
					screen: {
						component: 'screen',
						route: '/admin/jobs',
						menu: {
							slug: 'jobs',
							title: 'Jobs',
							capability: 'manage_options',
							position: 20,
						},
					},
					empty: 'Empty state',
				}),
			};

			const config = buildConfig(metadata, issues, [
				'dataviews',
			]) as NonNullable<ReturnType<typeof buildConfig>>;

			expect(config).toBeDefined();
			expect(config.fields).toHaveLength(1);
			expect(config.search).toBe(true);
			expect(config.searchLabel).toBe('Find');
			expect(config.actions?.[0]?.id).toBe('run');
			expect(config.perPageSizes).toEqual([10, 25]);
			expect(config.defaultLayouts).toEqual({
				table: { layout: 'grid' },
			});
			expect(config.views?.[0]?.id).toBe('all');
			expect(config.screen).toBeUndefined();
			expect(config.empty).toBe('Empty state');
			expect(issues).toHaveLength(0);
		});

		it('reports issues when required metadata is missing', () => {
			const issues = makeIssues();
			const metadata: Record<string, unknown> = {
				...createConfig({ fields: [], defaultView: {} as View }),
				mapQuery: undefined,
			};

			expect(
				buildConfig(metadata, issues, ['dataviews'])
			).toBeUndefined();
			expect(issues.length).toBeGreaterThan(0);
		});

		it('adds a defaultLayouts entry for the active view type when missing', () => {
			const issues = makeIssues();
			const metadata: Record<string, unknown> = {
				...createConfig({}),
			};

			const config = buildConfig(metadata, issues, [
				'dataviews',
			]) as NonNullable<ReturnType<typeof buildConfig>>;

			expect(config.defaultLayouts?.table).toEqual({});
			expect(issues).toHaveLength(0);
		});
	});

	describe('normalizeFields', () => {
		it('returns undefined with issues when entry is invalid', () => {
			const issues = makeIssues();

			expect(
				normalizeFields('not array', issues, ['fields'])
			).toBeUndefined();
			expect(issues).toHaveLength(1);
		});

		it('accepts valid field records', () => {
			const issues = makeIssues();

			const result = normalizeFields(
				[{ id: 'slug', label: 'Slug' }],
				issues,
				['fields']
			);

			expect(result).toHaveLength(1);
			expect(issues).toHaveLength(0);
		});
	});

	describe('pagination helpers', () => {
		it('rejects invalid perPageSizes entries', () => {
			const issues = makeIssues();

			expect(
				normalizePerPageSizes([-1, 'x'], issues, ['perPageSizes'])
			).toBeUndefined();
			expect(issues).toHaveLength(2);
		});

		it('validates default layouts structure', () => {
			const issues = makeIssues();

			expect(
				normalizeDefaultLayouts({ '': { foo: 'bar' } }, issues, [
					'defaultLayouts',
				])
			).toBeUndefined();
			expect(issues.length).toBeGreaterThan(0);
		});
	});

	describe('primitives helpers', () => {
		it('identifies records and non-empty strings', () => {
			expect(isRecord({})).toBe(true);
			expect(isRecord(null)).toBe(false);
			expect(isNonEmptyString('foo')).toBe(true);
			expect(isNonEmptyString('')).toBe(false);
		});

		it('applies optional assignments correctly', () => {
			const issues = makeIssues();
			const source = { key: 'value' };
			let assigned = '';

			expect(
				applyOptional(
					source,
					'key',
					['primitives'],
					() => 'value',
					(value) => {
						assigned = value;
					}
				)
			).toBe(true);
			expect(assigned).toBe('value');
			expect(
				applyOptional(
					source,
					'missing',
					['primitives'],
					() => undefined,
					() => {}
				)
			).toBe(true);
			expect(
				applyOptional(
					source,
					'key',
					['primitives'],
					() => undefined,
					() => {}
				)
			).toBe(false);
			expect(issues.length).toBe(0);
		});
	});

	describe('view helpers', () => {
		it('rejects non-object views', () => {
			const issues = makeIssues();

			expect(normalizeView('bad', issues, ['view'])).toBeUndefined();
			expect(issues).toHaveLength(1);
		});

		it('parses saved views with optional fields', () => {
			const issues = makeIssues();
			const savedViews = normalizeSavedViews(
				[
					{
						id: 'one',
						label: 'One',
						view: validView,
						isDefault: true,
					},
				],
				issues,
				['views']
			);

			expect(savedViews).toHaveLength(1);
			const viewsList = savedViews ?? [];
			const firstView = viewsList[0];
			expect(firstView).toBeDefined();
			if (firstView) {
				expect(firstView.isDefault).toBe(true);
			}
			expect(issues).toHaveLength(0);
		});
	});
});
