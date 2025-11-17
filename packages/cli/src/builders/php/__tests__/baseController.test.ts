import { createPhpBaseControllerHelper } from '../controller.base';
import {
	DEFAULT_DOC_HEADER,
	resetPhpAstChannel,
	getPhpBuilderChannel,
	resetPhpBuilderChannel,
} from '@wpkernel/wp-json-ast';
import {
	createBuilderInput,
	createBuilderOutput,
	createMinimalIr,
	createPipelineContext,
} from '../test-support/php-builder.test-support';
import { loadTestLayoutSync } from '../../../tests/layout.test-support';

describe('createPhpBaseControllerHelper', () => {
	it('skips generation when the IR artifact is not available', async () => {
		const context = createPipelineContext();
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpBaseControllerHelper();
		const next = jest.fn();
		const output = createBuilderOutput();

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir: null }),
				output,
				reporter: context.reporter,
			},
			next
		);

		expect(next).toHaveBeenCalledTimes(1);
		expect(getPhpBuilderChannel(context).pending()).toHaveLength(0);
	});

	it('generates a base controller file when an IR artifact is provided', async () => {
		const context = createPipelineContext();
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpBaseControllerHelper();
		const ir = createMinimalIr({
			meta: {
				sanitizedNamespace: 'demo-plugin',
				origin: 'wpk.config.ts',
			},
			php: {
				namespace: 'Demo\\Plugin',
				outputDir: loadTestLayoutSync().resolve('php.generated'),
				autoload: 'inc/',
			},
		});

		const reporter = context.reporter;
		jest.spyOn(reporter, 'debug');

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir }),
				output: createBuilderOutput(),
				reporter,
			},
			undefined
		);

		const pending = getPhpBuilderChannel(context).pending();
		const entry = pending.find(
			(candidate) => candidate.metadata.kind === 'base-controller'
		);

		expect(entry).toBeDefined();
		expect(entry?.docblock?.slice(0, DEFAULT_DOC_HEADER.length)).toEqual(
			DEFAULT_DOC_HEADER
		);
		expect(entry?.docblock).toEqual(
			expect.arrayContaining([
				'Source: wpk.config.ts → resources (namespace: demo-plugin)',
			])
		);
		expect(reporter.debug).toHaveBeenCalledWith(
			'createPhpBaseControllerHelper: queued Rest/BaseController.php.'
		);
	});
});
