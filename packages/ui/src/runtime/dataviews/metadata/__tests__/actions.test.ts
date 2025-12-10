import { normalizeActions } from '../actions';

describe('normalizeActions', () => {
	it('reports when value is not an array', () => {
		const issues: any[] = [];
		const result = normalizeActions({}, issues, ['actions']);

		expect(result).toBeUndefined();
		expect(issues[0]).toMatchObject({
			path: ['actions'],
		});
	});

	it('skips invalid entries and returns undefined when any fail', () => {
		const issues: any[] = [];
		const result = normalizeActions(
			[{ id: 'ok' }, { id: '' }, 'nope'],
			issues,
			['actions']
		);

		expect(result).toBeUndefined();
		expect(issues).toHaveLength(2);
	});

	it('returns shallow clones when all entries are valid', () => {
		const issues: any[] = [];
		const input = [{ id: 'open', label: 'Open' }];

		const result = normalizeActions(input, issues, ['actions']);

		expect(issues).toHaveLength(0);
		expect(result).toEqual(input);
		expect(result).not.toBe(input);
	});
});
