import { createPhpRuntimeReadinessHelper } from '../phpRuntime';
import { createReadinessTestContext } from '@cli-tests/readiness.test-support';
import {
	createQuickstartDepsMock,
	type QuickstartDepsMock,
	makePromiseWithChild,
	makeRejectedPromiseWithChild,
} from '@cli-tests/dx/quickstart.test-support';

describe('createPhpRuntimeReadinessHelper', () => {
	let deps: QuickstartDepsMock;

	beforeEach(() => {
		deps = createQuickstartDepsMock();
	});

	it('detects php binary availability', async () => {
		deps.exec.mockReturnValue(
			makePromiseWithChild({
				stdout: 'PHP 8.1.0',
				stderr: '',
			})
		);
		const helper = createPhpRuntimeReadinessHelper({
			exec: deps.exec,
		});
		const context = createReadinessTestContext({ workspace: null });
		const detection = await helper.detect(context);

		expect(detection.status).toBe('ready');
		expect(detection.state.version).toContain('PHP');

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
	});

	it('flags missing php binary', async () => {
		deps.exec.mockReturnValue(
			makeRejectedPromiseWithChild(new Error('not found'))
		);
		const helper = createPhpRuntimeReadinessHelper({
			exec: deps.exec,
		});
		const detection = await helper.detect(
			createReadinessTestContext({ workspace: null })
		);
		expect(detection.status).toBe('blocked');
		expect(detection.message).toBe('PHP binary not available on PATH.');

		const confirmation = await helper.confirm(
			createReadinessTestContext({ workspace: null }),
			detection.state
		);
		expect(confirmation.status).toBe('pending');
		expect(confirmation.message).toBe('PHP binary still missing.');
	});

	it('handles unknown version output gracefully', async () => {
		deps.exec.mockReturnValue(
			makePromiseWithChild({
				stdout: '',
				stderr: '',
			})
		);
		const helper = createPhpRuntimeReadinessHelper({
			exec: deps.exec,
		});
		const context = createReadinessTestContext({ workspace: null });
		const detection = await helper.detect(context);

		expect(detection.message).toBe('PHP detected (unknown).');
		expect(detection.state.version).toBe('unknown');
	});
});
