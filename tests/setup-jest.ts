/**
 * Jest Test Setup (TypeScript)
 *
 * Clean, type-safe Jest setup that provides minimal WordPress stubs
 * and avoids object replacement patterns. Uses property-level mocking
 * with proper TypeScript integration.
 */

// Optional: Add custom matchers
// import matchers from 'jest-extended';
// expect.extend(matchers);

/**
 * Complete WPData stub that satisfies the global type requirements
 * Provides all @wordpress/data exports as mocks to match the type interface
 */
const wpDataStub = {
	// Core store methods
	createReduxStore: jest.fn(),
	register: jest.fn(),
	select: jest.fn(),
	dispatch: jest.fn(),
	subscribe: jest.fn(),

	// Higher-order components
	withSelect: jest.fn(),
	withDispatch: jest.fn(),
	withRegistry: jest.fn(),

	// Hooks
	useSelect: jest.fn(),
	useDispatch: jest.fn(),
	useRegistry: jest.fn(),

	// Registry methods
	combineReducers: jest.fn(),
	controls: {},
	createRegistry: jest.fn(),
	createRegistryControl: jest.fn(),
	createRegistrySelector: jest.fn(),

	// Additional exports from @wordpress/data
	RegistryProvider: jest.fn(),
	AsyncModeProvider: jest.fn(),
	RegistryConsumer: jest.fn(),

	// Selectors and controls
	resolveSelect: jest.fn(),
	suspendSelect: jest.fn(),
} as any; // Stub - 'as any' acceptable for test fixtures

/**
 * Complete WPHooks stub that satisfies the global type requirements
 * Provides core @wordpress/hooks exports as mocks
 */
const wpHooksStub = {
	doAction: jest.fn(),
	addAction: jest.fn(),
	removeAction: jest.fn(),
	hasAction: jest.fn(),
	doingAction: jest.fn(),
	didAction: jest.fn(),
	currentAction: jest.fn(),
	applyFilters: jest.fn(),
	addFilter: jest.fn(),
	removeFilter: jest.fn(),
	hasFilter: jest.fn(),
	doingFilter: jest.fn(),
	didFilter: jest.fn(),
	currentFilter: jest.fn(),
	removeAllActions: jest.fn(),
	removeAllFilters: jest.fn(),
	defaultHooks: {} as any,
	createHooks: jest.fn(),
} as any; // Stub - 'as any' acceptable for test fixtures

/**
 * Global test environment setup
 * Runs before each test to ensure clean, predictable state
 */
beforeEach(() => {
	// Ensure process.env is available for Node.js compatibility
	if (!global.process) {
		(global as { process?: Partial<NodeJS.Process> }).process = {
			env: { NODE_ENV: 'test' },
		};
	} else if (!global.process.env) {
		global.process.env = { NODE_ENV: 'test' };
	}

	// Set up WordPress globals with proper typing
	// Thanks to ambient declarations in test-globals.d.ts, window.wp is properly typed
	window.wp = {
		data: wpDataStub,
		hooks: wpHooksStub,
	};

	// Mock BroadcastChannel since jsdom doesn't provide it
	// This is a minimal spy-able implementation for testing cross-tab events
	if (
		typeof (global as { BroadcastChannel?: unknown }).BroadcastChannel ===
		'undefined'
	) {
		(
			global as { BroadcastChannel?: typeof BroadcastChannel }
		).BroadcastChannel = class MockBroadcastChannel {
			// --- Static registry so instances with the same name can talk to each other
			private static registry: Map<string, Set<MockBroadcastChannel>> =
				new Map();

			public messages: unknown[] = [];
			public name: string;
			public onmessage: ((event: MessageEvent) => void) | null = null;
			public onmessageerror: ((event: unknown) => void) | null = null;

			private listeners = new Set<(ev: MessageEvent) => void>();
			private closed = false;

			public constructor(name: string) {
				this.name = name;
				const set =
					MockBroadcastChannel.registry.get(name) ??
					new Set<MockBroadcastChannel>();
				set.add(this);
				MockBroadcastChannel.registry.set(name, set);
			}

			public postMessage(message: unknown) {
				if (this.closed) {
					return;
				}

				this.messages.push(message);

				// Fan-out to all channels with the same name
				const peers = MockBroadcastChannel.registry.get(this.name);
				if (!peers) {
					return;
				}

				// Use a minimal event object compatible with typical listeners
				const ev = { data: message } as MessageEvent;

				for (const ch of peers) {
					try {
						// onmessage handler
						if (typeof ch.onmessage === 'function') {
							ch.onmessage(ev);
						}
						// addEventListener('message', fn)
						ch.listeners.forEach((fn) => fn(ev));
					} catch (err) {
						// onmessageerror handler
						if (typeof ch.onmessageerror === 'function') {
							ch.onmessageerror(err);
						}
					}
				}
			}

			public addEventListener(
				type: string,
				fn: (ev: MessageEvent) => void
			) {
				if (type === 'message') {
					this.listeners.add(fn);
				}
			}

			public removeEventListener(
				type: string,
				fn: (ev: MessageEvent) => void
			) {
				if (type === 'message') {
					this.listeners.delete(fn);
				}
			}

			public close() {
				if (this.closed) {
					return;
				}
				this.closed = true;
				this.listeners.clear();
				this.messages = [];

				const set = MockBroadcastChannel.registry.get(this.name);
				if (set) {
					set.delete(this);
					if (set.size === 0) {
						MockBroadcastChannel.registry.delete(this.name);
					}
				}
			}
		} as unknown as typeof BroadcastChannel;
	}

	// Implement getWPData globally for tests
	// This provides the same implementation as packages/kernel/src/index.ts
	(globalThis as { getWPData?: () => unknown }).getWPData = () => {
		if (typeof window === 'undefined') {
			return undefined;
		}
		return (window as { wp?: { data?: unknown } }).wp?.data;
	};

	// Ensure clean timer state
	jest.clearAllTimers();
});

/**
 * Global test cleanup
 * Runs after each test to clean up any remaining state
 */
afterEach(() => {
	// Reset window.wp to initial state
	window.wp = {
		data: wpDataStub,
		hooks: wpHooksStub,
	};

	// Reset to real timers if any tests used fake timers
	jest.useRealTimers();

	// Clear all mocks to avoid test interference
	jest.clearAllMocks();
});
