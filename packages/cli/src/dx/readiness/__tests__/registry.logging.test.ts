import { WPKernelError } from '@wpkernel/core/error';
import type { Reporter } from '@wpkernel/core/reporter';
import { logPhaseFailure } from '../registry.logging';

type LoggedEntry = {
	readonly level: 'info' | 'warn' | 'error' | 'debug';
	readonly message: string;
	readonly context?: unknown;
};

function createStubReporter(): { reporter: Reporter; entries: LoggedEntry[] } {
	const entries: LoggedEntry[] = [];

	const makeLogger =
		(level: LoggedEntry['level']) =>
		(message: string, context?: unknown) => {
			entries.push({ level, message, context });
		};

	const reporter: Reporter = {
		info: makeLogger('info'),
		warn: makeLogger('warn'),
		error: makeLogger('error'),
		debug: makeLogger('debug'),
		child() {
			return reporter;
		},
	};

	return { reporter, entries };
}

describe('logPhaseFailure', () => {
	it('renders readable error summaries and detail bullets', () => {
		const { reporter, entries } = createStubReporter();
		const error = new WPKernelError('DeveloperError', {
			message: 'Bundled PHP printer path could not be canonicalised.',
			data: {
				filePath: '/tmp/plugin.php',
				exitCode: 1,
				stderrSummary: ['Could not open input file: pretty-print.php'],
			},
		});

		logPhaseFailure(reporter, 'execute', error);

		const errorMessages = entries
			.filter((entry) => entry.level === 'error')
			.map((entry) => entry.message);

		expect(errorMessages[0]).toBe(
			'Execute phase failed: DeveloperError: Bundled PHP printer path could not be canonicalised.'
		);
		expect(errorMessages).toContain(
			'  • Could not open input file: pretty-print.php'
		);
		expect(errorMessages).toContain('  • file: /tmp/plugin.php');
		expect(errorMessages).toContain('  • exit code: 1');

		const debugEntry = entries.find((entry) => entry.level === 'debug');
		expect(debugEntry?.context).toMatchObject({
			error: expect.objectContaining({
				code: 'DeveloperError',
				message: 'Bundled PHP printer path could not be canonicalised.',
			}),
		});
	});
});
