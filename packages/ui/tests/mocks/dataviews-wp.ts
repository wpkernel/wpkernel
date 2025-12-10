import React from 'react';

type DataFormProps = {
	data: unknown;
	fields: unknown[];
	form: unknown;
	onChange?: (patch: Record<string, unknown>) => void;
	validity?: unknown;
	children?: React.ReactNode;
};

export function DataForm(props: DataFormProps): JSX.Element {
	// Minimal mock: render a marker so tests can assert presence without pulling real ESM.
	return React.createElement(
		'div',
		{ 'data-mock': 'DataForm' },
		props.children ?? null
	);
}

export function useFormValidity(): {
	isValid: boolean;
	validity: Record<string, unknown>;
} {
	return { isValid: true, validity: {} };
}
