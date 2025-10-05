/**
 * Namespace Detection Module
 *
 * Provides intelligent auto-detection of plugin/product namespaces
 * for the WP Kernel framework.
 *
 * @package
 */

export {
	WPK_NAMESPACE,
	WPK_SUBSYSTEM_NAMESPACES,
	WPK_INFRASTRUCTURE,
	type WPKSubsystemNamespace,
	type WPKInfrastructureConstant,
} from './constants.js';

export {
	detectNamespace,
	getNamespace,
	isValidNamespace,
	sanitizeNamespace,
	resetNamespaceCache,
	type NamespaceDetectionOptions,
	type NamespaceDetectionResult,
	type NamespaceDetectionMode,
	type NamespaceRuntimeContext,
} from './detect.js';
