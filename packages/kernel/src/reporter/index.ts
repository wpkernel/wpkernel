import { LogLayer } from 'loglayer';
import type { LogLevelType } from '@loglayer/shared';
import { createTransports } from './transports';
import type { Reporter, ReporterLevel, ReporterOptions } from './types';
import { WPK_NAMESPACE } from '../namespace/constants';

const DEFAULT_NAMESPACE = WPK_NAMESPACE;
const DEFAULT_CHANNEL = 'console';
const DEFAULT_LEVEL: ReporterLevel = 'info';

function mapLevelToLogLevel(level: ReporterLevel): LogLevelType {
	switch (level) {
		case 'debug':
			return 'debug';
		case 'warn':
			return 'warn';
		case 'error':
			return 'error';
		case 'info':
		default:
			return 'info';
	}
}

function logWithLevel(
	logger: LogLayer,
	level: ReporterLevel,
	message: string,
	context?: unknown
): void {
	const target =
		typeof context === 'undefined'
			? logger
			: logger.withMetadata({ context });

	switch (level) {
		case 'debug':
			target.debug(message);
			break;
		case 'warn':
			target.warn(message);
			break;
		case 'error':
			target.error(message);
			break;
		case 'info':
		default:
			target.info(message);
			break;
	}
}

export function createReporter(options: ReporterOptions = {}): Reporter {
	const namespace = options.namespace ?? DEFAULT_NAMESPACE;
	const level = options.level ?? DEFAULT_LEVEL;
	const channel = options.channel ?? DEFAULT_CHANNEL;
	const enabled = options.enabled ?? true;

	const transports = createTransports(channel, mapLevelToLogLevel(level));
	const logger = new LogLayer({
		transport: transports,
	});

	logger.withContext({ namespace });

	if (!enabled) {
		logger.disableLogging();
	}

	const report = (
		entryLevel: ReporterLevel,
		message: string,
		context?: unknown
	) => {
		if (!enabled) {
			return;
		}

		logWithLevel(logger, entryLevel, message, context);
	};

	const reporter: Reporter = {
		info(message, context) {
			report('info', message, context);
		},
		warn(message, context) {
			report('warn', message, context);
		},
		error(message, context) {
			report('error', message, context);
		},
		debug(message, context) {
			report('debug', message, context);
		},
		child(childNamespace: string) {
			const nextNamespace = `${namespace}.${childNamespace}`;
			return createReporter({
				...options,
				namespace: nextNamespace,
			});
		},
	};

	return reporter;
}

export function createNoopReporter(): Reporter {
	return {
		info: () => undefined,
		warn: () => undefined,
		error: () => undefined,
		debug: () => undefined,
		child: () => createNoopReporter(),
	};
}

export type { Reporter, ReporterOptions, ReporterLevel } from './types';
