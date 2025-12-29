import { makePipeline } from '../makePipeline';
import type { PipelinePaused } from '../types';

describe('executeRun pause handling', () => {
	it('throws when a non-resumable pipeline returns a paused result', async () => {
		const pipeline = makePipeline({
			helperKinds: [],
			createContext: () => ({ reporter: {} }),
			createState: () => ({}),
			createStages: (_deps: any) => [
				(state: any) =>
					({
						__paused: true,
						snapshot: {
							stageIndex: 0,
							state,
							createdAt: Date.now(),
						},
					}) as PipelinePaused<unknown>,
			],
		});

		expect(() => pipeline.run({})).toThrow(
			'Pipeline paused during executeRun'
		);
	});
});
