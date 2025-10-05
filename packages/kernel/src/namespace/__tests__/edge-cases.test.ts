/**
 * Edge cases and security tests for namespace detection
 *
 * This file covers uncovered lines, edge cases, error conditions,
 * and security scenarios to bring coverage to framework standards.
 */

import {
	detectNamespace,
	sanitizeNamespace,
	resetNamespaceCache,
} from '../detect.js';
import {
	clearNamespaceState,
	setKernelPackage,
	setWpPluginData,
} from '../../../../../tests/test-utils/wp.js';

// Clear state before each test to prevent cache pollution
beforeEach(() => {
	clearNamespaceState();
});

describe('regex security and edge cases', () => {
	it('should handle potential ReDoS attacks in script ID regex', () => {
		// Test with potentially malicious input that could cause ReDoS
		const maliciousScript = document.createElement('script');
		// Create a string that could cause catastrophic backtracking
		const maliciousId = 'a'.repeat(1000) + '-wp-kernel-js';
		maliciousScript.id = maliciousId;
		document.head.appendChild(maliciousScript);

		// Ensure WordPress environment
		if (!window.wp) {
			(window as any).wp = {};
		}

		const startTime = Date.now();
		const result = detectNamespace({ mode: 'heuristic' });
		const duration = Date.now() - startTime;

		// Should complete quickly (< 1000ms) and not hang on CI
		expect(duration).toBeLessThan(1000);
		// Should reject the overly long input (security feature)
		expect(result.source).toBe('fallback');

		// Clean up
		document.head.removeChild(maliciousScript);
	});

	it('should handle potential ReDoS attacks in body class regex', () => {
		// Test with potentially malicious body classes
		const maliciousClass = 'a'.repeat(1000) + '-admin';
		document.body.className = maliciousClass;

		// Ensure WordPress environment
		if (!window.wp) {
			(window as any).wp = {};
		}

		const startTime = Date.now();
		const result = detectNamespace({ mode: 'heuristic' });
		const duration = Date.now() - startTime;

		// Should complete quickly and not hang on CI
		expect(duration).toBeLessThan(1000);
		// Should reject the overly long input (security feature)
		expect(result.source).toBe('fallback');

		// Clean up
		document.body.className = '';
	});

	it('should handle empty and null script IDs safely', () => {
		const script1 = document.createElement('script');
		script1.id = ''; // Empty ID
		document.head.appendChild(script1);

		const script2 = document.createElement('script');
		// No ID attribute
		document.head.appendChild(script2);

		// Ensure WordPress environment
		if (!window.wp) {
			(window as any).wp = {};
		}

		const result = detectNamespace({ mode: 'heuristic' });
		expect(result.source).toBe('fallback');

		// Clean up
		document.head.removeChild(script1);
		document.head.removeChild(script2);
	});

	it('should handle special characters in script IDs', () => {
		const script = document.createElement('script');
		script.id = 'plugin@#$%-wp-kernel-js';
		document.head.appendChild(script);

		// Ensure WordPress environment
		if (!window.wp) {
			(window as any).wp = {};
		}

		const result = detectNamespace({ mode: 'heuristic' });
		// Should reject IDs with special characters (security feature)
		expect(result.source).toBe('fallback');

		// Clean up
		document.head.removeChild(script);
	});
});

describe('sanitizeNamespace edge cases', () => {
	it('should handle extremely long namespace strings', () => {
		const veryLongName = 'a'.repeat(100);
		const result = sanitizeNamespace(veryLongName);
		expect(result).toBeNull(); // Too long (> 50 chars)
	});

	it('should handle namespace with only special characters', () => {
		const result = sanitizeNamespace('!@#$%^&*()');
		expect(result).toBeNull(); // No valid characters remaining
	});

	it('should handle namespace that becomes empty after sanitization', () => {
		const result = sanitizeNamespace('   ___   ');
		expect(result).toBeNull(); // Only whitespace and underscores
	});

	it('should handle namespace that starts with numbers after sanitization', () => {
		const result = sanitizeNamespace('123abc');
		expect(result).toBeNull(); // Starts with number
	});

	it('should handle edge case reserved words', () => {
		expect(sanitizeNamespace('wp')).toBeNull();
		expect(sanitizeNamespace('WP')).toBeNull(); // Case insensitive
		expect(sanitizeNamespace('WORDPRESS')).toBeNull();
		expect(sanitizeNamespace('admin')).toBeNull();
		expect(sanitizeNamespace('core')).toBeNull();
	});

	it('should handle mixed case reserved words', () => {
		expect(sanitizeNamespace('System')).toBeNull();
		expect(sanitizeNamespace('API')).toBeNull();
		expect(sanitizeNamespace('REST')).toBeNull();
	});

	it('should handle boundary length cases', () => {
		expect(sanitizeNamespace('ab')).toBeNull(); // Too short (< 3)
		expect(sanitizeNamespace('abc')).toBe('abc'); // Minimum valid
		const fiftyChars = 'a'.repeat(50);
		expect(sanitizeNamespace(fiftyChars)).toBe(fiftyChars); // Maximum valid
		const fiftyOneChars = 'a'.repeat(51);
		expect(sanitizeNamespace(fiftyOneChars)).toBeNull(); // Too long
	});
});

describe('detectRuntimeContext edge cases', () => {
	it('should handle missing window object gracefully', () => {
		// Test detection in headless context where DOM may be limited
		const result = detectNamespace({
			mode: 'wp',
			runtime: 'headless', // Explicitly set to headless to simulate missing window
		});
		expect(result.source).toBe('fallback');
	});

	it('should handle missing document object gracefully', () => {
		// Test detection in static context where document may be limited
		const result = detectNamespace({
			mode: 'wp',
			runtime: 'static', // Explicitly set to static to simulate missing document
		});
		expect(result.source).toBe('fallback');
	});

	it('should detect admin context from body classes', () => {
		// Mock admin body class
		document.body.classList.add('wp-admin');

		// Should detect admin context automatically
		const result = detectNamespace({ mode: 'wp' });
		// Context detection is internal, just ensure it works
		expect(result.source).toBe('fallback'); // No plugin data set

		// Clean up
		document.body.classList.remove('wp-admin');
	});
});

describe('extractFromBuildDefines edge cases', () => {
	it('should handle non-string build defines', () => {
		(globalThis as any).__WPK_NAMESPACE__ = { invalid: 'object' };

		const result = detectNamespace();
		expect(result.source).toBe('fallback');

		delete (globalThis as any).__WPK_NAMESPACE__;
	});

	it('should handle undefined build defines', () => {
		(globalThis as any).__WPK_NAMESPACE__ = undefined;

		const result = detectNamespace();
		expect(result.source).toBe('fallback');

		delete (globalThis as any).__WPK_NAMESPACE__;
	});

	it('should handle null build defines', () => {
		(globalThis as any).__WPK_NAMESPACE__ = null;

		const result = detectNamespace();
		expect(result.source).toBe('fallback');

		delete (globalThis as any).__WPK_NAMESPACE__;
	});
});

describe('extractFromModuleId edge cases', () => {
	it('should handle module IDs with multiple slashes', () => {
		const result = detectNamespace({
			moduleId: 'wpk/sub/path/final-name',
		});
		// For wpk/ prefix, it removes the prefix and sanitizes (slashes removed)
		expect(result.namespace).toBe('subpathfinal-name');
		expect(result.source).toBe('module-id');
	});

	it('should handle module IDs with no separators', () => {
		const result = detectNamespace({ moduleId: 'single-name' });
		expect(result.source).toBe('fallback'); // Single segment not extracted
	});

	it('should handle empty module ID segments', () => {
		const result = detectNamespace({ moduleId: 'wpk/' });
		expect(result.source).toBe('fallback'); // Empty after prefix
	});

	it('should handle module IDs with only wpk prefix', () => {
		const result = detectNamespace({ moduleId: 'wpk' });
		expect(result.source).toBe('fallback'); // No slash separator
	});

	it('should handle malformed module IDs', () => {
		const result = detectNamespace({ moduleId: '/invalid/path/' });
		// Empty last segment after split, should fall back
		expect(result.source).toBe('fallback');
	});
});

describe('extractFromPluginHeader edge cases', () => {
	it('should handle wp object without data property', () => {
		(window as any).wp = { someOther: 'property' };
		// No wp.data property

		const result = detectNamespace({ mode: 'wp' });
		expect(result.source).toBe('fallback');
	});

	it('should handle wpKernelData with non-string textDomain', () => {
		if (!window.wp) {
			(window as any).wp = {};
		}
		(window as any).wpKernelData = {
			textDomain: 123, // Non-string
		};

		const result = detectNamespace({ mode: 'wp' });
		expect(result.source).toBe('fallback');
	});

	it('should handle wpKernelData with empty textDomain', () => {
		if (!window.wp) {
			(window as any).wp = {};
		}
		(window as any).wpKernelData = {
			textDomain: '   ', // Whitespace only
		};

		const result = detectNamespace({ mode: 'wp' });
		expect(result.source).toBe('fallback');
	});

	it('should skip DOM queries when wp is undefined', () => {
		// Ensure no wp object
		// window.wp is reset by setup-jest.ts afterEach

		const result = detectNamespace({ mode: 'heuristic' });
		expect(result.source).toBe('fallback');
	});
});

describe('extractFromPackageJson edge cases', () => {
	it('should handle package with non-string name', () => {
		setKernelPackage({ name: 123 as any });

		const result = detectNamespace();
		expect(result.source).toBe('fallback');
	});

	it('should handle scoped package with malformed name', () => {
		setKernelPackage({ name: '@' }); // Malformed scope

		const result = detectNamespace();
		expect(result.source).toBe('fallback');
	});

	it('should handle scoped package with empty package name', () => {
		setKernelPackage({ name: '@scope/' }); // Empty package name

		const result = detectNamespace();
		expect(result.source).toBe('fallback');
	});

	it('should handle process.cwd access in Node.js context', () => {
		// Mock process object
		if (!global.process) {
			(global as any).process = {
				cwd: () => '/some/path',
			};
		}

		const result = detectNamespace({ mode: 'auto' });
		// Should not crash, just return fallback since no package.json reading implemented
		expect(result.source).toBe('fallback');
	});
});

describe('validation and fallback edge cases', () => {
	it('should handle invalid fallback namespace', () => {
		const result = detectNamespace({
			fallback: '123invalid', // Invalid fallback
			validate: true,
		});
		expect(result.namespace).toBe('wpk'); // Should use 'wpk' when fallback invalid
		expect(result.source).toBe('fallback');
	});

	it('should handle validation disabled with invalid fallback', () => {
		const result = detectNamespace({
			fallback: '123invalid',
			validate: false,
		});
		expect(result.namespace).toBe('123invalid'); // Should use invalid fallback when validation off
		expect(result.source).toBe('fallback');
	});

	it('should handle validation disabled with valid build define', () => {
		Object.defineProperty(globalThis, '__WPK_NAMESPACE__', {
			value: '123-invalid',
			writable: true,
			configurable: true,
		});

		const result = detectNamespace({
			validate: false,
		});

		// Uses build define even when invalid if validation disabled
		expect(result.namespace).toBe('123-invalid');
		expect(result.source).toBe('build-define');

		// Cleanup
		delete (globalThis as any).__WPK_NAMESPACE__;
	});

	it('should handle validation disabled with valid module ID', () => {
		const result = detectNamespace({
			moduleId: 'wpk/valid-module',
			validate: false,
		});
		// Uses module ID even when validation disabled
		expect(result.namespace).toBe('valid-module');
		expect(result.source).toBe('module-id');
	});

	it('should handle validation disabled with package.json name', () => {
		Object.defineProperty(globalThis, '__WP_KERNEL_PACKAGE__', {
			value: { name: '@invalid/123-package' },
			writable: true,
			configurable: true,
		});

		const result = detectNamespace({
			validate: false,
		});

		// Uses package name even when invalid if validation disabled
		expect(result.namespace).toBe('123-package');
		expect(result.source).toBe('package-json');

		// Cleanup
		delete (globalThis as any).__WP_KERNEL_PACKAGE__;
	});

	it('should handle explicit namespace that falls through validation', () => {
		const result = detectNamespace({
			explicit: '  wp  ', // Reserved word with whitespace
			validate: true,
		});
		// Should fall through to auto-detection since explicit is invalid
		expect(result.source).toBe('fallback');
	});

	it('should handle explicit namespace in explicit mode with invalid fallback', () => {
		const result = detectNamespace({
			explicit: '123-invalid',
			mode: 'explicit',
			fallback: 'valid-fallback',
		});
		// Uses fallback when explicit is invalid and mode is explicit
		expect(result.namespace).toBe('valid-fallback');
		expect(result.source).toBe('fallback');
	});

	it('should handle cached result retrieval', () => {
		// First call
		const result1 = detectNamespace({ fallback: 'cached-test' });
		expect(result1.namespace).toBe('cached-test');

		// Second call should return cached result
		const result2 = detectNamespace({ fallback: 'cached-test' });
		expect(result2).toEqual(result1);
	});

	it('should handle cached result retrieval', () => {
		// First call
		const result1 = detectNamespace({ fallback: 'cached-test' });
		expect(result1.namespace).toBe('cached-test');

		// Second call should return cached result
		const result2 = detectNamespace({ fallback: 'cached-test' });
		expect(result2).toEqual(result1);
	});
	it('should handle cached result retrieval', () => {
		// First call creates cache
		setWpPluginData({ name: 'cached-test' });
		const result1 = detectNamespace({ mode: 'wp' });
		expect(result1.namespace).toBe('cached-test');

		// Second call should return cached result even if data changes
		setWpPluginData({ name: 'different-name' });
		const result2 = detectNamespace({ mode: 'wp' });
		expect(result2.namespace).toBe('cached-test'); // Cached result

		// Different options should bypass cache
		const result3 = detectNamespace({ mode: 'auto' });
		expect(result3.namespace).toBe('different-name'); // New cache entry
	});
});

describe('error handling and graceful degradation', () => {
	it('should handle DOM access errors in script tag detection', () => {
		// Mock querySelectorAll to throw
		const originalQuerySelectorAll = document.querySelectorAll;
		document.querySelectorAll = (() => {
			throw new Error('DOM access denied');
		}) as any;

		// Ensure WordPress environment
		if (!window.wp) {
			(window as any).wp = {};
		}

		const result = detectNamespace({ mode: 'heuristic' });
		expect(result.source).toBe('fallback'); // Should gracefully fall back

		// Restore
		document.querySelectorAll = originalQuerySelectorAll;
	});

	it('should handle body.className access errors', () => {
		// Mock body.className to throw when accessed
		const originalClassName = document.body.className;
		Object.defineProperty(document.body, 'className', {
			get() {
				throw new Error('className access denied');
			},
			configurable: true,
		});

		// Ensure WordPress environment
		if (!window.wp) {
			(window as any).wp = {};
		}

		const result = detectNamespace({ mode: 'heuristic' });
		expect(result.source).toBe('fallback');

		// Restore
		Object.defineProperty(document.body, 'className', {
			value: originalClassName,
			writable: true,
			configurable: true,
		});
	});

	it('should handle script.getAttribute errors', () => {
		// Create a script element that throws on getAttribute
		const script = document.createElement('script');
		script.getAttribute = () => {
			throw new Error('getAttribute error');
		};
		document.head.appendChild(script);

		// Ensure WordPress environment
		if (!window.wp) {
			(window as any).wp = {};
		}

		const result = detectNamespace({ mode: 'heuristic' });
		expect(result.source).toBe('fallback');

		// Clean up
		document.head.removeChild(script);
	});
});

describe('cache management edge cases', () => {
	it('should generate different cache keys for different options', () => {
		const options1 = { mode: 'wp' as const, validate: true };
		const options2 = { mode: 'wp' as const, validate: false };
		const options3 = { mode: 'auto' as const, validate: true };

		setWpPluginData({ name: 'test-cache' });

		// First call
		const result1 = detectNamespace(options1);
		expect(result1.namespace).toBe('test-cache');

		// Change data
		setWpPluginData({ name: 'changed-cache' });

		// Same options should return cached result
		const result2 = detectNamespace(options1);
		expect(result2.namespace).toBe('test-cache'); // Cached

		// Different validate option should bypass cache
		const result3 = detectNamespace(options2);
		expect(result3.namespace).toBe('changed-cache'); // New cache entry

		// Different mode should bypass cache
		const result4 = detectNamespace(options3);
		expect(result4.namespace).toBe('changed-cache'); // New cache entry
	});

	it('should handle cache key generation with complex options', () => {
		const complexOptions = {
			explicit: 'test',
			mode: 'heuristic' as const,
			runtime: 'admin' as const,
			moduleId: 'wpk/test',
			validate: true,
			fallback: 'custom-fallback',
		};

		const result = detectNamespace(complexOptions);
		expect(result.namespace).toBe('test');
		expect(result.source).toBe('explicit');

		// Should use cache on second call
		const result2 = detectNamespace(complexOptions);
		expect(result2).toEqual(result);
	});

	it('should handle resetNamespaceCache during operation', () => {
		setWpPluginData({ name: 'reset-test' });

		// Create cache entry
		const result1 = detectNamespace({ mode: 'wp' });
		expect(result1.namespace).toBe('reset-test');

		// Reset cache
		resetNamespaceCache();

		// Change data
		setWpPluginData({ name: 'after-reset' });

		// Should detect new data after cache reset
		const result2 = detectNamespace({ mode: 'wp' });
		expect(result2.namespace).toBe('after-reset');
	});
});
