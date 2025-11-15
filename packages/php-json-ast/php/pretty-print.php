<?php

declare(strict_types=1);

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);

set_error_handler(
    static function (int $severity, string $message, string $file = '', int $line = 0): bool {
        if (($severity & (E_DEPRECATED | E_USER_DEPRECATED)) === 0) {
            return false;
        }

        $location = $file !== '' ? " in {$file}" : '';
        $lineInfo = $line > 0 ? " on line {$line}" : '';
        fwrite(STDERR, "Deprecated: {$message}{$location}{$lineInfo}\n");

        return true;
    }
);

if ($argc < 3) {
    fwrite(STDERR, "Usage: php pretty-print.php <workspace-root> <file>\n");
    exit(1);
}

$workspaceRoot = $argv[1];
$targetFile = $argv[2];
$traceFile = resolveTraceFilePath();
$autoloadOverride = resolveAutoloadOverride();
$autoloadPath = loadPhpParserAutoloadPath(
    $workspaceRoot,
    [
        buildAutoloadPathFromRoot(
            dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'cli'
        ),
        buildAutoloadPathFromRoot(
            dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'php-json-ast'
        ),
        buildAutoloadPathFromRoot(__DIR__ . '/..'),
        buildAutoloadPathFromRoot(dirname(__DIR__, 2)),
    ],
    $autoloadOverride
);

recordTrace($traceFile, [
    'event' => 'boot',
    'targetFile' => $targetFile,
    'autoloadPath' => $autoloadPath,
]);

require_once $autoloadPath;

recordTrace($traceFile, [
    'event' => 'start',
    'targetFile' => $targetFile,
    'autoloadPath' => $autoloadPath,
]);

use PhpParser\Error;
use PhpParser\JsonDecoder;
use PhpParser\PrettyPrinter\Standard;

$rawInput = stream_get_contents(STDIN);

if ($rawInput === false) {
    fwrite(STDERR, "Failed to read AST payload for {$targetFile}.\n");
    exit(1);
}

$payload = json_decode($rawInput, true);

if (!is_array($payload)) {
    fwrite(STDERR, "Invalid payload: expected JSON object for {$targetFile}.\n");
    exit(1);
}

$decoder = new JsonDecoder();
$astPayload = $payload['ast'] ?? null;

if (!is_string($astPayload) && !is_array($astPayload)) {
    fwrite(STDERR, "AST payload missing for {$targetFile}.\n");
    exit(1);
}

$astEncoderFlags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;

if (is_string($astPayload)) {
    $decodedAst = json_decode($astPayload, true);
    if (!is_array($decodedAst)) {
        fwrite(STDERR, "Failed to decode AST payload for {$targetFile}.\n");
        exit(1);
    }
} else {
    $decodedAst = $astPayload;
}

try {
    $normalisedAst = normaliseInputValue($decodedAst);
} catch (RuntimeException $exception) {
    fwrite(
        STDERR,
        'Invalid AST payload for ' . $targetFile . ': ' . $exception->getMessage() . "\n"
    );
    exit(1);
}

$astJson = json_encode($normalisedAst, $astEncoderFlags);
if ($astJson === false) {
    fwrite(STDERR, "Failed to encode AST payload for {$targetFile}.\n");
    exit(1);
}

try {
    $statements = $decoder->decode($astJson);
    if (!is_array($statements)) {
        fwrite(STDERR, "Decoded AST payload did not yield statements for {$targetFile}.\n");
        exit(1);
    }
} catch (Error $error) {
    fwrite(
        STDERR,
        "Failed to decode AST payload for {$targetFile}: {$error->getMessage()}\n"
    );
    exit(1);
}

$printer = new Standard();
$output = normalizeDeclareSpacing($printer->prettyPrintFile($statements));

$encoderFlags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
$astJson = json_encode($statements, $encoderFlags);

if ($astJson === false) {
    fwrite(STDERR, "Failed to encode AST for {$targetFile}: " . json_last_error_msg() . "\n");
    exit(1);
}

$astPayload = json_decode($astJson, true);

if (!is_array($astPayload)) {
    fwrite(STDERR, "Failed to decode AST payload for {$targetFile}.\n");
    exit(1);
}

try {
    $astPayload = normaliseOutputValue($astPayload);
} catch (RuntimeException $exception) {
    fwrite(
        STDERR,
        'Failed to normalise printer output for ' . $targetFile . ': ' . $exception->getMessage() . "\n"
    );
    exit(1);
}

$result = [
    'code' => ensureTrailingNewline($output),
    'ast' => $astPayload,
];

$resultJson = json_encode($result, $encoderFlags);

if ($resultJson === false) {
    fwrite(STDERR, "Failed to encode printer result for {$targetFile}.\n");
    exit(1);
}

recordTrace($traceFile, [
    'event' => 'success',
    'targetFile' => $targetFile,
]);

echo $resultJson . "\n";

/**
 * @param mixed $value
 * @return mixed
 */
function normaliseInputValue(mixed $value): mixed
{
    if (is_array($value)) {
        if (array_is_list($value)) {
            return array_map('normaliseInputValue', $value);
        }

        $normalised = [];
        foreach ($value as $key => $child) {
            $normalised[$key] = normaliseInputValue($child);
        }

        if (isset($normalised['nodeType']) && is_string($normalised['nodeType'])) {
            $normalised = normaliseInputNode($normalised);
        }

        return $normalised;
    }

    return $value;
}

/**
 * @param array<string, mixed> $node
 * @return array<string, mixed>
 */
function normaliseInputNode(array $node): array
{
    switch ($node['nodeType']) {
        case 'Name':
        case 'Name_FullyQualified':
        case 'Name_Relative':
            return convertNamePartsToString($node);
    }

    return $node;
}

/**
 * @param array<string, mixed> $node
 * @return array<string, mixed>
 */
function convertNamePartsToString(array $node): array
{
    if (!isset($node['parts'])) {
        throw new RuntimeException('Name nodes must declare parts.');
    }

    if (!is_array($node['parts']) || !array_is_list($node['parts'])) {
        throw new RuntimeException('Name node parts must be provided as an ordered list.');
    }

    $parts = [];
    foreach ($node['parts'] as $index => $part) {
        if (!is_string($part) || $part === '') {
            throw new RuntimeException(
                sprintf('Name parts must be non-empty strings (index %d).', $index)
            );
        }

        $parts[] = $part;
    }

    $node['name'] = implode('\\', $parts);
    unset($node['parts']);

    return $node;
}

/**
 * @param mixed $value
 * @return mixed
 */
function normaliseOutputValue(mixed $value): mixed
{
    if (is_array($value)) {
        if (array_is_list($value)) {
            return array_map('normaliseOutputValue', $value);
        }

        $normalised = [];
        foreach ($value as $key => $child) {
            $normalised[$key] = normaliseOutputValue($child);
        }

        if (isset($normalised['nodeType']) && is_string($normalised['nodeType'])) {
            $normalised = normaliseOutputNode($normalised);
        }

        return $normalised;
    }

    return $value;
}

/**
 * @param array<string, mixed> $node
 * @return array<string, mixed>
 */
function normaliseOutputNode(array $node): array
{
    switch ($node['nodeType']) {
        case 'Name':
        case 'Name_FullyQualified':
        case 'Name_Relative':
            return ensureNameParts($node);
    }

    return $node;
}

/**
 * @param array<string, mixed> $node
 * @return array<string, mixed>
 */
function ensureNameParts(array $node): array
{
    if (isset($node['name']) && is_string($node['name'])) {
        $node['parts'] = explode('\\', $node['name']);
    }

    if (!isset($node['parts']) || !is_array($node['parts']) || !array_is_list($node['parts'])) {
        throw new RuntimeException('Name nodes must provide a parts array.');
    }

    $parts = [];
    foreach ($node['parts'] as $index => $part) {
        if (!is_string($part) || $part === '') {
            throw new RuntimeException(
                sprintf('Name parts must be non-empty strings (index %d).', $index)
            );
        }

        $parts[] = $part;
    }

    $node['parts'] = $parts;

    if (array_key_exists('name', $node)) {
        if (isset($node['name']) && !is_string($node['name'])) {
            throw new RuntimeException('Name nodes must not expose non-string name properties.');
        }

        unset($node['name']);
    }

    return $node;
}

function ensureTrailingNewline(string $value): string
{
    return str_ends_with($value, "\n") ? $value : $value . "\n";
}

function normalizeDeclareSpacing(string $value): string
{
    $normalized = preg_replace('/\bdeclare\s+\(/', 'declare(', $value);
    return is_string($normalized) ? $normalized : $value;
}

/**
 * @param list<string> $additionalCandidates
 */
function loadPhpParserAutoloadPath(
    string $workspaceRoot,
    array $additionalCandidates = [],
    ?string $override = null
): string
{
    $candidates = buildAutoloadCandidateList(
        $workspaceRoot,
        $additionalCandidates,
        $override
    );
    $missingPaths = [];

    foreach ($candidates as $candidate) {
        if (!is_file($candidate)) {
            $missingPaths[] = $candidate;
            continue;
        }

        require_once $candidate;
        if (class_exists(\PhpParser\JsonDecoder::class, true)) {
            return $candidate;
        }

        $missingPaths[] = $candidate;
    }

    fwrite(
        STDERR,
        "nikic/php-parser not found via any autoload path. Checked:\n"
    );
    foreach ($missingPaths as $candidate) {
        fwrite(STDERR, " - {$candidate}\n");
    }

    exit(1);
}

/**
 * @param list<string> $additionalCandidates
 */
function resolveAutoloadPath(
    string $workspaceRoot,
    array $additionalCandidates = [],
    ?string $override = null
): string
{
    $candidates = buildAutoloadCandidateList(
        $workspaceRoot,
        $additionalCandidates,
        $override
    );

    foreach ($candidates as $candidate) {
        if (is_file($candidate)) {
            return $candidate;
        }
    }

    fwrite(STDERR, "Composer autoload not found at any of the following paths:\n");
    foreach ($candidates as $candidate) {
        fwrite(STDERR, " - {$candidate}\n");
    }

    exit(1);
}

/**
 * @param list<string> $additionalCandidates
 * @return list<string>
 */
function buildAutoloadCandidateList(
    string $workspaceRoot,
    array $additionalCandidates = [],
    ?string $override = null
): array
{
    $candidates = array_merge(
        $override !== null ? [$override] : [],
        [buildAutoloadPathFromRoot($workspaceRoot)],
        buildAutoloadCandidatesFromEnv(),
        $additionalCandidates,
    );

    return array_values(
        array_unique(
            array_filter(
                $candidates,
                static fn(string $candidate): bool => $candidate !== ''
            )
        )
    );
}

function resolveAutoloadOverride(): ?string
{
    $value = getenv('WPK_PHP_AUTOLOAD');
    if (!is_string($value)) {
        return null;
    }

    $trimmed = trim($value);
    if ($trimmed === '') {
        return null;
    }

    return $trimmed;
}

function buildAutoloadPathFromRoot(string $root): string
{
    $normalizedRoot = rtrim($root, DIRECTORY_SEPARATOR);
    if ($normalizedRoot === '') {
        return '';
    }

    return $normalizedRoot . DIRECTORY_SEPARATOR . 'vendor' . DIRECTORY_SEPARATOR . 'autoload.php';
}

/**
 * @return list<string>
 */
function buildAutoloadCandidatesFromEnv(): array
{
    $paths = getenv('WPK_PHP_AUTOLOAD_PATHS');
    if (!is_string($paths) || $paths === '') {
        $paths = getenv('PHP_DRIVER_AUTOLOAD_PATHS');
    }

    if (!is_string($paths) || $paths === '') {
        return [];
    }

    $candidates = [];
    foreach (explode(PATH_SEPARATOR, $paths) as $candidate) {
        $trimmed = trim($candidate);
        if ($trimmed !== '') {
            $candidates[] = $trimmed;
        }
    }

    return $candidates;
}

/**
 * @return string|null
 */
function resolveTraceFilePath(): ?string
{
    $value = getenv('PHP_DRIVER_TRACE_FILE');
    if (!is_string($value) || $value === '') {
        return null;
    }

    return $value;
}

/**
 * @param array<string, mixed> $payload
 */
function recordTrace(?string $traceFile, array $payload): void
{
    if ($traceFile === null) {
        return;
    }

    $dir = dirname($traceFile);
    if (!is_dir($dir)) {
        @mkdir($dir, 0777, true);
    }

    $encoded = json_encode($payload, JSON_UNESCAPED_SLASHES);
    if ($encoded === false) {
        return;
    }

    @file_put_contents($traceFile, $encoded . PHP_EOL, FILE_APPEND);
}
