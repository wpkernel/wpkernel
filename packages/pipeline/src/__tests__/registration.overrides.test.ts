import { registerHelper } from '../registration';
import type { Helper } from '../types';
import type { RegisteredHelper } from '../dependency-graph';

describe('registerHelper overrides', () => {
	const createError = (code: string, message: string) =>
		new Error(`[${code}] ${message}`);
	const noop = () => {};

	type TestHelper = Helper<any, any, any, any, 'test'>;

	const createTestHelper = (
		key: string,
		mode: 'extend' | 'override' = 'extend'
	): TestHelper => ({
		kind: 'test',
		key,
		mode,
		priority: 0,
		dependsOn: [],
		apply: noop,
	});

	it('removes existing extend helpers when an override is registered', () => {
		const entries: RegisteredHelper<TestHelper>[] = [];

		// 1. Register initial 'extend' helpers
		registerHelper(
			createTestHelper('demo', 'extend'),
			'test',
			entries,
			'test',
			noop,
			createError
		);
		registerHelper(
			createTestHelper('demo', 'extend'),
			'test',
			entries,
			'test',
			noop,
			createError
		);

		expect(entries).toHaveLength(2);

		// 2. Register 'override' helper
		registerHelper(
			createTestHelper('demo', 'override'),
			'test',
			entries,
			'test',
			noop,
			createError
		);

		// EXPECTATION: The previous 2 are gone, only the override remains
		expect(entries).toHaveLength(1);
		expect(entries[0]!.helper.mode).toBe('override');
	});

	it('allows subsequent extends after an override', () => {
		const entries: RegisteredHelper<TestHelper>[] = [];

		registerHelper(
			createTestHelper('demo', 'extend'),
			'test',
			entries,
			'test',
			noop,
			createError
		);
		registerHelper(
			createTestHelper('demo', 'override'),
			'test',
			entries,
			'test',
			noop,
			createError
		);

		expect(entries).toHaveLength(1); // Only override

		registerHelper(
			createTestHelper('demo', 'extend'),
			'test',
			entries,
			'test',
			noop,
			createError
		);

		expect(entries).toHaveLength(2); // Override + new extend
		expect(entries[0]!.helper.mode).toBe('override');
		expect(entries[1]!.helper.mode).toBe('extend');
	});
});
