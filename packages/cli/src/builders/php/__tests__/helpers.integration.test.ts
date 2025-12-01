import path from 'node:path';
import {
	createPhpBuilderConfigHelper,
	createPhpChannelHelper,
	createPhpBaseControllerHelper,
	createPhpTransientStorageHelper,
	createPhpWpOptionStorageHelper,
	createPhpWpTaxonomyStorageHelper,
	createPhpWpPostRoutesHelper,
	createPhpResourceControllerHelper,
	createPhpCapabilityHelper,
	createPhpPersistenceRegistryHelper,
	createPhpPluginLoaderHelper,
	createPhpIndexFileHelper,
	createPhpBlocksHelper,
} from '../index';
import { getPhpBuilderChannel } from '@wpkernel/wp-json-ast';
import { makePhpIrFixture } from '@cli-tests/builders/resources.test-support';
import { buildEmptyGenerationState } from '../../../apply/manifest';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import type { BuilderOutput } from '../../../runtime/types';
import { createArtifactsFragment } from '../../../ir/fragments/artifacts';

const makeConfig = (namespace: string) => ({
	version: 1,
	namespace,
	schemas: {},
	resources: {},
});

function buildReporter() {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis(),
	};
}

function buildWorkspace() {
	return makeWorkspaceMock({
		root: process.cwd(),
		cwd: jest.fn(() => process.cwd()),
	});
}

describe('PHP helpers integration (flat pipeline)', () => {
	it('queues PHP programs with channel + helpers sequence', async () => {
		const ir = makePhpIrFixture();
		const config = makeConfig(ir.meta.namespace);
		const reporter = buildReporter();
		const workspace = buildWorkspace();
		const context = {
			workspace,
			reporter,
			phase: 'generate',
			generationState: buildEmptyGenerationState(),
		};
		const input = {
			phase: 'generate' as const,
			options: {
				config,
				namespace: config.namespace,
				origin: ir.meta.origin,
				sourcePath: ir.meta.sourcePath,
			},
			ir,
		};
		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};

		const artifactsFragment = createArtifactsFragment();
		await artifactsFragment.apply({
			context,
			input: {
				phase: 'generate',
				options: {
					config,
					namespace: config.namespace,
					origin: ir.meta.origin,
					sourcePath: ir.meta.sourcePath,
				},
				draft: ir,
			},
			output: {
				draft: ir,
				assign(partial) {
					Object.assign(ir, partial);
				},
			},
			reporter,
		});

		const helpers = [
			createPhpChannelHelper(),
			createPhpBuilderConfigHelper(),
			createPhpBaseControllerHelper(),
			createPhpTransientStorageHelper(),
			createPhpWpOptionStorageHelper(),
			createPhpWpTaxonomyStorageHelper(),
			createPhpWpPostRoutesHelper(),
			createPhpResourceControllerHelper(),
			createPhpCapabilityHelper(),
			createPhpPersistenceRegistryHelper(),
			createPhpPluginLoaderHelper(),
			createPhpIndexFileHelper(),
			createPhpBlocksHelper(),
		];

		for (const helper of helpers) {
			await helper.apply({ context, input, output, reporter });
		}

		const channel = getPhpBuilderChannel(context);
		const files = channel.drain().map((entry) => ({
			file: path.posix.relative(
				workspace.root,
				entry.file.replace(/\\/g, '/')
			),
			kind: entry.metadata.kind,
		}));

		expect(files).toMatchSnapshot();
	});
});
