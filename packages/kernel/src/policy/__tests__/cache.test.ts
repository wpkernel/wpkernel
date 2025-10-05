import { createPolicyCache, createPolicyCacheKey } from '../cache';

jest.mock('../../namespace/detect', () => ({
	getNamespace: () => 'acme',
}));

type BroadcastMessage =
	| {
			type: 'set';
			namespace: string;
			key: string;
			value: boolean;
			expiresAt: number;
	  }
	| { type: 'invalidate'; namespace: string; policyKey?: string }
	| { type: 'clear'; namespace: string };

class MockBroadcastChannel {
	public static instances: MockBroadcastChannel[] = [];

	public messages: BroadcastMessage[] = [];

	public onmessage: ((event: MessageEvent<BroadcastMessage>) => void) | null =
		null;

	public constructor(public readonly name: string) {
		MockBroadcastChannel.instances.push(this);
	}

	public postMessage(message: BroadcastMessage) {
		this.messages.push(message);
	}

	public close() {
		// noop for tests
	}
}

describe('createPolicyCache', () => {
	const storageKey = 'wpk.policy.cache.acme';
	const originalBroadcastChannel = global.window.BroadcastChannel;
	const originalSessionStorage = global.window.sessionStorage;

	beforeEach(() => {
		jest.restoreAllMocks();
		MockBroadcastChannel.instances = [];
		window.sessionStorage.clear();
		Object.defineProperty(window, 'BroadcastChannel', {
			configurable: true,
			value: MockBroadcastChannel,
		});
	});

	afterEach(() => {
		Object.defineProperty(window, 'BroadcastChannel', {
			configurable: true,
			value: originalBroadcastChannel,
		});
		Object.defineProperty(window, 'sessionStorage', {
			configurable: true,
			value: originalSessionStorage,
		});
	});

	it('creates stable cache keys for complex params', () => {
		const key = createPolicyCacheKey('policy', {
			beta: 2,
			alpha: [{ nested: true }, 3],
			nullable: null,
		});

		expect(key).toBe(
			'policy::{"alpha":[{"nested":true},3],"beta":2,"nullable":null}'
		);
	});

	it('hydrates persisted session storage entries', () => {
		const expiresAt = Date.now() + 1000;
		window.sessionStorage.setItem(
			storageKey,
			JSON.stringify({
				'policy::void': { value: true, expiresAt },
			})
		);

		const cache = createPolicyCache({ storage: 'session' }, 'acme');
		expect(cache.get('policy::void')).toBe(true);
		expect(cache.keys()).toEqual(['policy::void']);
	});

	it('guards against invalid persisted data', () => {
		const warn = jest
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);
		window.sessionStorage.setItem(storageKey, '{invalid json');

		const cache = createPolicyCache({ storage: 'session' }, 'acme');
		expect(cache.keys()).toEqual([]);
		expect(warn).toHaveBeenCalledWith(
			'[kernel.policy.cache]',
			'Failed to parse persisted policy cache.',
			expect.any(SyntaxError)
		);
		expect(console as any).toHaveWarned();
	});

	it('persists values and surfaces storage errors', () => {
		const store = new Map<string, string>();
		const setItem = jest.fn((key: string, value: string) => {
			store.set(key, value);
		});
		const getItem = jest.fn(() => null);
		const customStorage = { getItem, setItem } as unknown as Storage;
		Object.defineProperty(window, 'sessionStorage', {
			configurable: true,
			value: customStorage,
		});

		const cache = createPolicyCache({ storage: 'session' }, 'acme');
		cache.set('policy::void', true);
		expect(setItem).toHaveBeenCalledTimes(1);
		const persisted = JSON.parse(store.get(storageKey) ?? '{}');
		expect(persisted['policy::void'].value).toBe(true);

		const error = new Error('persist failed');
		setItem.mockImplementationOnce(() => {
			throw error;
		});
		const warn = jest
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);
		cache.set('policy::void', false);
		expect(warn).toHaveBeenCalledWith(
			'[kernel.policy.cache]',
			'Failed to persist policy cache.',
			error
		);
		expect(console as any).toHaveWarned();
	});

	it('handles session storage access failures gracefully', () => {
		const warn = jest
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);
		Object.defineProperty(window, 'sessionStorage', {
			configurable: true,
			get() {
				throw new Error('blocked');
			},
		});

		const cache = createPolicyCache({ storage: 'session' }, 'acme');
		expect(cache.keys()).toEqual([]);
		expect(warn).toHaveBeenCalledWith(
			'[kernel.policy.cache]',
			'sessionStorage is not available for policy cache.',
			expect.any(Error)
		);
		expect(console as any).toHaveWarned();
	});

	it('evicts expired entries based on ttl', () => {
		jest.useFakeTimers();
		jest.setSystemTime(0);
		const cache = createPolicyCache({}, 'acme');
		cache.set('policy::void', true, { ttlMs: 50 });
		expect(cache.get('policy::void')).toBe(true);
		jest.advanceTimersByTime(51);
		expect(cache.get('policy::void')).toBeUndefined();
		expect(cache.keys()).toEqual([]);
		jest.useRealTimers();
	});

	it('broadcasts local mutations and handles remote updates', () => {
		const cache = createPolicyCache({}, 'acme');
		const channel = MockBroadcastChannel.instances[0]!;
		const listener = jest.fn();
		const unsubscribe = cache.subscribe(listener);

		cache.set('policy::void', true);
		expect(channel.messages[0]).toMatchObject({
			type: 'set',
			namespace: 'acme',
			key: 'policy::void',
			value: true,
		});
		expect(cache.getSnapshot()).toBe(1);

		channel.onmessage?.({
			data: {
				type: 'set',
				namespace: 'acme',
				key: 'policy::user',
				value: false,
				expiresAt: Date.now() + 1000,
			},
		} as MessageEvent<BroadcastMessage>);
		expect(cache.get('policy::user')).toBe(false);
		expect(listener).toHaveBeenCalled();

		channel.onmessage?.({
			data: {
				type: 'invalidate',
				namespace: 'acme',
				policyKey: 'policy',
			},
		} as MessageEvent<BroadcastMessage>);
		expect(cache.keys()).toEqual([]);

		cache.set('policy::void', true);
		channel.onmessage?.({
			data: { type: 'clear', namespace: 'acme' },
		} as MessageEvent<BroadcastMessage>);
		expect(cache.keys()).toEqual([]);

		channel.onmessage?.({
			data: {
				type: 'invalidate',
				namespace: 'other',
				policyKey: 'policy',
			},
		} as MessageEvent<BroadcastMessage>);
		expect(cache.keys()).toEqual([]);

		unsubscribe();
	});

	it('supports remote writes without re-broadcasting', () => {
		const cache = createPolicyCache({}, 'acme');
		const channel = MockBroadcastChannel.instances[0]!;
		cache.set('policy::void', true, {
			source: 'remote',
			expiresAt: Date.now() + 10,
		});
		expect(channel.messages).toHaveLength(0);
	});

	it('invalidates namespaces and specific policies', () => {
		const cache = createPolicyCache({}, 'acme');
		const channel = MockBroadcastChannel.instances[0]!;
		cache.set('foo::void', true);
		cache.set('bar::void', true);
		cache.invalidate('foo');
		expect(cache.keys()).toEqual(['bar::void']);
		expect(channel.messages).toContainEqual({
			type: 'invalidate',
			namespace: 'acme',
			policyKey: 'foo',
		});

		cache.invalidate();
		expect(cache.keys()).toEqual([]);
		expect(channel.messages).toContainEqual({
			type: 'clear',
			namespace: 'acme',
		});
		const previous = channel.messages.length;
		cache.invalidate('missing');
		expect(channel.messages).toHaveLength(previous);
	});

	it('skips broadcast channel creation when disabled and logs failures', () => {
		Object.defineProperty(window, 'BroadcastChannel', {
			configurable: true,
			value: undefined,
		});
		const cacheWithoutChannel = createPolicyCache(
			{ crossTab: false },
			'acme'
		);
		cacheWithoutChannel.set('policy::void', true);

		Object.defineProperty(window, 'BroadcastChannel', {
			configurable: true,
			value: jest.fn(() => {
				throw new Error('channel fail');
			}),
		});
		const warn = jest
			.spyOn(console, 'warn')
			.mockImplementation(() => undefined);
		const cache = createPolicyCache({}, 'acme');
		expect(warn).toHaveBeenCalledWith(
			'[kernel.policy.cache]',
			'Failed to create BroadcastChannel for policy cache.',
			expect.any(Error)
		);
		expect(console as any).toHaveWarned();
		cache.set('policy::void', true);
	});

	it('clears cache without listeners and respects remote expiry overrides', () => {
		const cache = createPolicyCache({}, 'acme');
		const channel = MockBroadcastChannel.instances[0]!;
		expect(cache.get('missing')).toBeUndefined();
		cache.set('policy::void', true, {
			expiresAt: Date.now() + 500,
			source: 'remote',
		});
		cache.clear();
		expect(channel.messages).toContainEqual({
			type: 'clear',
			namespace: 'acme',
		});
	});

	it('ignores persisted structures that are not plain objects', () => {
		window.sessionStorage.setItem(storageKey, '"text"');
		const cache = createPolicyCache({ storage: 'session' }, 'acme');
		expect(cache.keys()).toEqual([]);
	});
});
