import { WPKernelError } from '@wpkernel/core/error';
import type { ResourceStorageConfig } from '@wpkernel/core/resource';

/**
 * Identity descriptor for wp-post mutation helpers.
 * @category WordPress AST
 */
export interface MutationIdentity {
	readonly type: 'number' | 'string';
	readonly param: string;
}

/**
 * Minimal resource shape expected by wp-post mutation helpers.
 * @category WordPress AST
 */
export interface MutationHelperResource {
	readonly name: string;
	readonly storage?: ResourceStorageConfig | null;
}

/**
 * Shared options for mutation helpers.
 * @category WordPress AST
 */
export interface MutationHelperOptions {
	readonly resource: MutationHelperResource;
	readonly pascalName: string;
	readonly identity: MutationIdentity;
}

export type WpPostStorage = Extract<ResourceStorageConfig, { mode: 'wp-post' }>;
export type WpPostMetaDescriptor = NonNullable<WpPostStorage['meta']>[string];
export type WpPostTaxonomyDescriptor = NonNullable<
	WpPostStorage['taxonomies']
>[string];

/**
 * Ensures the resource is configured with `wp-post` storage.
 * @param    resource
 * @throws WPKernelError when storage is missing or not wp-post.
 * @category WordPress AST
 */
export function ensureStorage(resource: MutationHelperResource): WpPostStorage {
	const storage = resource.storage;
	if (!storage || storage.mode !== 'wp-post') {
		throw new WPKernelError('DeveloperError', {
			message: 'Resource must use wp-post storage.',
			context: { name: resource.name },
		});
	}

	return storage;
}
