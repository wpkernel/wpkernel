import { LoggerlessTransport } from '@loglayer/transport';
import type {
	LogLayerTransport,
	LogLayerTransportParams,
} from '@loglayer/transport';
import type { LogLevelType } from '@loglayer/shared';
import type {
	ReporterChannel,
	ReporterLevel,
	ReporterLogMetadata,
} from './types';
import { WPK_NAMESPACE } from '../namespace/constants';

function isReporterLevel(level: LogLevelType): level is ReporterLevel {
	return (
		level === 'debug' ||
		level === 'info' ||
		level === 'warn' ||
		level === 'error'
	);
}

function resolveNamespace(
	context: Record<string, unknown> | undefined
): string {
	const candidate = context?.namespace;
	return typeof candidate === 'string' && candidate.length > 0
		? candidate
		: WPK_NAMESPACE;
}

function parseMetadata(
	params: LogLayerTransportParams
): ReporterLogMetadata | null {
	if (!isReporterLevel(params.logLevel)) {
		return null;
	}

	const namespace = resolveNamespace(
		(params.context as Record<string, unknown> | undefined) ?? undefined
	);
	const [message] = params.messages as [string?, ...unknown[]];
	if (typeof message !== 'string') {
		return null;
	}

	const metadata = params.metadata as { context?: unknown } | undefined;

	return {
		namespace,
		level: params.logLevel,
		message,
		context: metadata?.context,
		timestamp: Date.now(),
	};
}

function getConsoleMethod(level: ReporterLevel) {
	switch (level) {
		case 'error':
			return console.error.bind(console);
		case 'warn':
			return console.warn.bind(console);
		case 'debug':
			return console.debug.bind(console);
		case 'info':
		default:
			return console.info.bind(console);
	}
}

type WordPressHooks = {
	doAction: (eventName: string, payload: unknown) => void;
};

function getHooks(): WordPressHooks | null {
	if (typeof window === 'undefined') {
		return null;
	}

	const wp = (window as Window & { wp?: { hooks?: WordPressHooks } }).wp;
	if (!wp?.hooks || typeof wp.hooks.doAction !== 'function') {
		return null;
	}

	return wp.hooks;
}

class ConsoleTransport extends LoggerlessTransport {
	private readonly enabledByEnvironment: boolean;

	public constructor(level: LogLevelType) {
		const environmentEnabled = resolveEnvironmentEnabled();
		super({
			id: 'console',
			level,
			enabled: environmentEnabled,
		});

		this.enabledByEnvironment = environmentEnabled;
	}

	public override shipToLogger(params: LogLayerTransportParams): unknown[] {
		if (!this.enabledByEnvironment) {
			return [];
		}

		const entry = parseMetadata(params);
		if (!entry) {
			return [];
		}

		const emit = getConsoleMethod(entry.level);
		const args: unknown[] = [`[${entry.namespace}]`, entry.message];
		if (typeof entry.context !== 'undefined') {
			args.push(entry.context);
		}

		emit(...args);
		return args;
	}
}

class HooksTransport extends LoggerlessTransport {
	public constructor(level: LogLevelType) {
		super({ id: 'hooks', level, enabled: true });
	}

	public override shipToLogger(params: LogLayerTransportParams): unknown[] {
		const entry = parseMetadata(params);
		if (!entry) {
			return [];
		}

		const hooks = getHooks();
		if (!hooks?.doAction) {
			return [];
		}

		const payload = {
			message: entry.message,
			context: entry.context,
			timestamp: entry.timestamp,
		};
		hooks.doAction(`${entry.namespace}.reporter.${entry.level}`, payload);
		return [payload];
	}
}

function resolveEnvironmentEnabled(): boolean {
	if (typeof process === 'undefined' || !process.env) {
		return true;
	}

	const env = process.env.NODE_ENV;
	if (!env) {
		return true;
	}

	return env !== 'production';
}

export function createTransports(
	channel: ReporterChannel,
	level: LogLevelType
): LogLayerTransport | LogLayerTransport[] {
	switch (channel) {
		case 'console':
			return new ConsoleTransport(level);
		case 'hooks':
			return new HooksTransport(level);
		case 'all':
			return [new ConsoleTransport(level), new HooksTransport(level)];
		case 'bridge':
			throw new Error('Bridge transport is planned for a future sprint');
		default:
			return new ConsoleTransport(level);
	}
}
