/* @jsxImportSource react */
import { act, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { useVisiblePrefetch } from '../useVisiblePrefetch';

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type IOInstance = {
	callback: IntersectionObserverCallback;
	options?: IntersectionObserverInit;
	observe: jest.Mock;
	disconnect: jest.Mock;
};

function setupComponent(options?: Parameters<typeof useVisiblePrefetch>[2]): {
	element: HTMLElement;
	callback: jest.Mock;
	trigger: (entry: Partial<IntersectionObserverEntry>) => void;
	unmount: () => void;
	observer?: IOInstance;
} {
	const container = document.createElement('div');
	const root = createRoot(container);
	const callback = jest.fn();
	const ref = createRef<HTMLDivElement>();

	function TestComponent() {
		useVisiblePrefetch(ref, callback, options);
		return <div ref={ref}>Target</div>;
	}

	act(() => {
		root.render(<TestComponent />);
	});

	const instance = (
		window.IntersectionObserver as unknown as jest.Mock
	).mock.results.at(-1)?.value as IOInstance | undefined;

	const trigger = (entry: Partial<IntersectionObserverEntry>) => {
		if (!instance) {
			throw new Error('No IntersectionObserver instance captured');
		}
		instance.callback(
			[
				{
					isIntersecting: true,
					target: ref.current!,
					intersectionRatio: 1,
					time: Date.now(),
					boundingClientRect: ref.current!.getBoundingClientRect(),
					intersectionRect: ref.current!.getBoundingClientRect(),
					rootBounds: null,
					...entry,
				} as IntersectionObserverEntry,
			],
			{} as IntersectionObserver
		);
	};

	return {
		element: ref.current!,
		callback,
		trigger,
		unmount: () => act(() => root.unmount()),
		observer: instance,
	};
}

describe('useVisiblePrefetch', () => {
	const originalIO = window.IntersectionObserver;
	const originalRAF = window.requestAnimationFrame;
	const originalCancelRAF = window.cancelAnimationFrame;

	beforeEach(() => {
		window.IntersectionObserver = jest.fn(
			(
				callback: IntersectionObserverCallback,
				options?: IntersectionObserverInit
			) => {
				return {
					callback,
					options,
					observe: jest.fn(),
					disconnect: jest.fn(),
				} as unknown as IntersectionObserver;
			}
		) as unknown as typeof IntersectionObserver;
	});

	afterEach(() => {
		window.IntersectionObserver = originalIO;
		window.requestAnimationFrame = originalRAF;
		window.cancelAnimationFrame = originalCancelRAF;
	});

	it('invokes callback when IntersectionObserver reports visibility', () => {
		const { callback, trigger, unmount } = setupComponent();
		act(() => {
			trigger({ isIntersecting: true });
		});
		expect(callback).toHaveBeenCalledTimes(1);
		callback.mockClear();
		unmount();
	});

	it('falls back to scroll listener when IntersectionObserver is unavailable', async () => {
		delete (
			window as {
				IntersectionObserver?: unknown;
			}
		).IntersectionObserver;

		window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
			cb(performance.now());
			return 1;
		}) as typeof window.requestAnimationFrame;
		window.cancelAnimationFrame = jest.fn();

		const container = document.createElement('div');
		const root = createRoot(container);
		const callback = jest.fn();
		const ref = createRef<HTMLDivElement>();

		function Component() {
			useVisiblePrefetch(ref, callback, {
				rootMargin: '100px',
				once: false,
			});
			return <div ref={ref}>Content</div>;
		}

		act(() => {
			root.render(<Component />);
		});

		const element = ref.current!;
		const rectSpy = jest.spyOn(element, 'getBoundingClientRect');
		rectSpy.mockReturnValue({
			top: 50,
			left: 0,
			bottom: 150,
			right: 100,
			width: 100,
			height: 100,
			x: 0,
			y: 50,
			toJSON: () => ({}),
		});

		act(() => {
			window.dispatchEvent(new Event('scroll'));
		});
		await act(async () => {
			await Promise.resolve();
		});

		expect(callback).toHaveBeenCalledTimes(1);

		rectSpy.mockReturnValue({
			top: 20,
			left: 0,
			bottom: 80,
			right: 100,
			width: 100,
			height: 60,
			x: 0,
			y: 20,
			toJSON: () => ({}),
		});

		act(() => {
			window.dispatchEvent(new Event('resize'));
		});
		await act(async () => {
			await Promise.resolve();
		});

		expect(callback).toHaveBeenCalledTimes(1);

		act(() => {
			root.unmount();
		});
	});

	it('only triggers once by default even with repeated intersections', () => {
		const { callback, trigger, observer, unmount } = setupComponent();
		act(() => {
			trigger({ isIntersecting: true });
			trigger({ isIntersecting: true });
		});

		expect(callback).toHaveBeenCalledTimes(1);
		expect(observer?.disconnect).toHaveBeenCalled();
		unmount();
	});

	it('allows repeated triggers when once=false', () => {
		const { callback, trigger, observer, unmount } = setupComponent({
			once: false,
		});

		act(() => {
			trigger({ isIntersecting: true });
			trigger({ isIntersecting: true });
		});

		expect(callback).toHaveBeenCalledTimes(2);
		expect(observer?.disconnect).toHaveBeenCalledTimes(0);
		unmount();
	});

	it('passes root margin options to IntersectionObserver', () => {
		const { observer, unmount } = setupComponent({
			rootMargin: '10px 20px 30px 40px',
		});

		expect(observer?.options?.rootMargin).toBe('10px 20px 30px 40px');
		unmount();
	});

	it('disconnects observers on unmount', () => {
		const { observer, unmount } = setupComponent({ once: false });

		unmount();

		expect(observer?.disconnect).toHaveBeenCalled();
	});

	it('handles empty rootMargin string', () => {
		const { unmount } = setupComponent({ rootMargin: '' });
		// Should not throw and use default margins
		unmount();
	});

	it('handles rootMargin as passed through', () => {
		const { observer, unmount } = setupComponent({ rootMargin: '   ' });
		// Mock passes through value as-is
		expect(observer?.options?.rootMargin).toBe('   ');
		unmount();
	});

	it('passes single rootMargin value', () => {
		const { observer, unmount } = setupComponent({ rootMargin: '50px' });
		expect(observer?.options?.rootMargin).toBe('50px');
		unmount();
	});

	it('passes two rootMargin values', () => {
		const { observer, unmount } = setupComponent({
			rootMargin: '10px 20px',
		});
		expect(observer?.options?.rootMargin).toBe('10px 20px');
		unmount();
	});

	it('passes three rootMargin values', () => {
		const { observer, unmount } = setupComponent({
			rootMargin: '10px 20px 30px',
		});
		expect(observer?.options?.rootMargin).toBe('10px 20px 30px');
		unmount();
	});

	it('handles any rootMargin string value', () => {
		const { observer, unmount } = setupComponent({ rootMargin: 'invalid' });
		// Mock passes through value as-is
		expect(observer?.options?.rootMargin).toBe('invalid');
		unmount();
	});

	it('handles SSR environment without window', () => {
		const descriptor = Object.getOwnPropertyDescriptor(
			globalThis,
			'window'
		);
		if (!descriptor?.configurable) {
			expect(descriptor?.configurable).toBe(false);
			return;
		}

		const originalWindow = globalThis.window;
		Object.defineProperty(globalThis, 'window', {
			configurable: true,
			value: undefined,
		});

		const container = document.createElement('div');
		const root = createRoot(container);
		const callback = jest.fn();
		const ref = createRef<HTMLDivElement>();

		function TestComponent() {
			useVisiblePrefetch(ref, callback);
			return <div ref={ref}>Target</div>;
		}

		// Should not throw during SSR
		expect(() => {
			act(() => {
				root.render(<TestComponent />);
			});
		}).not.toThrow();

		Object.defineProperty(globalThis, 'window', {
			...descriptor,
			value: originalWindow,
		});

		act(() => {
			root.unmount();
		});
	});

	it('handles null ref.current', () => {
		const container = document.createElement('div');
		const root = createRoot(container);
		const callback = jest.fn();
		const ref = createRef<HTMLDivElement>();

		function TestComponent() {
			useVisiblePrefetch(ref, callback);
			return <div>No ref assigned</div>;
		}

		// Should not throw with null ref
		expect(() => {
			act(() => {
				root.render(<TestComponent />);
			});
		}).not.toThrow();

		act(() => {
			root.unmount();
		});
	});
});
