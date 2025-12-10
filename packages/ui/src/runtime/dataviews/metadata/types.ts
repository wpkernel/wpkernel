import type { ResourceDataViewConfig } from '../../../dataviews/types';

export const DATA_VIEWS_METADATA_INVALID =
	'DATA_VIEWS_METADATA_INVALID' as const;

export type MetadataPath = ReadonlyArray<string | number>;

export interface DataViewMetadataIssue {
	readonly code: typeof DATA_VIEWS_METADATA_INVALID;
	readonly path: MetadataPath;
	readonly message: string;
	readonly received?: unknown;
}

export interface ResourceDataViewMetadata<TItem, TQuery> {
	readonly config: ResourceDataViewConfig<TItem, TQuery>;
}

export interface MetadataNormalizationResult<TItem, TQuery> {
	readonly metadata?: ResourceDataViewMetadata<TItem, TQuery>;
	readonly issues: DataViewMetadataIssue[];
}
