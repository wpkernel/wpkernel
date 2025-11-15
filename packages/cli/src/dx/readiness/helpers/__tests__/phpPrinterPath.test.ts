import { createPhpPrinterPathReadinessHelper } from '../phpPrinterPath';
import { createReadinessTestContext } from '../../test/test-support';

jest.mock('../../../../utils/phpAssets', () => ({
	resolveBundledPhpDriverPrettyPrintPath: jest
		.fn()
		.mockReturnValue('/bundle/php-json-ast/php/pretty-print.php'),
}));

describe('createPhpPrinterPathReadinessHelper', () => {
	it('reports ready when the bundled printer exists', async () => {
		const access = jest.fn().mockResolvedValue(undefined);
		const realpath = jest
			.fn()
			.mockResolvedValue('/bundle/php-json-ast/php/pretty-print.php');

		const helper = createPhpPrinterPathReadinessHelper({
			access,
			realpath,
		});

		const context = createReadinessTestContext({ workspace: null });
		const detection = await helper.detect(context);

		expect(detection.status).toBe('ready');
		expect(detection.message).toBe('PHP printer path verified.');

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
	});

	it('reports pending when the printer is missing', async () => {
		const access = jest.fn().mockRejectedValue(new Error('ENOENT'));
		const realpath = jest.fn();

		const helper = createPhpPrinterPathReadinessHelper({
			access,
			realpath,
		});

		const context = createReadinessTestContext({ workspace: null });
		const detection = await helper.detect(context);

		expect(detection.status).toBe('pending');
		expect(detection.message).toBe('PHP printer runtime path missing.');
	});

	it('reports blocked when the printer exists but canonical path cannot be resolved', async () => {
		const access = jest.fn().mockResolvedValue(undefined);
		const realpath = jest.fn().mockResolvedValue(null);

		const helper = createPhpPrinterPathReadinessHelper({
			access,
			realpath,
		});

		const context = createReadinessTestContext({ workspace: null });

		const detection = await helper.detect(context);
		expect(detection.status).toBe('blocked');
		expect(detection.message).toBe(
			'Bundled PHP printer path could not be canonicalised.'
		);
	});
});
