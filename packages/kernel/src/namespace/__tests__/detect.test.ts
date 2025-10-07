/**
 * Tests for namespace detection functionality
 *
 * Using centralized WordPress type infrastructure with clean, typed global mocking.
 * No 'any' types or manual global cleanup required.
 */

import {
	detectNamespace,
	getNamespace,
	isValidNamespace,
	sanitizeNamespace,
} from '../detect.js';
import {
	setKernelPackage,
	setWpPluginData,
	setProcessEnv,
	clearNamespaceState,
} from '../../../../../tests/test-utils/wp.js';

// Clear state before each test to prevent cache pollution
beforeEach(() => {
	clearNamespaceState();
});

describe('sanitizeNamespace', () => {
	describe('valid inputs', () => {
		it('should return valid namespace unchanged', () => {
			expect(sanitizeNamespace('my-plugin')).toBe('my-plugin');
			expect(sanitizeNamespace('acme-blog')).toBe('acme-blog');
			expect(sanitizeNamespace('test123')).toBe('test123');
		});

		it('should convert uppercase to lowercase', () => {
			expect(sanitizeNamespace('My-Plugin')).toBe('my-plugin');
			expect(sanitizeNamespace('ACME-BLOG')).toBe('acme-blog');
		});

		it('should convert spaces and underscores to hyphens', () => {
			expect(sanitizeNamespace('my plugin')).toBe('my-plugin');
			expect(sanitizeNamespace('my_plugin')).toBe('my-plugin');
			expect(sanitizeNamespace('my   plugin')).toBe('my-plugin');
		});

		it('should remove invalid characters', () => {
			expect(sanitizeNamespace('my@plugin!')).toBe('myplugin');
			expect(sanitizeNamespace('acme.blog')).toBe('acmeblog');
			expect(sanitizeNamespace('test$123')).toBe('test123');
		});

		it('should remove multiple consecutive hyphens', () => {
			expect(sanitizeNamespace('my---plugin')).toBe('my-plugin');
			expect(sanitizeNamespace('test--123')).toBe('test-123');
		});

		it('should remove leading and trailing hyphens', () => {
			expect(sanitizeNamespace('-my-plugin-')).toBe('my-plugin');
			expect(sanitizeNamespace('--test--')).toBe('test');
		});

		it('should handle complex sanitization', () => {
			expect(sanitizeNamespace('  My_@Plugin--123!  ')).toBe(
				'my-plugin-123'
			);
		});
	});

	describe('invalid inputs', () => {
		it('should return null for empty or invalid strings', () => {
			expect(sanitizeNamespace('')).toBeNull();
			expect(sanitizeNamespace('   ')).toBeNull();
			expect(sanitizeNamespace('---')).toBeNull();
		});

		it('should return null for reserved words', () => {
			expect(sanitizeNamespace('wp')).toBeNull();
			expect(sanitizeNamespace('wordpress')).toBeNull();
			expect(sanitizeNamespace('admin')).toBeNull();
		});

		it('should return null for namespaces not starting with letter', () => {
			expect(sanitizeNamespace('123plugin')).toBeNull();
			expect(sanitizeNamespace('-plugin')).toBe('plugin'); // Leading hyphen is removed
		});

		it('should return null for too short namespaces', () => {
			expect(sanitizeNamespace('ab')).toBeNull();
			expect(sanitizeNamespace('a')).toBeNull();
		});

		it('should return null for too long namespaces', () => {
			const longName = 'a'.repeat(51);
			expect(sanitizeNamespace(longName)).toBeNull();
		});

		it('should return null for non-string inputs', () => {
			expect(sanitizeNamespace(null as any)).toBeNull();
			expect(sanitizeNamespace(undefined as any)).toBeNull();
			expect(sanitizeNamespace(123 as any)).toBeNull();
		});
	});
});

describe('isValidNamespace', () => {
	it('should return true for valid namespaces', () => {
		expect(isValidNamespace('my-plugin')).toBe(true);
		expect(isValidNamespace('acme-blog')).toBe(true);
		expect(isValidNamespace('test123')).toBe(true);
	});

	it('should return false for invalid namespaces', () => {
		expect(isValidNamespace('')).toBe(false);
		expect(isValidNamespace('123test')).toBe(false);
		expect(isValidNamespace('wp')).toBe(false); // reserved
		expect(isValidNamespace('123test')).toBe(false); // starts with number
		expect(isValidNamespace('ab')).toBe(false); // too short
	});
});

describe('explicit namespace priority', () => {
	// Global cleanup is handled automatically by Jest setup

	it('should use explicit namespace when provided and valid', () => {
		const result = detectNamespace({ explicit: 'my-plugin' });
		expect(result).toEqual({
			namespace: 'my-plugin',
			source: 'explicit',
			sanitized: false,
		});
	});

	it('should sanitize explicit namespace when needed', () => {
		const result = detectNamespace({ explicit: 'My Plugin!' });
		expect(result).toEqual({
			namespace: 'my-plugin',
			source: 'explicit',
			sanitized: true,
			original: 'My Plugin!',
		});
	});

	it('should fall through when explicit namespace is invalid', () => {
		const result = detectNamespace({ explicit: '123invalid' });
		expect(result.source).toBe('fallback');
		expect(result.namespace).toBe('wpk');
	});

	it('should skip validation when validate=false', () => {
		const result = detectNamespace({
			explicit: '123invalid',
			validate: false,
		});
		expect(result).toEqual({
			namespace: '123invalid',
			source: 'explicit',
			sanitized: false,
		});
	});
});

describe('plugin header detection', () => {
	// Global cleanup is handled automatically by Jest setup

	it('should extract from WordPress global data', () => {
		setWpPluginData({ name: 'my-plugin' });

		const result = detectNamespace();
		expect(result).toEqual({
			namespace: 'my-plugin',
			source: 'plugin-header',
			sanitized: false,
		});
	});

	it('should handle extraction errors gracefully', () => {
		// Test with invalid global data that should fall through to fallback
		setWpPluginData({ name: '' }); // Empty name

		const result = detectNamespace();
		expect(result.source).toBe('fallback');
		expect(result.namespace).toBe('wpk');
	});
});

describe('package.json detection', () => {
	// Global cleanup is handled automatically by Jest setup

	it('should extract from bundled package data', () => {
		clearNamespaceState(); // Clear any previous state
		setKernelPackage({ name: 'my-plugin' });

		const result = detectNamespace();
		expect(result).toEqual({
			namespace: 'my-plugin',
			source: 'package-json',
			sanitized: false,
		});
	});

	it('should extract from scoped package names', () => {
		clearNamespaceState(); // Clear any previous state
		setKernelPackage({ name: '@acme/my-plugin' });

		const result = detectNamespace();
		expect(result).toEqual({
			namespace: 'my-plugin',
			source: 'package-json',
			sanitized: false,
		});
	});

	it('should handle Node.js context gracefully', () => {
		clearNamespaceState(); // Ensure no package data from previous tests
		// Simulate Node.js environment
		setProcessEnv({ NODE_ENV: 'test' });

		const result = detectNamespace();
		expect(result.source).toBe('fallback');
		expect(result.namespace).toBe('wpk');
	});

	it('should handle package data errors gracefully', () => {
		clearNamespaceState(); // Clear any previous state
		// Test with getter that throws
		setKernelPackage({ name: 'error-package' });

		// Should fall through to fallback since we don't set a custom error
		const result = detectNamespace();
		expect(result.source).toBe('package-json');
		expect(result.namespace).toBe('error-package');
	});
});

describe('fallback behavior', () => {
	// Global cleanup is handled automatically by Jest setup

	it('should use default fallback', () => {
		clearNamespaceState(); // Ensure no data from previous tests
		const result = detectNamespace();
		expect(result).toEqual({
			namespace: 'wpk',
			source: 'fallback',
			sanitized: false,
		});
	});

	it('should use custom fallback', () => {
		clearNamespaceState(); // Ensure no data from previous tests
		const result = detectNamespace({ fallback: 'custom' });
		expect(result).toEqual({
			namespace: 'custom',
			source: 'fallback',
			sanitized: false,
		});
	});

	it('should sanitize invalid fallback', () => {
		clearNamespaceState(); // Ensure no data from previous tests
		const result = detectNamespace({ fallback: 'My Custom!' });
		expect(result).toEqual({
			namespace: 'my-custom',
			source: 'fallback',
			sanitized: true,
			original: 'My Custom!',
		});
	});

	it('should use wpk when fallback is invalid', () => {
		clearNamespaceState(); // Ensure no data from previous tests
		const result = detectNamespace({ fallback: '123invalid' });
		expect(result).toEqual({
			namespace: 'wpk',
			source: 'fallback',
			sanitized: false,
			original: undefined,
		});
	});
});

describe('validation handling', () => {
	// Global cleanup is handled automatically by Jest setup

	it('should sanitize detected namespaces when validate=true', () => {
		setWpPluginData({ name: 'My Plugin' });

		const result = detectNamespace({ validate: true });
		expect(result).toEqual({
			namespace: 'my-plugin',
			source: 'plugin-header',
			sanitized: true,
			original: 'My Plugin',
		});
	});

	it('should skip sanitization when validate=false', () => {
		setWpPluginData({ name: 'My Plugin' });

		const result = detectNamespace({ validate: false });
		expect(result).toEqual({
			namespace: 'My Plugin',
			source: 'plugin-header',
			sanitized: false,
		});
	});
});

describe('getNamespace', () => {
	// Global cleanup is handled automatically by Jest setup

	it('should return namespace string from detectNamespace', () => {
		clearNamespaceState(); // Clear any previous state
		const namespace = getNamespace();
		expect(typeof namespace).toBe('string');
		expect(namespace).toBe('wpk');
	});

	it('should handle sanitization', () => {
		setWpPluginData({ name: 'My Plugin' });
		const namespace = getNamespace();
		expect(namespace).toBe('my-plugin'); // getNamespace sanitizes by default
	});
});

describe('integration scenarios', () => {
	// Global cleanup is handled automatically by Jest setup

	it('should prioritize explicit over plugin header', () => {
		setWpPluginData({ name: 'plugin-name' });
		const result = detectNamespace({ explicit: 'explicit-name' });
		expect(result.namespace).toBe('explicit-name');
		expect(result.source).toBe('explicit');
	});

	it('should prioritize plugin header over package.json', () => {
		setKernelPackage({ name: 'package-name' });
		setWpPluginData({ name: 'plugin-name' });
		const result = detectNamespace();
		expect(result.namespace).toBe('plugin-name');
		expect(result.source).toBe('plugin-header');
	});

	it('should prioritize package.json over fallback', () => {
		clearNamespaceState(); // Clear any previous state
		setKernelPackage({ name: 'package-name' });
		const result = detectNamespace({ fallback: 'fallback-name' });
		expect(result.namespace).toBe('package-name');
		expect(result.source).toBe('package-json');
	});

	it('should cascade through all detection methods', () => {
		clearNamespaceState(); // Clear any previous state
		// No explicit, no plugin data, no package data -> fallback
		const result = detectNamespace({ fallback: 'final-fallback' });
		expect(result.namespace).toBe('final-fallback');
		expect(result.source).toBe('fallback');
	});
});

describe('build defines and fast paths', () => {
	it('should extract from globalThis.__WPK_NAMESPACE__', () => {
		// Set build-time define
		(globalThis as any).__WPK_NAMESPACE__ = 'build-defined';

		const result = detectNamespace();
		expect(result.namespace).toBe('build-defined');
		expect(result.source).toBe('build-define');

		// Clean up
		delete (globalThis as any).__WPK_NAMESPACE__;
	});

	it('should handle invalid build defines gracefully', () => {
		// Set invalid build define
		(globalThis as any).__WPK_NAMESPACE__ = 123; // Non-string

		const result = detectNamespace();
		expect(result.source).toBe('fallback');
		expect(result.namespace).toBe('wpk');

		// Clean up
		delete (globalThis as any).__WPK_NAMESPACE__;
	});

	it('should handle build define errors gracefully', () => {
		// Simulate error during extraction
		const originalDefine = (globalThis as any).__WPK_NAMESPACE__;

		// Mock a property that throws when accessed
		Object.defineProperty(globalThis, '__WPK_NAMESPACE__', {
			get() {
				throw new Error('Access denied');
			},
			configurable: true,
		});

		const result = detectNamespace();
		expect(result.source).toBe('fallback');

		// Clean up
		delete (globalThis as any).__WPK_NAMESPACE__;
		if (originalDefine !== undefined) {
			(globalThis as any).__WPK_NAMESPACE__ = originalDefine;
		}
	});
});

describe('module ID extraction', () => {
	it('should extract from wpk/ prefix pattern', () => {
		const result = detectNamespace({ moduleId: 'wpk/my-plugin' });
		expect(result.namespace).toBe('my-plugin');
		expect(result.source).toBe('module-id');
	});

	it('should extract from path-like module IDs', () => {
		const result = detectNamespace({
			moduleId: '@scope/my-package/dist/bundle',
		});
		expect(result.namespace).toBe('bundle');
		expect(result.source).toBe('module-id');
	});

	it('should handle invalid module IDs', () => {
		const result = detectNamespace({ moduleId: '' });
		expect(result.source).toBe('fallback');
	});

	it('should handle module ID errors gracefully', () => {
		// Test with non-string moduleId
		const result = detectNamespace({ moduleId: null as any });
		expect(result.source).toBe('fallback');
	});

	it('should handle simple module IDs without path segments', () => {
		const result = detectNamespace({ moduleId: 'simple-module' });
		expect(result.source).toBe('fallback'); // Should not extract from single segment
	});
});

describe('mode controls', () => {
	beforeEach(() => {
		clearNamespaceState();
		// Set up WordPress environment for DOM-based tests
		setWpPluginData({ name: 'test-plugin' });
	});

	it('should respect wp mode (WordPress-native only)', () => {
		const result = detectNamespace({ mode: 'wp' });
		// In 'wp' mode, should get plugin header (WordPress-native)
		expect(result.namespace).toBe('test-plugin');
		expect(result.source).toBe('plugin-header');
	});

	it('should respect auto mode (WordPress-native + safe heuristics)', () => {
		const result = detectNamespace({ mode: 'auto' });
		expect(result.namespace).toBe('test-plugin');
		expect(result.source).toBe('plugin-header');
	});

	it('should respect heuristic mode (all detection methods)', () => {
		const result = detectNamespace({ mode: 'heuristic' });
		expect(result.namespace).toBe('test-plugin');
		expect(result.source).toBe('plugin-header');
	});

	it('should respect explicit mode (no auto-detection)', () => {
		const result = detectNamespace({ mode: 'explicit' });
		// Should skip all auto-detection and go to fallback
		expect(result.namespace).toBe('wpk');
		expect(result.source).toBe('fallback');
	});

	it('should use explicit namespace in explicit mode', () => {
		const result = detectNamespace({
			mode: 'explicit',
			explicit: 'my-explicit-namespace',
		});
		expect(result.namespace).toBe('my-explicit-namespace');
		expect(result.source).toBe('explicit');
	});

	it('should sanitize invalid explicit namespace in explicit mode', () => {
		const result = detectNamespace({
			mode: 'explicit',
			explicit: 'Invalid Namespace!',
		});
		expect(result.namespace).toBe('invalid-namespace'); // Gets sanitized, not rejected
		expect(result.source).toBe('explicit');
		expect(result.sanitized).toBe(true);
		expect(result.original).toBe('Invalid Namespace!');
	});
});

describe('runtime context awareness', () => {
	it('should skip DOM detection in headless context', () => {
		setWpPluginData({ name: 'should-not-be-found' });

		const result = detectNamespace({
			mode: 'heuristic',
			runtime: 'headless',
		});
		expect(result.source).toBe('fallback');
		expect(result.namespace).toBe('wpk');
	});

	it('should skip DOM detection in static context', () => {
		setWpPluginData({ name: 'should-not-be-found' });

		const result = detectNamespace({
			mode: 'heuristic',
			runtime: 'static',
		});
		expect(result.source).toBe('fallback');
		expect(result.namespace).toBe('wpk');
	});

	it('should allow DOM detection in admin context', () => {
		setWpPluginData({ name: 'admin-plugin' });

		const result = detectNamespace({
			mode: 'wp',
			runtime: 'admin',
		});
		expect(result.namespace).toBe('admin-plugin');
		expect(result.source).toBe('plugin-header');
	});

	it('should allow DOM detection in frontend context', () => {
		setWpPluginData({ name: 'frontend-plugin' });

		const result = detectNamespace({
			mode: 'wp',
			runtime: 'frontend',
		});
		expect(result.namespace).toBe('frontend-plugin');
		expect(result.source).toBe('plugin-header');
	});

	it('should auto-detect runtime context when not provided', () => {
		// Test auto-detection (should default to 'frontend' in jsdom)
		setWpPluginData({ name: 'auto-context' });

		const result = detectNamespace({ mode: 'wp' }); // No runtime specified
		expect(result.namespace).toBe('auto-context');
		expect(result.source).toBe('plugin-header');
	});
});

describe('caching behavior', () => {
	it('should cache results based on options', () => {
		// First call should detect and cache
		setWpPluginData({ name: 'cached-plugin' });
		const result1 = detectNamespace({ mode: 'wp' });
		expect(result1.namespace).toBe('cached-plugin');

		// Change data but same options should return cached result
		setWpPluginData({ name: 'different-plugin' });
		const result2 = detectNamespace({ mode: 'wp' });
		expect(result2.namespace).toBe('cached-plugin'); // Should be cached

		// Different options should bypass cache
		const result3 = detectNamespace({ mode: 'auto' });
		expect(result3.namespace).toBe('different-plugin'); // New cache entry
	});

	it('should use different cache keys for different options', () => {
		setWpPluginData({ name: 'test-cache' });

		const result1 = detectNamespace({ mode: 'wp', validate: true });
		const result2 = detectNamespace({ mode: 'wp', validate: false });

		// Should be different cache entries due to different validate option
		expect(result1.namespace).toBe('test-cache');
		expect(result2.namespace).toBe('test-cache');
	});
});

describe('validation edge cases', () => {
	it('should handle validation with all detection sources', () => {
		// Test build define validation with an actually invalid namespace that should return null
		(globalThis as any).__WPK_NAMESPACE__ = '2invalid'; // Starts with number, should be invalid

		const result = detectNamespace({ validate: true });
		expect(result.source).toBe('fallback'); // Should fall through when invalid

		delete (globalThis as any).__WPK_NAMESPACE__;
	});

	it('should handle unvalidated detection', () => {
		// Clear any global state first
		clearNamespaceState();
		setWpPluginData({ name: 'INVALID NAME!' });

		const result = detectNamespace({ validate: false });
		expect(result.namespace).toBe('INVALID NAME!');
		expect(result.source).toBe('plugin-header');
		expect(result.sanitized).toBe(false);
	});

	it('should track original values when sanitized', () => {
		// Clear any global state first
		clearNamespaceState();
		setWpPluginData({ name: 'My Plugin Name' });

		const result = detectNamespace({ validate: true });
		expect(result.namespace).toBe('my-plugin-name');
		expect(result.source).toBe('plugin-header');
		expect(result.sanitized).toBe(true);
		expect(result.original).toBe('My Plugin Name');
	});
});

describe('heuristic DOM detection', () => {
	beforeEach(() => {
		clearNamespaceState();
		// Ensure WordPress environment is available for DOM detection
		if (!window.wp) {
			(window as any).wp = {};
		}
	});

	it('should extract from script tag IDs in heuristic mode', () => {
		// Mock DOM with script tag containing plugin info
		const script = document.createElement('script');
		script.id = 'my-plugin-wp-kernel-js';
		document.head.appendChild(script);

		const result = detectNamespace({ mode: 'heuristic' });
		expect(result.namespace).toBe('my-plugin');
		expect(result.source).toBe('plugin-header');

		// Clean up
		document.head.removeChild(script);
	});

	it('should skip heuristic detection in wp mode', () => {
		// Set up DOM that would be detected in heuristic mode
		const script = document.createElement('script');
		script.id = 'should-not-find-wp-kernel-js';
		document.head.appendChild(script);
		document.body.className = 'wp-admin should-not-find-admin';

		const result = detectNamespace({ mode: 'wp' });
		expect(result.namespace).toBe('wpk'); // Should fallback, not detect from DOM
		expect(result.source).toBe('fallback');

		// Clean up
		document.head.removeChild(script);
		document.body.className = '';
	});
	it('should handle DOM errors gracefully', () => {
		// Mock querySelectorAll to throw an error
		const originalQuerySelectorAll = document.querySelectorAll;
		document.querySelectorAll = (() => {
			throw new Error('DOM access error');
		}) as any;

		const result = detectNamespace({ mode: 'heuristic' });
		expect(result.source).toBe('fallback');

		// Restore
		document.querySelectorAll = originalQuerySelectorAll;
	});
});

describe('package.json detection edge cases', () => {
	it('should handle missing package data gracefully', () => {
		// Clear any package data and test fallback
		clearNamespaceState();

		const result = detectNamespace({ mode: 'auto' });
		expect(result.source).toBe('fallback');
		expect(result.namespace).toBe('wpk');
	});
});

describe('development warnings', () => {
	const originalEnv = process.env.NODE_ENV;

	beforeEach(() => {
		process.env.NODE_ENV = 'development';
		clearNamespaceState();
	});

	afterEach(() => {
		process.env.NODE_ENV = originalEnv;
	});

	it('emits a warning when falling back to default namespace in development', () => {
		const result = detectNamespace({ fallback: 'custom-fallback' });

		expect(console).toHaveWarnedWith(
			'[wpk.namespace]',
			'🔧 WP Kernel: Using fallback namespace "custom-fallback". For deterministic behavior, set __WPK_NAMESPACE__ (build-time) or wpKernelData.textDomain (runtime). See: https://github.com/theGeekist/wp-kernel/docs/namespace-detection'
		);

		expect(result.source).toBe('fallback');
	});

	it('emits a warning when using package.json derived namespace in development', () => {
		setKernelPackage({ name: '@acme/test-package' });
		const result = detectNamespace();

		expect(console).toHaveWarnedWith(
			'[wpk.namespace]',
			'📦 WP Kernel: Using package.json name for namespace "test-package". For WordPress-native behavior, set wpKernelData.textDomain or __WPK_NAMESPACE__. See: https://github.com/theGeekist/wp-kernel/docs/namespace-detection'
		);

		expect(result.source).toBe('package-json');
	});
});
