<?php
/**
 * Plugin Name: WP Kernel Showcase
 * Plugin URI: https://github.com/theGeekist/wp-kernel
 * Description: Demonstrates WP Kernel framework features using Script Modules and modern WordPress APIs
 * Version: 0.3.0
 * Requires at least: 6.8
 * Requires PHP: 8.1
 * Author: Geekist
 * Author URI: https://github.com/theGeekist
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: wp-kernel-showcase
 * Domain Path: /languages
 *
 * @package WPKernelShowcase
 */

namespace WPKernel\Showcase;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Plugin constants.
\define( 'WPK_SHOWCASE_VERSION', '0.3.0' );
\define( 'WPK_SHOWCASE_FILE', __FILE__ );
\define( 'WPK_SHOWCASE_PATH', \plugin_dir_path( __FILE__ ) );
\define( 'WPK_SHOWCASE_URL', \plugin_dir_url( __FILE__ ) );

/**
 * Autoload classes.
 *
 * @param string $class Class name.
 */
function autoload( string $class ): void {
	// Only autoload classes in our namespace.
	if ( strpos( $class, 'WPKernel\\Showcase\\' ) !== 0 ) {
		return;
	}

	// Convert namespace to file path.
	$class = str_replace( 'WPKernel\\Showcase\\', '', $class );
	$class = str_replace( '\\', '/', $class );
	$file  = WPK_SHOWCASE_PATH . 'includes/class-' . strtolower( str_replace( '_', '-', $class ) ) . '.php';

	// Handle nested namespaces (e.g., REST\Jobs_Controller).
	if ( strpos( $class, '/' ) !== false ) {
		$parts = explode( '/', $class );
		$class = array_pop( $parts );
		$path  = strtolower( implode( '/', $parts ) );
		$file  = WPK_SHOWCASE_PATH . 'includes/' . $path . '/class-' . strtolower( str_replace( '_', '-', $class ) ) . '.php';
	}

	if ( file_exists( $file ) ) {
		require_once $file;
	}
}

\spl_autoload_register( __NAMESPACE__ . '\\autoload' );

/**
 * Get the entry file from Vite manifest.
 *
 * @return string Entry file path relative to build directory.
 */
function get_vite_entry_file(): string {
	static $entry_file = null;

	if ( null !== $entry_file ) {
		return $entry_file;
	}

	$manifest_path = WPK_SHOWCASE_PATH . 'build/manifest.json';

	if ( ! file_exists( $manifest_path ) ) {
		// Fallback to default if manifest doesn't exist (dev mode).
		$entry_file = 'index.js';
		return $entry_file;
	}

	$manifest = json_decode( file_get_contents( $manifest_path ), true );

	if ( isset( $manifest['src/index.ts']['file'] ) ) {
		$entry_file = $manifest['src/index.ts']['file'];
	} else {
		// Fallback to default.
		$entry_file = 'index.js';
	}

	return $entry_file;
}

/**
 * Initialize the plugin.
 *
 * Registers Script Modules and enqueues them with proper import maps.
 */
function init(): void {
	// Register the main showcase script once.
	\wp_register_script(
		'wp-kernel-showcase',
		WPK_SHOWCASE_URL . 'build/' . get_vite_entry_file(),
		array(
			'react',
			'react-dom',
			'wp-element',
			'wp-components',
			'wp-data',
			'wp-i18n',
			'wp-api-fetch',
			'wp-hooks',
		),
		WPK_SHOWCASE_VERSION,
		true
	);

	// Enqueue on the front-end for demonstration.
	\add_action(
		'wp_enqueue_scripts',
		function () {
			\wp_enqueue_script( 'wp-kernel-showcase' );
		}
	);

	// Enqueue in admin as a classic script; script modules + admin still have layout issues.
	\add_action(
		'admin_enqueue_scripts',
		function () {
			\wp_enqueue_script( 'wp-kernel-showcase' );
		}
	);
}

\add_action( 'init', __NAMESPACE__ . '\\init' );

/**
 * Register admin menu and pages.
 */
function register_admin_menu(): void {
	\add_menu_page(
		__( 'Jobs', 'wp-kernel-showcase' ),
		__( 'Jobs', 'wp-kernel-showcase' ),
		'manage_options',
		'wpk-jobs',
		__NAMESPACE__ . '\\render_admin_page',
		'dashicons-businessman',
		30
	);
}

\add_action( 'admin_menu', __NAMESPACE__ . '\\register_admin_menu' );

/**
 * Render the admin page.
 *
 * Prints the React mount point. The Script Module detects it and loads the admin UI.
 * This is the minimal PHP that Sprint 5's mountAdmin() will replace.
 */
function render_admin_page(): void {
	// Print the mount point for React.
	// The main script module will detect this and dynamically import admin UI.
	echo '<div id="wpk-admin-root"></div>';
}

/**
 * Register REST API routes.
 */
function register_rest_routes(): void {
	$controllers = array(
		new REST\Jobs_Controller(),
	);

	foreach ( $controllers as $controller ) {
		$controller->register_routes();
	}
}

\add_action( 'rest_api_init', __NAMESPACE__ . '\\register_rest_routes' );

/**
 * Activation hook.
 */
function activate(): void {
	// Flush rewrite rules on activation.
	\flush_rewrite_rules();
}

\register_activation_hook( __FILE__, __NAMESPACE__ . '\\activate' );

/**
 * Deactivation hook.
 */
function deactivate(): void {
	// Flush rewrite rules on deactivation.
	\flush_rewrite_rules();
}

\register_deactivation_hook( __FILE__, __NAMESPACE__ . '\\deactivate' );
