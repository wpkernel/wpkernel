import path from 'node:path';
import { detectTier, prioritiseQueued, type Trigger } from '../start/helpers';

describe('start helpers', () => {
	it('detects slow tiers for contract and schema paths', () => {
		expect(detectTier('contracts/item.schema.json')).toBe('slow');
		expect(detectTier('schemas/foo.json')).toBe('slow');
		expect(detectTier(path.resolve('schemas/absolute.json'))).toBe('slow');
		expect(detectTier('src/resources/post.ts')).toBe('fast');
		expect(detectTier(process.cwd())).toBe('fast');
	});

	it('prioritises queued triggers preferring slow changes', () => {
		const fastTrigger: Trigger = {
			tier: 'fast',
			event: 'change',
			file: 'wpk.config.ts',
		};
		const slowTrigger: Trigger = {
			tier: 'slow',
			event: 'change',
			file: 'contracts/item.schema.json',
		};
		const anotherFast: Trigger = {
			tier: 'fast',
			event: 'change',
			file: 'wpk.config.ts',
		};

		expect(prioritiseQueued(null, fastTrigger)).toBe(fastTrigger);
		expect(prioritiseQueued(fastTrigger, slowTrigger)).toBe(slowTrigger);
		expect(prioritiseQueued(slowTrigger, fastTrigger)).toBe(slowTrigger);
		expect(prioritiseQueued(fastTrigger, anotherFast)).toBe(anotherFast);
	});
});
