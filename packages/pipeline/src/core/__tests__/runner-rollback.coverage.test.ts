import { makeRollbackHandler } from '../runner/rollback';
import type { RollbackContext } from '../runner/types';
import type { PipelineRollback } from '../rollback';

describe('runner rollback coverage', () => {
	it('uses fallback extension coordinator when no stack exists', async () => {
		const handlerCalls: unknown[] = [];
		const rollbackContext: RollbackContext<
			{ reporter?: unknown },
			unknown,
			unknown
		> = {
			context: {},
			extensionCoordinator: {
				createRollbackHandler: () => (error: unknown) => {
					handlerCalls.push(error);
					throw error;
				},
			},
			extensionState: { artifact: {}, results: [], hooks: [] },
		};

		const rollbackHandler = makeRollbackHandler(
			rollbackContext,
			[
				{
					helper: { key: 'helper' },
					rollback: {
						key: 'rb',
						run: () => undefined,
					} as PipelineRollback,
				},
			],
			undefined
		);

		await rollbackHandler(new Error('fail'));

		expect(handlerCalls.length).toBe(1);
	});
});
