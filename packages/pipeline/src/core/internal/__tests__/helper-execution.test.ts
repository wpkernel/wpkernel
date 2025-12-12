import {
	assertAllHelpersExecuted,
	buildExecutionSnapshot,
} from '../helper-execution';
import type { HelperDescriptor } from '../../types';
import type { RegisteredHelper } from '../../dependency-graph';

describe('helper-execution', () => {
	it('assertAllHelpersExecuted throws when required helpers are missed', () => {
		const entries: RegisteredHelper<HelperDescriptor<'fragment'>>[] = [
			{
				id: '1',
				index: 0,
				helper: {
					key: 'h1',
					kind: 'fragment',
					mode: 'extend',
					priority: 0,
					dependsOn: [],
					optional: false,
				},
			},
			{
				id: '2',
				index: 1,
				helper: {
					key: 'h2',
					kind: 'fragment',
					mode: 'extend',
					priority: 0,
					dependsOn: [],
					optional: true,
				},
			},
		];

		const visited = new Set(['2']); // h1 is required but not visited
		const snapshot = buildExecutionSnapshot(entries, visited, 'fragment');
		const createError = (_code: string, message: string) =>
			new Error(message);
		const describeHelper = (_kind: string, h: HelperDescriptor) =>
			`Helper "${h.key}"`;

		expect(() =>
			assertAllHelpersExecuted(
				entries,
				snapshot,
				'fragment',
				describeHelper,
				createError
			)
		).toThrow(
			'Pipeline finalisation aborted because Helper "h1" did not execute.'
		);
	});
});
