import { resolvePlanPaths } from '../plan.paths';

const baseOptions = {
	input: { ir: { layout: { resolve: (id: string) => `resolved/${id}` } } },
	context: {},
} as unknown as Parameters<typeof resolvePlanPaths>[0];

describe('plan.paths', () => {
	it('resolves layout ids to paths', () => {
		const paths = resolvePlanPaths(baseOptions);
		expect(paths).toEqual(
			expect.objectContaining({
				planManifest: 'resolved/plan.manifest',
				planBase: 'resolved/plan.base',
				planIncoming: 'resolved/plan.incoming',
				blocksGenerated: 'resolved/blocks.generated',
				blocksApplied: 'resolved/blocks.applied',
				phpGenerated: 'resolved/php.generated',
				pluginLoader: 'resolved/plugin.loader',
			})
		);
	});

	it('uses default layout when layout is missing', () => {
		const options = {
			input: {},
			context: {},
		} as unknown as typeof baseOptions;
		expect(() => resolvePlanPaths(options)).toThrow(
			'Plan paths cannot be resolved without an IR.'
		);
	});
});
