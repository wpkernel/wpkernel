import { printCapabilityModule } from '../capability';
import { makeIr } from '@cli-tests/ir.test-support';

describe('printCapabilityModule', () => {
	it('generates resource and object entries with the expected bindings and config types', async () => {
		const ir = makeIr({
			capabilityMap: {
				definitions: [
					{
						id: 'cap-resource',
						key: 'jobsView',
						capability: 'acme-jobs.view',
						appliesTo: 'resource',
						source: 'map',
					},
					{
						id: 'cap-object',
						key: 'jobsEdit',
						capability: 'acme-jobs.edit',
						appliesTo: 'object',
						binding: 'jobId',
						source: 'map',
					},
					{
						id: 'cap-object-default',
						key: 'jobsDelete',
						capability: 'acme-jobs.delete',
						appliesTo: 'object',
						source: 'map',
					},
				],
			},
		});

		const { source, declaration } = await printCapabilityModule(ir);

		expect(source).toContain("'jobsView': (ctx) => {");
		expect(source).toContain("'jobsEdit': (ctx, jobId) => {");
		expect(source).toContain("'jobsDelete': (ctx, id) => {");
		expect(source).toContain("'jobsView': void;");
		expect(source).toContain("'jobsEdit': unknown;");
		expect(source).toContain("'jobsDelete': unknown;");
		expect(declaration).toContain('declare const capabilities');
	});
});
