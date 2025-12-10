import type { ResourceObject } from '@wpkernel/core/resource';

import type {
	DataViewMetadataIssue,
	MetadataNormalizationResult,
} from './types';
import { buildConfig } from './config';

export function normalizeResourceDataViewMetadata<TItem, TQuery>(
	resource: ResourceObject<TItem, TQuery>
): MetadataNormalizationResult<TItem, TQuery> {
	const issues: DataViewMetadataIssue[] = [];
	const metadataPath = ['ui', 'admin', 'view'] as const;

	const candidate = (
		resource as ResourceObject<TItem, TQuery> & {
			ui?: {
				admin?: {
					view?: string;
					dataviews?: Record<string, unknown>;
				};
			};
		}
	).ui?.admin;

	if (candidate?.view !== 'dataview' && candidate?.view !== 'dataviews') {
		return { issues };
	}

	const config = buildConfig<TItem, TQuery>(
		candidate.dataviews ?? {},
		issues,
		metadataPath
	);

	if (!config || issues.length > 0) {
		return { issues };
	}

	return {
		metadata: {
			config,
		},
		issues,
	};
}
