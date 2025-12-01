import path from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import {
	createReleasePackReadinessHelper,
	type ReleasePackState,
} from '../src/dx/readiness/helpers/releasePack';
import type { DxContext } from '../src/dx/context';
import type {
	ReadinessConfirmation,
	ReadinessDetection,
	ReadinessHelper,
	ReadinessStepResult,
} from '../src/dx/readiness/types';

interface HelperRunResult {
	readonly detection: ReadinessDetection<ReleasePackState>;
	readonly confirmation: ReadinessConfirmation<ReleasePackState>;
	readonly state: ReleasePackState;
	readonly performedWork: boolean;
	readonly durationMs: number;
}

interface Reporter {
	info: (message: string, context?: unknown) => void;
	warn: (message: string, context?: unknown) => void;
	error: (message: string, context?: unknown) => void;
	debug: (message: string, context?: unknown) => void;
	child: (namespace: string) => Reporter;
}

function createSilentReporter(): Reporter {
	return {
		info: () => undefined,
		warn: () => undefined,
		error: () => undefined,
		debug: () => undefined,
		child: () => createSilentReporter(),
	} satisfies Reporter;
}

function buildContext(): DxContext {
	const reporter = createSilentReporter();

	return {
		reporter,
		workspace: null,
		environment: {
			allowDirty: false,
			cwd: process.cwd(),
			projectRoot: path.resolve('packages/cli'),
			workspaceRoot: null,
		},
	} satisfies DxContext;
}

async function applyStep(
	helper: ReadinessHelper<ReleasePackState>,
	step: keyof Pick<ReadinessHelper<ReleasePackState>, 'prepare' | 'execute'>,
	context: DxContext,
	state: ReleasePackState
): Promise<ReadinessStepResult<ReleasePackState> | null> {
	const fn = helper[step];
	if (!fn) {
		return null;
	}

	return fn.call(helper, context, state);
}

async function runHelper(
	helper: ReadinessHelper<ReleasePackState>,
	context: DxContext
): Promise<HelperRunResult> {
	const start = performance.now();
	const detection = await helper.detect(context);
	if (detection.status === 'blocked') {
		throw new Error(
			'release-pack helper reported blocked status during detection.'
		);
	}

	let currentState = detection.state;
	let performed = false;

	if (detection.status === 'pending') {
		const prepareResult = await applyStep(
			helper,
			'prepare',
			context,
			currentState
		);
		if (prepareResult) {
			currentState = prepareResult.state;
			performed = true;
		}

		const executeResult = await applyStep(
			helper,
			'execute',
			context,
			currentState
		);
		if (executeResult) {
			currentState = executeResult.state;
			performed = true;
		}
	}

	const confirmation = await helper.confirm(context, currentState);
	if (confirmation.status !== 'ready') {
		throw new Error(
			`release-pack helper confirmation status ${confirmation.status} is not ready.`
		);
	}

	const durationMs = performance.now() - start;

	return {
		detection,
		confirmation,
		state: confirmation.state,
		performedWork: performed,
		durationMs,
	} satisfies HelperRunResult;
}

function assertTimingWithinTolerance(
	baselineMs: number,
	repeatMs: number,
	toleranceRatio: number,
	minimumToleranceMs: number
): void {
	const delta = Math.abs(repeatMs - baselineMs);
	const tolerance = Math.max(baselineMs * toleranceRatio, minimumToleranceMs);

	if (baselineMs === 0 && repeatMs === 0) {
		return;
	}

	if (delta > tolerance) {
		throw new Error(
			`release-pack timings drifted by ${delta.toFixed(2)}ms (baseline ${baselineMs.toFixed(
				2
			)}ms, repeat ${repeatMs.toFixed(2)}ms, tolerance ${(
				toleranceRatio * 100
			).toFixed(2)}%)`
		);
	}
}

async function main(): Promise<void> {
	const helper = createReleasePackReadinessHelper();
	const context = buildContext();

	const first = await runHelper(helper, context);
	const second = await runHelper(helper, context);

	assertTimingWithinTolerance(first.durationMs, second.durationMs, 0.5, 5);
	if (second.performedWork) {
		throw new Error(
			'release-pack helper rebuilt packages on the second run.'
		);
	}
}

main().catch((error) => {
	console.error('[release-pack-ci] release-pack readiness check failed.');
	console.error(
		error instanceof Error ? (error.stack ?? error.message) : error
	);
	process.exitCode = 1;
});
