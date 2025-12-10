import { createAdminScreenBuilder } from '../admin-screen';
import { makeIr, buildTestArtifactsPlan } from '@cli-tests/ir.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import {
	buildOutput,
	buildReporter,
} from '@cli-tests/builders/builder-harness.test-support';
import { makeResource } from '@cli-tests/builders/fixtures.test-support';

describe('ts admin screen builder (IR driven)', () => {
	it('skips when IR or artifacts are missing', async () => {
		const builder = createAdminScreenBuilder();
		const reporter = buildReporter();
		const output = buildOutput();

		await builder.apply({
			input: {
				phase: 'generate',
				options: {
					namespace: 'demo',
					origin: 'wpk.config.ts',
					sourcePath: 'wpk.config.ts',
				},
				ir: null,
			},
			context: {
				workspace: makeWorkspaceMock(),
				reporter,
				phase: 'generate',
				generationState: { version: 1, resources: {}, removed: [] },
			},
			output,
			reporter,
		} as any);

		expect(reporter.debug).toHaveBeenCalledWith(
			'admin screen builder: prerequisites missing',
			expect.objectContaining({ hasIr: false })
		);
	});

	it('logs when runtime artifact path is missing', async () => {
		const layoutIr = makeIr({
			resources: [makeResource({ id: 'res:job', name: 'job' }) as any],
		});
		const artifacts = buildTestArtifactsPlan(layoutIr.layout);
		artifacts.runtime = undefined as any;
		artifacts.resources = {
			'res:job': {
				modulePath: 'app/generated/job/resource.ts',
				typeDefPath: 'types/generated/job.d.ts',
				typeSource: 'inferred',
				schemaKey: 'job',
			},
		};
		artifacts.surfaces = {
			'res:job': {
				resource: 'job',
				appDir: 'ui/applied/job',
				generatedAppDir: 'ui/generated/job',
				pagePath: 'ui/applied/job/page.tsx',
				formPath: 'ui/applied/job/form.tsx',
				configPath: 'ui/applied/job/config.tsx',
			},
		};
		const ir = { ...layoutIr, artifacts };

		const builder = createAdminScreenBuilder();
		const reporter = buildReporter();
		const output = buildOutput();

		await builder.apply({
			input: {
				phase: 'generate',
				options: {
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: ir.meta.sourcePath,
				},
				ir,
			},
			context: {
				workspace: makeWorkspaceMock(),
				reporter,
				phase: 'generate',
				generationState: { version: 1, resources: {}, removed: [] },
			},
			output,
			reporter,
		} as any);

		expect(reporter.debug).toHaveBeenCalledWith(
			expect.stringContaining(
				'admin screen builder: missing runtime path in artifacts.'
			)
		);
	});
});
