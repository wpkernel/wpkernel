/**
 * CLI-specific reporter with Vite-like output.
 *
 * - Colorful, timestamp-free logs in TTYs (picocolors)
 * - Plain text when piped/CI/non-TTY
 * - Optional hooks emission for WP environments (via WPKernelHooksTransport)
 * - Same Reporter surface used across the CLI
 */
import pc from 'picocolors';
import { WPK_NAMESPACE } from '@wpkernel/core/contracts';
import { WPKernelHooksTransport } from '@wpkernel/core/reporter';
import type {
	ReporterChannel,
	ReporterLevel,
	Reporter,
	ReporterOptions,
} from '@wpkernel/core/reporter';

type LogLevelType = ReporterLevel;
type LogLayerTransportParams = {
	logLevel: LogLevelType;
	messages: unknown[];
	data?: unknown;
	hasData?: boolean;
	context?: Record<string, unknown>;
	metadata?: Record<string, unknown>;
};

const DEFAULT_NAMESPACE = WPK_NAMESPACE;
const DEFAULT_CHANNEL: ReporterChannel = 'console';
const DEFAULT_LEVEL: ReporterLevel = 'info';

const LEVEL_ORDER: Record<ReporterLevel, number> = {
	error: 0,
	warn: 1,
	info: 2,
	debug: 3,
};

const SYMBOLS: Record<ReporterLevel, string> = {
	info: pc.cyan('●'),
	warn: pc.yellow('▲'),
	error: pc.red('■'),
	debug: pc.magenta('◆'),
};

function colorSupported(): boolean {
	if (process.env.NO_COLOR) {
		return false;
	}
	if (process.env.FORCE_COLOR === '0') {
		return false;
	}
	if (process.env.FORCE_COLOR === '1') {
		return true;
	}
	return Boolean(process.stdout?.isTTY);
}

function formatLevel(level: ReporterLevel, color: boolean): string {
	if (!color) {
		return `[${level.toUpperCase()}]`;
	}
	const symbol = SYMBOLS[level] ?? SYMBOLS.info;
	const label = level.toUpperCase();
	switch (level) {
		case 'warn':
			return `${symbol} ${pc.yellow(label)}`;
		case 'error':
			return `${symbol} ${pc.red(label)}`;
		case 'debug':
			return `${symbol} ${pc.magenta(label)}`;
		case 'info':
		default:
			return `${symbol} ${pc.cyan(label)}`;
	}
}

function formatMessage(
	level: ReporterLevel,
	message: string,
	color: boolean
): string {
	if (!color) {
		return message;
	}
	switch (level) {
		case 'warn':
			return pc.yellow(message);
		case 'error':
			return pc.red(message);
		case 'debug':
			return pc.magenta(message);
		case 'info':
		default:
			return pc.cyan(message);
	}
}

function formatContext(context: unknown, color: boolean): string | null {
	if (context === null || typeof context === 'undefined') {
		return null;
	}
	const payload =
		typeof context === 'string'
			? context
			: (() => {
					try {
						return JSON.stringify(context, null, 2);
					} catch (error) {
						return `<unserializable context: ${(error as Error)?.message ?? 'unknown'}>`;
					}
				})();
	return color ? pc.dim(payload) : payload;
}

function shouldEmit(level: ReporterLevel, minLevel: ReporterLevel): boolean {
	return (
		(LEVEL_ORDER[level] ?? LEVEL_ORDER.info) <=
		(LEVEL_ORDER[minLevel] ?? LEVEL_ORDER.info)
	);
}

function toLogLayerParams(
	level: ReporterLevel,
	message: string,
	namespace: string,
	context?: unknown
): LogLayerTransportParams {
	return {
		logLevel: level as LogLevelType,
		messages: [message],
		data: context,
		hasData: typeof context !== 'undefined',
		context: { namespace },
		metadata: { context },
	};
}

export function createReporterCLI(options: ReporterOptions = {}): Reporter {
	const namespace = options.namespace ?? DEFAULT_NAMESPACE;
	const level = options.level ?? DEFAULT_LEVEL;
	const channel = options.channel ?? DEFAULT_CHANNEL;
	const enabled = options.enabled ?? true;
	const color = colorSupported();
	const hookTransport =
		channel === 'hooks' || channel === 'all'
			? new WPKernelHooksTransport(level as LogLevelType)
			: null;

	// Encourage colors in TTY like Vite
	if (color && !process.env.FORCE_COLOR) {
		process.env.FORCE_COLOR = '1';
	}

	const emit = (
		entryLevel: ReporterLevel,
		message: string,
		context?: unknown
	) => {
		if (!enabled || !shouldEmit(entryLevel, level)) {
			return;
		}
		const lvl = formatLevel(entryLevel, color);
		const body = formatMessage(entryLevel, message, color);
		const shouldPrintContext =
			process.env.WPK_CONTEXT === '1' || entryLevel === 'debug';
		const formattedContext =
			shouldPrintContext && formatContext(context, color);
		const lines = [`${lvl} ${body}`];
		if (formattedContext) {
			lines.push(formattedContext);
		}
		process.stdout.write(`${lines.join('\n')}\n`);

		if (hookTransport) {
			try {
				hookTransport.shipToLogger(
					toLogLayerParams(
						entryLevel,
						message,
						namespace,
						context
					) as unknown as Parameters<
						typeof hookTransport.shipToLogger
					>[0]
				);
			} catch {
				// Hooks are best-effort; ignore failures
			}
		}
	};

	const reporter: Reporter = {
		info(message: string, context?: unknown) {
			emit('info', message, context);
		},
		warn(message: string, context?: unknown) {
			emit('warn', message, context);
		},
		error(message: string, context?: unknown) {
			emit('error', message, context);
		},
		debug(message: string, context?: unknown) {
			emit('debug', message, context);
		},
		child(childNamespace: string) {
			return createReporterCLI({
				...options,
				namespace: `${namespace}.${childNamespace}`,
			});
		},
	};

	return reporter;
}
