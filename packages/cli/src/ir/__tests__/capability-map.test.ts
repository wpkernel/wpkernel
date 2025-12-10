import type { IRCapabilityHint, IRResource } from '../publicTypes';
import { resolveCapabilityMap } from '../fragments/ir.capability-map.core';
import { makeIr } from '@cli-tests/ir.test-support';
import { makeResource } from '@cli-tests/builders/fixtures.test-support';
import { WPKernelError } from '@wpkernel/core/error';

function buildHint(key: string, resource: string): IRCapabilityHint {
	return {
		key,
		source: 'resource',
		references: [
			{
				resource,
				route: '/api',
				transport: 'local',
			},
		],
	};
}

function useResources(...resources: IRResource[]): IRResource[] {
	return makeIr({ resources }).resources;
}

describe('resolveCapabilityMap', () => {
	it('returns fallback results when no inline capability map exists', async () => {
		const hints: IRCapabilityHint[] = [buildHint('demo.missing', 'demo')];
		const resources: IRResource[] = useResources(
			makeResource({ name: 'demo' })
		);

		const result = await resolveCapabilityMap({ hints, resources });

		expect(result.definitions).toHaveLength(0);
		expect(result.missing).toEqual(['demo.missing']);
		expect(
			result.warnings.some(
				(warning) => warning.code === 'capability-map.missing'
			)
		).toBe(true);
	});

	it('warns when object capabilities lack bindings', async () => {
		const resources: IRResource[] = useResources(
			makeResource({
				name: 'demo',
				identity: undefined,
				capabilities: {
					'demo.object': {
						capability: 'edit_post',
						appliesTo: 'object',
					},
				},
			})
		);

		const result = await resolveCapabilityMap({
			hints: [],
			resources,
		});

		expect(
			result.warnings.some(
				(warning) => warning.code === 'capability-map.binding.missing'
			)
		).toBe(true);
		expect(
			result.definitions.find(
				(definition) => definition.key === 'demo.object'
			)?.binding
		).toBeUndefined();
	});

	it('records missing capabilities referenced by resources', async () => {
		const resources: IRResource[] = useResources(
			makeResource({
				name: 'demo',
				capabilities: { 'demo.existing': 'manage_options' },
			}),
			makeResource({
				name: 'second',
				capabilities: { 'second.existing': 'read' },
			})
		);
		const hints: IRCapabilityHint[] = [
			{
				key: 'demo.extra',
				source: 'resource',
				references: [
					{
						resource: 'demo',
						route: '/api/demo',
						transport: 'local',
					},
				],
			},
			{
				key: 'second.extra',
				source: 'resource',
				references: [
					{
						resource: 'second',
						route: '/api/second',
						transport: 'local',
					},
				],
			},
		];

		const result = await resolveCapabilityMap({ hints, resources });

		expect(result.missing).toEqual(['demo.extra', 'second.extra']);
		const missingWarning = result.warnings.find(
			(warning) => warning.code === 'capability-map.entries.missing'
		);
		expect(missingWarning?.context).toHaveProperty('referencedBy');
		expect(missingWarning?.context?.referencedBy).toMatchObject({
			'demo.extra': ['demo'],
			'second.extra': ['second'],
		});
	});

	it('throws when conflicting capability definitions exist', async () => {
		const resources: IRResource[] = useResources(
			makeResource({
				name: 'demo',
				capabilities: { conflict: 'read' },
			}),
			makeResource({
				name: 'second',
				capabilities: { conflict: 'write' },
			})
		);

		expect(() => resolveCapabilityMap({ hints: [], resources })).toThrow(
			WPKernelError
		);
	});
});
