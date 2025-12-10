import { normalizeFields } from '../fields';

describe('normalizeFields', () => {
	it('reports non-array inputs', () => {
		const issues: any[] = [];
		const result = normalizeFields({}, issues, ['fields']);

		expect(result).toBeUndefined();
		expect(issues[0]).toMatchObject({ path: ['fields'] });
	});

	it('skips entries without ids and returns undefined when any invalid', () => {
		const issues: any[] = [];
		const result = normalizeFields(
			[{ id: 'title', type: 'text' }, { type: 'text' }],
			issues,
			['fields']
		);

		expect(result).toBeUndefined();
		expect(issues).toHaveLength(1);
	});

	it('returns shallow clones for valid entries', () => {
		const issues: any[] = [];
		const input = [{ id: 'title', type: 'text' }];

		const result = normalizeFields(input, issues, ['fields']);

		expect(result).toEqual(input);
		expect(result).not.toBe(input);
	});
});
