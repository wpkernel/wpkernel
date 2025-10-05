declare module '@wordpress/element' {
	import * as React from 'react';

	export { createPortal } from 'react-dom';
	export const Children: typeof React.Children;
	export const Fragment: typeof React.Fragment;
	export function createElement(
		type: Parameters<typeof React.createElement>[0],
		props?: Parameters<typeof React.createElement>[1],
		...children: Parameters<typeof React.createElement>[2][]
	): ReturnType<typeof React.createElement>;
	export function cloneElement(
		element: Parameters<typeof React.cloneElement>[0],
		props?: Parameters<typeof React.cloneElement>[1],
		...children: Parameters<typeof React.cloneElement>[2][]
	): ReturnType<typeof React.cloneElement>;
	export function createRef<T>(): React.RefObject<T>;
	export function forwardRef<T, P = {}>(
		render: React.ForwardRefRenderFunction<T, P>
	): React.ForwardRefExoticComponent<
		React.PropsWithoutRef<P> & React.RefAttributes<T>
	>;
	export function memo<T extends React.ComponentType<any>>(
		Component: T,
		propsAreEqual?: (
			prevProps: React.ComponentProps<T>,
			nextProps: React.ComponentProps<T>
		) => boolean
	): T;
	export const startTransition: typeof React.startTransition;
	export const useCallback: typeof React.useCallback;
	export const useContext: typeof React.useContext;
	export const useEffect: typeof React.useEffect;
	export const useId: typeof React.useId;
	export const useMemo: typeof React.useMemo;
	export const useReducer: typeof React.useReducer;
	export const useRef: typeof React.useRef;
	export const useState: typeof React.useState;
	export const useSyncExternalStore: typeof React.useSyncExternalStore;
	export const useTransition: typeof React.useTransition;
	export const useLayoutEffect: typeof React.useLayoutEffect;
	export const useImperativeHandle: typeof React.useImperativeHandle;
	export const useDebugValue: typeof React.useDebugValue;
	export const useDeferredValue: typeof React.useDeferredValue;
	export const useInsertionEffect: typeof React.useInsertionEffect;

	const ReactDefault: typeof React;
	export default ReactDefault;
}
