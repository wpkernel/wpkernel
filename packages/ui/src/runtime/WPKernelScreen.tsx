import { useMemo, type ReactNode } from 'react';
import { WPKernelError, WPK_NAMESPACE } from '@wpkernel/core/contracts';
import { WPKernelUIProvider } from './context';
import type { ResourceObject } from '@wpkernel/core/resource';
import type { WPKernelUIRuntime } from '@wpkernel/core/data';

interface WPKernelScreenProps {
	resource: ResourceObject<unknown, unknown>;
	feature?: string;
	runtime: WPKernelUIRuntime;
	children: ReactNode;
}

function normalizeInteractivitySegment(
	value: string,
	fallback: string
): string {
	const cleaned = value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');
	return cleaned.length > 0 ? cleaned : fallback;
}

function getInteractivityNamespace(
	resource: ResourceObject<unknown, unknown>,
	feature: string
): string {
	const storeKey =
		typeof resource.storeKey === 'string' ? resource.storeKey : '';
	const rawSegment = storeKey.split('/').pop();
	const resourceName =
		typeof resource.name === 'string' && resource.name.length > 0
			? resource.name
			: 'resource';
	const resourceSegment = normalizeInteractivitySegment(
		rawSegment && rawSegment.length > 0 ? rawSegment : resourceName,
		'resource'
	);
	const featureSegment = normalizeInteractivitySegment(feature, 'feature');
	return `${WPK_NAMESPACE}/${resourceSegment}/${featureSegment}`;
}

export function WPKernelScreen({
	resource,
	feature = 'admin-screen',
	runtime,
	children,
}: WPKernelScreenProps) {
	if (!runtime) {
		throw new WPKernelError('DeveloperError', {
			message: 'UI runtime not provided to WPKernelScreen.',
			context: {
				resourceName: resource.name,
			},
		});
	}

	const interactivityNamespace = useMemo(
		() => getInteractivityNamespace(resource, feature),
		[resource, feature]
	);

	const interactivityContext = useMemo(
		() =>
			JSON.stringify({
				feature,
				resource: resource.name,
			}),
		[resource, feature]
	);

	return (
		<div
			data-wp-interactive={interactivityNamespace}
			data-wp-context={interactivityContext}
		>
			<WPKernelUIProvider runtime={runtime}>
				{children}
			</WPKernelUIProvider>
		</div>
	);
}
