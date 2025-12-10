import { useMemo } from 'react';

type Props = {
	data: unknown;
	validity?: unknown;
	isValid?: boolean;
	className?: string;
};

export function DataFormDebugPanel({
	data,
	validity,
	isValid,
	className,
}: Props): JSX.Element | null {
	const payload = useMemo(
		() => ({
			data,
			validity,
			isValid,
		}),
		[data, isValid, validity]
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
			<strong>DataForm debug</strong>
			<pre style={{ whiteSpace: 'pre-wrap' }}>
				{JSON.stringify(payload, null, 2)}
			</pre>
		</div>
	);
}
