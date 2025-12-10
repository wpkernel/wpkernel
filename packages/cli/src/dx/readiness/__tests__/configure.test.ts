import {
	buildDefaultReadinessRegistry,
	createReadinessRegistry,
	DEFAULT_READINESS_ORDER,
	registerDefaultReadinessHelpers,
} from '../index';
import type { ReadinessHelper, ReadinessRegistry } from '../index';

describe('dx readiness configure', () => {
	it('builds a registry with default helpers registered in order', () => {
		const registry = buildDefaultReadinessRegistry();

		const plan = registry.plan(DEFAULT_READINESS_ORDER);

		expect(plan.keys).toEqual([...DEFAULT_READINESS_ORDER]);
	});

	it('registers helpers onto an existing registry', () => {
		const registry = createReadinessRegistry();

		registerDefaultReadinessHelpers(registry);

		const plan = registry.plan(['git']);

		expect(plan.keys).toEqual(['git']);
	});

	it('supports registering custom helper factories', () => {
		const registry: ReadinessRegistry = buildDefaultReadinessRegistry({
			helperFactories: [
				({ register, createHelper }) => {
					const helper = createHelper<unknown>({
						key: 'custom-helper',
						metadata: {
							label: 'Custom helper',
							scopes: ['generate'],
						},
						async detect() {
							return { status: 'ready', state: {} };
						},
						async confirm() {
							return { status: 'ready', state: {} };
						},
					}) as ReadinessHelper<unknown>;

					register(helper);
				},
			],
		});

		const descriptors = registry.describe();
		expect(
			descriptors.some((helper) => helper.key === 'custom-helper')
		).toBe(true);
	});
});
