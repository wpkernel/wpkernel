import { useMemo } from 'react';
import type { View } from '@wordpress/dataviews';

type Props = {
	view: View;
	paginationInfo?: { totalItems?: number; totalPages?: number };
	selection?: Array<string | number>;
	defaultLayouts?: Record<string, unknown>;
	permission?: { status: string; capability?: string; reason?: string };
	className?: string;
};

export function DataViewsDebugPanel({
	view,
	paginationInfo,
	selection,
	defaultLayouts,
	permission,
	className,
}: Props): JSX.Element | null {
	const payload = useMemo(
		() => ({
			view,
			paginationInfo,
			selection,
			defaultLayouts,
			permission,
		}),
		[defaultLayouts, paginationInfo, permission, selection, view]
	);

	if (process.env.WPK_DATAVIEWS_DEBUG !== '1') {
		return null;
	}

	return (
		<div
			className={className}
			style={{
				marginTop: '8px',
				padding: '8px',
				border: '1px dashed #ccc',
				fontSize: '12px',
				background: '#f9f9f9',
				overflow: 'auto',
			}}
		>
			<strong>DataViews debug</strong>
			<pre style={{ whiteSpace: 'pre-wrap' }}>
				{JSON.stringify(payload, null, 2)}
			</pre>
		</div>
	);
}
