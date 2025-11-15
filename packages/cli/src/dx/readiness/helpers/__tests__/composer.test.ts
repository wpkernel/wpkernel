import { createComposerReadinessHelper } from '../composer';
import { resolveBundledComposerAutoloadPath } from '../../../../utils/phpAssets';
import { createReadinessTestContext } from '../../test/test-support';

function createHelper(
	overrides: Parameters<typeof createComposerReadinessHelper>[0] = {}
) {
	const baseDependencies = {
		pathExists: jest.fn().mockResolvedValue(false),
	};
	const helper = createComposerReadinessHelper({
		...baseDependencies,
		...overrides,
	});

	return {
		helper,
		pathExists:
			(overrides.pathExists as typeof baseDependencies.pathExists) ??
			baseDependencies.pathExists,
	};
}

describe('createComposerReadinessHelper', () => {
	it('returns ready when the CLI bundle contains the composer autoload', async () => {
		const autoloadPath = resolveBundledComposerAutoloadPath();
		const { helper } = createHelper({
			pathExists: jest
				.fn()
				.mockImplementation(
					async (candidate) => candidate === autoloadPath
				),
		});

		const context = createReadinessTestContext({ workspace: null });
		const detection = await helper.detect(context);

		expect(detection.status).toBe('ready');
		expect(detection.message).toBe('Bundled composer autoload detected.');
		expect(detection.state.autoloadPath).toBe(autoloadPath);
		expect(detection.state.sourcePackage).toBe('@wpkernel/php-json-ast');

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
		expect(confirmation.message).toBe('Bundled composer autoload ready.');
	});

	it('reports pending when the CLI bundle autoload is missing', async () => {
		const { helper, pathExists } = createHelper({
			pathExists: jest.fn().mockResolvedValue(false),
		});
		const context = createReadinessTestContext({ workspace: null });

		const detection = await helper.detect(context);

		expect(detection.status).toBe('pending');
		expect(pathExists).toHaveBeenCalledWith(
			resolveBundledComposerAutoloadPath()
		);
	});

	it('returns pending when no bundled autoload is available', async () => {
		const { helper } = createHelper();
		const context = createReadinessTestContext({ workspace: null });

		const detection = await helper.detect(context);

		expect(detection.status).toBe('pending');
		expect(detection.message).toBe(
			'Bundled composer autoload missing from PHP assets package.'
		);
		expect(detection.state.autoloadPath).toBeNull();
	});
});
