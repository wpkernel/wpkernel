import { normalizeScreen } from '../screen';
import type { DataViewMetadataIssue } from '../types';

function run(value: unknown) {
	const issues: DataViewMetadataIssue[] = [];
	const result = normalizeScreen(value, issues, ['screen']);
	return { result, issues };
}

describe('normalizeScreen', () => {
	it('reports when value is not an object', () => {
		const { result, issues } = run(null);
		expect(result).toBeUndefined();
		expect(issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					message: 'Screen configuration must be an object.',
				}),
			])
		);
	});

	it('normalizes optional string fields and menu', () => {
		const { result, issues } = run({
			component: 'JobsScreen',
			route: 'jobs',
			menu: { slug: 'jobs', title: 'Jobs' },
			extra: { foo: 'bar' },
		});

		expect(issues).toEqual([]);
		expect(result).toEqual(
			expect.objectContaining({
				component: 'JobsScreen',
				route: 'jobs',
				menu: expect.objectContaining({ slug: 'jobs', title: 'Jobs' }),
				extra: { foo: 'bar' },
			})
		);
	});

	it('bubbles validation failure from string field', () => {
		const { result, issues } = run({
			component: '',
		});

		expect(result).toBeUndefined();
		expect(issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					message:
						'component must be a non-empty string when provided.',
				}),
			])
		);
	});
});
