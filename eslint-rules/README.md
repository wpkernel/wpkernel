# ESLint Rule: no-hardcoded-namespace-strings

## Purpose

Prevents namespace drift by enforcing usage of centralized namespace constants instead of hardcoded strings like `'wpk'`, `'wpk.action.start'`, `'kernel.policy'`, etc.

## Why This Matters

During Sprint 4.5, we discovered hardcoded namespace strings scattered across the codebase:

- Public API event names (`'wpk.action.start'`, `'wpk.resource.request'`, etc.)
- Subsystem namespaces (`'wpk.policy'`, `'kernel.policy'`)
- Infrastructure identifiers (`'wpk.actions'` BroadcastChannel)
- Namespace prefixes in string operations (`'wpk/'`, `'wpk.'`)

**Problems with hardcoded strings:**

1. Namespace drift when conventions change
2. Difficult refactoring (must search/replace all occurrences)
3. Unclear public API contract
4. Risk of typos
5. Inconsistent naming between modules

## What It Catches

### ✅ Detects

**Event Names (Public API):**

```typescript
// ❌ BAD
hooks.doAction('wpk.action.start', event);
hooks.doAction('wpk.resource.response', data);
hooks.doAction('wpk.cache.invalidated', { keys });

// ✅ GOOD
import { WPK_EVENTS } from '../namespace/constants';
hooks.doAction(WPK_EVENTS.ACTION_START, event);
hooks.doAction(WPK_EVENTS.RESOURCE_RESPONSE, data);
hooks.doAction(WPK_EVENTS.CACHE_INVALIDATED, { keys });
```

**Subsystem Namespaces:**

```typescript
// ❌ BAD
const reporter = createReporter({ namespace: 'wpk.policy' });
const logger = createReporter({ namespace: 'kernel.policy' }); // Legacy

// ✅ GOOD
import { WPK_SUBSYSTEM_NAMESPACES } from '../namespace/constants';
const reporter = createReporter({
	namespace: WPK_SUBSYSTEM_NAMESPACES.POLICY,
});
```

**Infrastructure Identifiers:**

```typescript
// ❌ BAD
const channel = new BroadcastChannel('wpk.actions');
channel.postMessage({ type: 'wpk.action.lifecycle', event });

// ✅ GOOD
import { WPK_INFRASTRUCTURE } from '../namespace/constants';
const channel = new BroadcastChannel(WPK_INFRASTRUCTURE.ACTIONS_CHANNEL);
channel.postMessage({
	type: WPK_INFRASTRUCTURE.ACTIONS_MESSAGE_TYPE_LIFECYCLE,
	event,
});
```

**Namespace Prefixes:**

```typescript
// ❌ BAD
if (moduleId.startsWith('wpk/')) {
	return moduleId.slice(4); // Magic number!
}

// ✅ GOOD
import { WPK_NAMESPACE } from '../namespace/constants';
const prefix = `${WPK_NAMESPACE}/`;
if (moduleId.startsWith(prefix)) {
	return moduleId.slice(prefix.length);
}
```

### ⏭️ Skips

1. **The constants file itself** (`packages/kernel/src/namespace/constants.ts`)
    - Where constants are defined

2. **Test files** (`__tests__/**`, `*.test.ts`, `*.spec.ts`)
    - Tests verify actual string values

3. **Markdown files** (`*.md`, `README.md`, `CHANGELOG.md`)
    - Documentation shows actual event names

4. **Comments and JSDoc**
    - Documentation references are allowed

## Error Messages

The rule provides specific suggestions based on what it finds:

```
Hardcoded namespace string "wpk.action.start" found.
Use WPK_EVENTS.ACTION_START from namespace/constants.ts instead.
```

```
Hardcoded namespace string "wpk.policy" found.
Use WPK_SUBSYSTEM_NAMESPACES.POLICY from namespace/constants.ts instead.
```

```
Hardcoded namespace string "wpk/" found.
Use `${WPK_NAMESPACE}/` or WPK_NAMESPACE constant from namespace/constants.ts instead.
```

## Implementation Details

### Detection Patterns

**Exact String Matches:**

- All values in `WPK_EVENTS`
- All values in `WPK_SUBSYSTEM_NAMESPACES`
- All values in `WPK_INFRASTRUCTURE`
- Legacy `'kernel.policy'`

**Prefix Patterns:**

- `'wpk/'` (module IDs, path prefixes)
- `'wpk.'` (event name prefixes)
- `'kernel.'` (legacy subsystem prefixes)

### AST Node Types

1. **`Literal` nodes** - String literals in code
2. **`TemplateLiteral` nodes** - Template string static parts

### Comment Handling

The rule checks if string literals fall within comment ranges and skips them:

```typescript
// ✅ Allowed in comments
/**
 * Emits wpk.action.start event before execution
 */

// ❌ Not allowed in code
hooks.doAction('wpk.action.start', event);
```

## Configuration

### In `eslint.config.js`:

```javascript
import noHardcodedNamespaceStrings from './eslint-rules/no-hardcoded-namespace-strings.js';

const kernelPlugin = {
	rules: {
		'no-hardcoded-namespace-strings': noHardcodedNamespaceStrings,
	},
};

export default [
	{
		plugins: {
			'@kernel': kernelPlugin,
		},
		rules: {
			'@kernel/no-hardcoded-namespace-strings': 'error',
		},
	},
];
```

## Benefits

1. **Single Source of Truth** - All namespace strings defined in one place
2. **TypeScript Autocomplete** - IDE suggests available constants
3. **Easy Refactoring** - Change once in constants.ts, affects everywhere
4. **Clear Public API** - WPK_EVENTS documents official event names
5. **Prevents Typos** - No more `'wpk.acton.start'` vs `'wpk.action.start'`
6. **Better Documentation** - Constants serve as API documentation

## Future Improvements

### Potential Auto-fix

Could add `fixable: 'code'` with transformation logic:

```javascript
meta: {
    fixable: 'code',
},

// In the report:
fix(fixer) {
    const replacement = getConstantReplacement(node.value);
    return fixer.replaceText(node, replacement);
}
```

### Additional Patterns

Could extend to catch:

- Hook namespace patterns in WordPress `add_action()` calls
- REST API route prefixes
- Custom namespace conventions in plugins

## Testing

### Manual Test

Create a file with violations:

```typescript
// test-namespace-violations.ts
export function bad() {
	hooks.doAction('wpk.action.start', {});
	const ns = 'wpk.policy';
	if (id.startsWith('wpk/')) return true;
}
```

Run ESLint:

```bash
pnpm lint test-namespace-violations.ts
```

Expected output:

```
error  Hardcoded namespace string "wpk.action.start" found.
       Use WPK_EVENTS.ACTION_START from namespace/constants.ts instead.

error  Hardcoded namespace string "wpk.policy" found.
       Use WPK_SUBSYSTEM_NAMESPACES.POLICY from namespace/constants.ts instead.

error  Hardcoded namespace string "wpk/" found.
       Use `${WPK_NAMESPACE}/` or WPK_NAMESPACE constant from namespace/constants.ts instead.
```

### Integration Test

The rule caught real violations during implementation:

- `actions/context.ts`: `'wpk.action.lifecycle'`, `'wpk.action.event'`
- `policy/context.ts`: `'kernel.policy'`
- `namespace/detect.ts`: `'wpk/'`
- `http/fetch.ts`: `'wpk.resource.request/response/error'`
- `resource/cache.ts`: `'wpk.cache.invalidated'`

All violations were fixed by using appropriate constants.

## Related

- **Constants File**: `packages/kernel/src/namespace/constants.ts`
- **PR**: #[number] - Centralize namespace constants
- **Issue**: Namespace drift discovered in Sprint 4.5 audit
- **Documentation**: Event taxonomy in `information/Event Taxonomy.md`
