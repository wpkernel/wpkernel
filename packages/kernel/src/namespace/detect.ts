import { createReporter } from '../reporter';
import { WPK_NAMESPACE, WPK_SUBSYSTEM_NAMESPACES } from './constants';

/**
 * Namespace Detection Module
 *
 * Provides intelligent auto-detection of plugin/product namespaces
 * from WordPress plugin headers and package.json while maintaining
 * backward compatibility with explicit overrides.
 *
 * Detection Priority (cascade order):
 * 1. Explicit namespace parameter
 * 2. Build-time define (__WPK_NAMESPACE__)
 * 3. Module ID (if available)
 * 4. WordPress plugin header 'Text Domain'
 * 5. package.json 'name' field
 * 6. Fallback to WPK_NAMESPACE constant ('wpk')
 *
 * @package
 */

/**
 * WordPress global data interface
 */
type WordPressGlobal = {
	wp?: unknown;
	wpKernelData?: {
		textDomain?: string;
	};
};

/**
 * Package data interface for bundled environments
 */
type PackageData = {
	name?: string;
};

/**
 * Global this with package data and build-time defines
 */
type GlobalThisWithPackage = {
	__WP_KERNEL_PACKAGE__?: PackageData;
	__WPK_NAMESPACE__?: string;
};

/**
 * Reserved namespace words that cannot be used
 */
const RESERVED_NAMESPACES = [
	'wp',
	'wordpress',
	'admin',
	'core',
	'system',
	'api',
	'rest',
	'ajax',
	'js',
	'css',
	'html',
	'http',
	'https',
	'www',
] as const;

const namespaceReporter = createReporter({
	namespace: WPK_SUBSYSTEM_NAMESPACES.NAMESPACE,
	channel: 'all',
	level: 'warn',
});

/**
 * Check if we're in development mode
 *
 * @internal
 * @return True if in development environment
 */
function isDevelopment(): boolean {
	// Check various development indicators
	return (
		(typeof process !== 'undefined' &&
			process.env &&
			(process.env.NODE_ENV === 'development' ||
				process.env.NODE_ENV === 'dev' ||
				process.env.WP_DEBUG === 'true')) ||
		(typeof window !== 'undefined' &&
			(window as { wpKernelDev?: boolean }).wpKernelDev === true)
	);
}

/**
 * Emit development-only warning for non-deterministic fallbacks
 *
 * @internal
 * @param source    - The detection source that was used
 * @param namespace - The detected namespace
 */
function emitDevWarning(source: string, namespace: string): void {
	if (!isDevelopment()) {
		return;
	}

	if (source === 'fallback') {
		namespaceReporter.warn(
			`🔧 WP Kernel: Using fallback namespace "${namespace}". For deterministic behavior, set __WPK_NAMESPACE__ (build-time) or wpKernelData.textDomain (runtime). See: https://github.com/theGeekist/wp-kernel/docs/namespace-detection`
		);
	} else if (source === 'package-json') {
		namespaceReporter.warn(
			`📦 WP Kernel: Using package.json name for namespace "${namespace}". For WordPress-native behavior, set wpKernelData.textDomain or __WPK_NAMESPACE__. See: https://github.com/theGeekist/wp-kernel/docs/namespace-detection`
		);
	}
}

/**
 * Cache for namespace detection results
 * Key is a combination of options to ensure cache validity
 */
const _namespaceCache = new Map<string, NamespaceDetectionResult>();

/**
 * Reset the namespace detection cache
 * Useful for testing or when context changes
 */
export function resetNamespaceCache(): void {
	_namespaceCache.clear();
}

/**
 * Generate cache key from options
 *
 * @internal
 * @param options - Detection options
 * @return Cache key string
 */
function getCacheKey(options: NamespaceDetectionOptions): string {
	return JSON.stringify({
		explicit: options.explicit,
		mode: options.mode,
		runtime: options.runtime,
		moduleId: options.moduleId,
		validate: options.validate,
		fallback: options.fallback,
	});
}

/**
 * Detect runtime context automatically
 *
 * @internal
 * @return Best guess at current runtime context
 */
function detectRuntimeContext(): NamespaceRuntimeContext {
	if (typeof window === 'undefined') {
		return 'headless';
	}

	if (typeof document === 'undefined') {
		return 'static';
	}

	// Check if we're in WordPress admin
	if (document.body?.classList?.contains('wp-admin')) {
		return 'admin';
	}

	return 'frontend';
}

/**
 * Extract namespace from build-time defines
 * These are the most deterministic and WordPress-native sources
 *
 * @internal
 * @return Detected namespace or null
 */
function extractFromBuildDefines(): string | null {
	try {
		// Build-time define (set by Vite define, webpack DefinePlugin, etc.)
		const buildDefine = (globalThis as GlobalThisWithPackage)
			.__WPK_NAMESPACE__;
		if (buildDefine && typeof buildDefine === 'string') {
			return buildDefine;
		}

		return null;
	} catch (_error) {
		// Silent fail for detection
		return null;
	}
}

/**
 * Extract namespace from module ID
 * For Script Modules pattern: wpk/my-plugin → my-plugin
 *
 * @internal
 * @param moduleId - Module identifier
 * @return Extracted namespace or null
 */
function extractFromModuleId(moduleId: string): string | null {
	if (!moduleId || typeof moduleId !== 'string') {
		return null;
	}

	try {
		// Handle wpk/namespace pattern
		const wpkPrefix = `${WPK_NAMESPACE}/`;
		if (moduleId.startsWith(wpkPrefix)) {
			return moduleId.slice(wpkPrefix.length); // Remove 'wpk/' prefix
		}

		// Handle other patterns - extract last segment
		const segments = moduleId.split('/');
		const lastSegment = segments[segments.length - 1];

		if (lastSegment && lastSegment !== moduleId) {
			return lastSegment;
		}

		return null;
	} catch (_error) {
		return null;
	}
}

/**
 * Detection mode for namespace resolution
 * - 'wp': WordPress-native only (wpKernelData, build defines)
 * - 'auto': WordPress-native + safe heuristics
 * - 'heuristic': All detection methods including DOM parsing
 * - 'explicit': Only explicit namespace, no auto-detection
 */
export type NamespaceDetectionMode = 'wp' | 'auto' | 'heuristic' | 'explicit';

/**
 * Runtime context for namespace detection
 * Affects which detection methods are available
 */
export type NamespaceRuntimeContext =
	| 'admin'
	| 'frontend'
	| 'headless'
	| 'static';

/**
 * Options for namespace detection
 */
export type NamespaceDetectionOptions = {
	/**
	 * Explicit namespace override
	 */
	explicit?: string;

	/**
	 * Whether to validate the detected namespace
	 * @default true
	 */
	validate?: boolean;

	/**
	 * Fallback namespace if detection fails
	 * @default 'wpk'
	 */
	fallback?: string;

	/**
	 * Detection mode - controls which methods are used
	 * @default 'wp'
	 */
	mode?: NamespaceDetectionMode;

	/**
	 * Runtime context - affects availability of detection methods
	 * @default 'auto' (detected)
	 */
	runtime?: NamespaceRuntimeContext;

	/**
	 * Module ID for Script Modules (e.g., 'wpk/my-plugin' → 'my-plugin')
	 */
	moduleId?: string;
};

/**
 * Result of namespace detection
 */
export type NamespaceDetectionResult = {
	/**
	 * The detected/resolved namespace
	 */
	namespace: string;

	/**
	 * Source of the namespace
	 */
	source:
		| 'explicit'
		| 'build-define'
		| 'env-define'
		| 'module-id'
		| 'plugin-header'
		| 'package-json'
		| 'fallback';

	/**
	 * Whether the namespace was sanitized
	 */
	sanitized: boolean;

	/**
	 * Original value before sanitization (if different)
	 */
	original?: string;
};

type NamespaceCandidate = {
	source: NamespaceDetectionResult['source'];
	resolve: () => string | null | undefined;
	original?: string;
	onInvalid?: 'fallback' | 'default';
};

/**
 * Extract namespace from WordPress plugin headers
 *
 * Looks for 'Text Domain' in plugin header or attempts to
 * extract from plugin file name/directory structure.
 *
 * @internal
 * @param mode    - Detection mode (affects which methods are used)
 * @param runtime - Runtime context (affects DOM access)
 * @return Detected namespace or null
 */
function extractFromPluginHeader(
	mode: NamespaceDetectionMode = 'wp',
	runtime: NamespaceRuntimeContext = 'frontend'
): string | null {
	if (!isBrowserRuntime(runtime)) {
		return null;
	}

	if (!hasWordPressContext()) {
		return null;
	}

	const wpKernelData = getWordPressTextDomain();
	if (wpKernelData) {
		return wpKernelData;
	}

	if (!shouldUseHeuristics(mode)) {
		return null;
	}

	const scriptMatch = extractNamespaceFromScriptTags();
	if (scriptMatch) {
		return scriptMatch;
	}

	return extractNamespaceFromBodyClasses();
}

/**
 * Check if the runtime context is browser-based
 *
 * @internal
 * @param runtime - Runtime context to check
 * @return True if runtime allows browser API access
 */
function isBrowserRuntime(
	runtime: NamespaceRuntimeContext
): runtime is Exclude<NamespaceRuntimeContext, 'headless' | 'static'> {
	return runtime !== 'headless' && runtime !== 'static';
}

/**
 * Check if WordPress global context is available
 *
 * @internal
 * @return True if window.wp is defined
 */
function hasWordPressContext(): boolean {
	return (
		typeof window !== 'undefined' &&
		typeof (window as unknown as WordPressGlobal).wp !== 'undefined'
	);
}

/**
 * Extract WordPress text domain from global wpKernelData
 *
 * @internal
 * @return Text domain string or null if not found
 */
function getWordPressTextDomain(): string | null {
	const wpKernelData = (window as unknown as WordPressGlobal).wpKernelData
		?.textDomain;
	if (typeof wpKernelData === 'string' && wpKernelData.trim().length > 0) {
		return wpKernelData;
	}
	return null;
}

/**
 * Check if detection mode allows heuristic-based detection
 *
 * @internal
 * @param mode - Detection mode to check
 * @return True if heuristic methods should be used
 */
function shouldUseHeuristics(mode: NamespaceDetectionMode): boolean {
	return mode === 'heuristic' || mode === 'auto';
}

/**
 * Extract namespace from script tag IDs in the DOM
 *
 * Looks for script tags with IDs matching the pattern `{namespace}-wp-kernel`
 *
 * @internal
 * @return Detected namespace or null
 */
function extractNamespaceFromScriptTags(): string | null {
	try {
		const scripts = document.querySelectorAll('script[id*="wp-kernel"]');
		for (const script of scripts) {
			const id = script.getAttribute('id');
			if (!id || id.length > 100) {
				continue;
			}

			const match = id.match(/^([a-z0-9-]{1,50})-wp-kernel/);
			if (match?.[1]) {
				return match[1];
			}
		}
	} catch (_error) {
		return null;
	}

	return null;
}

/**
 * Extract namespace from body CSS classes
 *
 * Looks for body classes matching the pattern `{namespace}-admin`
 *
 * @internal
 * @return Detected namespace or null
 */
function extractNamespaceFromBodyClasses(): string | null {
	try {
		const bodyClasses = document.body.className;
		if (!bodyClasses || bodyClasses.length > 500) {
			return null;
		}

		const match = bodyClasses.match(
			/(?:^|\s)([a-z0-9-]{1,50})-admin(?:\s|$)/
		);
		return match?.[1] ?? null;
	} catch (_error) {
		return null;
	}
}

/**
 * Extract namespace from package.json
 *
 * Looks for package name in build context or bundled package info.
 *
 * @internal
 * @return Detected namespace or null
 */
function extractFromPackageJson(): string | null {
	try {
		// Try to get from bundled package info (set by build tools)
		// This works in both browser and Node.js environments
		const packageData = (globalThis as unknown as GlobalThisWithPackage)
			.__WP_KERNEL_PACKAGE__;
		if (packageData?.name && typeof packageData.name === 'string') {
			// Extract meaningful part from scoped package names
			const name = packageData.name;
			if (name.startsWith('@')) {
				// @scope/package-name -> package-name
				return name.split('/')[1] || null;
			}
			return name;
		}

		// In Node.js context, try to read package.json
		// Note: This is a future enhancement that would require dynamic import
		if (
			typeof process !== 'undefined' &&
			typeof process.cwd === 'function'
		) {
			// This would require dynamic import in actual implementation
			// For now, we rely on bundled package info above
			return null;
		}

		return null;
	} catch (_error) {
		// Silent fail for detection
		return null;
	}
}

/**
 * Sanitize namespace string
 *
 * Converts to lowercase, kebab-case, removes invalid characters,
 * and checks against reserved words.
 *
 * @param namespace - Raw namespace string
 * @return Sanitized namespace or null if invalid
 */
export function sanitizeNamespace(namespace: string): string | null {
	if (!namespace || typeof namespace !== 'string') {
		return null;
	}

	// Convert to lowercase and kebab-case
	const sanitized = namespace
		.toLowerCase()
		.trim()
		// Replace spaces and underscores with hyphens
		.replace(/[\s_]+/g, '-')
		// Remove non-alphanumeric characters except hyphens
		.replace(/[^a-z0-9-]/g, '')
		// Remove multiple consecutive hyphens
		.replace(/-+/g, '-')
		// Remove leading/trailing hyphens
		.replace(/^-+|-+$/g, '');

	// Must not be empty after sanitization
	if (!sanitized) {
		return null;
	}

	// Must not be a reserved word
	if ((RESERVED_NAMESPACES as readonly string[]).includes(sanitized)) {
		return null;
	}

	// Must start with a letter
	if (!/^[a-z]/.test(sanitized)) {
		return null;
	}

	// Must be reasonable length (3-50 characters)
	if (sanitized.length < 3 || sanitized.length > 50) {
		return null;
	}

	return sanitized;
}

/**
 * Detect namespace with intelligent auto-detection
 *
 * Implements the detection priority cascade:
 * 1. Explicit namespace parameter
 * 2. Build-time defines (__WPK_NAMESPACE__, import.meta.env.WPK_NAMESPACE)
 * 3. Module ID extraction (Script Modules pattern)
 * 4. WordPress plugin header 'Text Domain'
 * 5. package.json 'name' field
 * 6. Fallback to default
 *
 * @param options - Detection options
 * @return Detection result with namespace and metadata
 */
export function detectNamespace(
	options: NamespaceDetectionOptions = {}
): NamespaceDetectionResult {
	const {
		explicit,
		validate = true,
		fallback = WPK_NAMESPACE,
		mode = 'wp',
		runtime,
		moduleId,
	} = options;

	// Check cache first
	const cacheKey = getCacheKey(options);
	if (_namespaceCache.has(cacheKey)) {
		return _namespaceCache.get(cacheKey)!;
	}

	// Detect runtime context if not provided
	const detectedRuntime = runtime || detectRuntimeContext();

	// Helper to create result and cache it
	const createResult = (
		namespace: string,
		source: NamespaceDetectionResult['source'],
		original?: string
	): NamespaceDetectionResult => {
		const result: NamespaceDetectionResult = {
			namespace,
			source,
			sanitized: validate && namespace !== (original || namespace),
			original:
				validate && namespace !== (original || namespace)
					? original || namespace
					: undefined,
		};

		// Emit development warnings for non-deterministic fallbacks
		emitDevWarning(source, namespace);

		_namespaceCache.set(cacheKey, result);
		return result;
	};

	const evaluateCandidate = (
		candidate: string | null | undefined,
		source: NamespaceDetectionResult['source'],
		original?: string
	): NamespaceDetectionResult | null => {
		if (!candidate) {
			return null;
		}

		if (!validate) {
			return createResult(candidate, source);
		}

		const sanitized = sanitizeNamespace(candidate);
		return sanitized
			? createResult(sanitized, source, original ?? candidate)
			: null;
	};

	const candidates = buildNamespaceCandidates({
		explicit,
		fallback,
		mode,
		moduleId,
		detectedRuntime,
	});

	return evaluateCandidates(candidates, fallback, evaluateCandidate, () =>
		createResult(WPK_NAMESPACE, 'fallback')
	);
}

/**
 * Build an ordered list of namespace candidates to evaluate
 *
 * Creates candidates based on detection mode and available context.
 * Candidates are ordered by priority (explicit > build-time > auto-detect > fallback).
 *
 * @internal
 * @param args                 - Configuration for building candidates
 * @param args.explicit        - Explicit namespace override
 * @param args.fallback        - Fallback namespace if all detection fails
 * @param args.mode            - Detection mode controlling which methods to use
 * @param args.moduleId        - Module ID for Script Modules pattern extraction
 * @param args.detectedRuntime - Detected runtime context
 * @return Ordered array of namespace candidates
 */
function buildNamespaceCandidates(args: {
	explicit?: string;
	fallback: string;
	mode: NamespaceDetectionMode;
	moduleId?: string;
	detectedRuntime: NamespaceRuntimeContext;
}): NamespaceCandidate[] {
	const { explicit, fallback, mode, moduleId, detectedRuntime } = args;

	const explicitCandidate: NamespaceCandidate = {
		source: 'explicit',
		resolve: () => explicit ?? null,
		original: explicit,
		onInvalid: explicit && mode === 'explicit' ? 'fallback' : undefined,
	};

	const autoDetectCandidates: NamespaceCandidate[] =
		mode === 'explicit'
			? []
			: [
					{
						source: 'build-define',
						resolve: extractFromBuildDefines,
					},
					{
						source: 'module-id',
						resolve: () =>
							moduleId ? extractFromModuleId(moduleId) : null,
					},
					{
						source: 'plugin-header',
						resolve: () =>
							extractFromPluginHeader(mode, detectedRuntime),
					},
					{
						source: 'package-json',
						resolve: extractFromPackageJson,
					},
				];

	const fallbackCandidate: NamespaceCandidate = {
		source: 'fallback',
		resolve: () => fallback,
		original: fallback,
		onInvalid: 'default',
	};

	return [explicitCandidate, ...autoDetectCandidates, fallbackCandidate];
}

/**
 * Evaluate namespace candidates in priority order
 *
 * Iterates through candidates, evaluating each one. Returns the first valid result.
 * Handles special fallback logic for invalid explicit namespaces and final default fallback.
 *
 * @internal
 * @param candidates     - Ordered array of namespace candidates
 * @param fallback       - Fallback namespace to use for invalid explicit values
 * @param evaluate       - Function to evaluate and validate a candidate
 * @param createFallback - Function to create the ultimate fallback result
 * @return Namespace detection result
 */
function evaluateCandidates(
	candidates: NamespaceCandidate[],
	fallback: string,
	evaluate: (
		candidate: string | null | undefined,
		source: NamespaceDetectionResult['source'],
		original?: string
	) => NamespaceDetectionResult | null,
	createFallback: () => NamespaceDetectionResult
): NamespaceDetectionResult {
	for (const candidate of candidates) {
		const value = candidate.resolve();
		const result = evaluate(
			value,
			candidate.source,
			candidate.original ?? value ?? undefined
		);
		if (result) {
			return result;
		}

		if (candidate.onInvalid === 'fallback') {
			const fallbackResult = evaluate(
				fallback,
				'fallback',
				candidate.original ?? value ?? undefined
			);
			return fallbackResult ?? createFallback();
		}
		if (candidate.onInvalid === 'default') {
			return createFallback();
		}
	}

	return createFallback();
}

/**
 * Simple namespace detection for common use cases
 *
 * @param explicit - Optional explicit namespace
 * @return Detected namespace string
 */
export function getNamespace(explicit?: string): string {
	return detectNamespace({ explicit }).namespace;
}

/**
 * Check if a namespace is valid
 *
 * @param namespace - Namespace to validate
 * @return True if valid
 */
export function isValidNamespace(namespace: string): boolean {
	return sanitizeNamespace(namespace) === namespace;
}
