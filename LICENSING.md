# WP Kernel Licensing Guide

## Overview

WP Kernel uses a **dual licensing structure** to balance business needs with WordPress ecosystem requirements.

## Framework License: EUPL-1.2

### What's Covered

- `packages/kernel` - Core framework
- `packages/ui` - UI components
- `packages/cli` - Command-line tools
- `packages/e2e-utils` - Testing utilities

### Why EUPL-1.2?

- **Business-friendly**: Allows commercial use without forced GPL licensing
- **Copyleft protection**: Modifications must be shared back
- **EU standard**: Well-vetted, legally sound
- **Compatible with**: MIT, Apache 2.0, GPL (with compatibility clause)

### What This Means for Your Product

✓ You **CAN**:

- Build commercial WordPress products using WP Kernel
- Keep your product code under your chosen license (MIT, GPL, proprietary)
- Sell your products without sharing your business logic
- Use WP Kernel in SaaS products

✗ You **MUST**:

- Keep the WP Kernel framework code under EUPL-1.2
- Share modifications to the framework itself
- Include copyright notices for WP Kernel

### Example: Commercial WordPress Plugin

```
your-plugin/
├── your-plugin.php          # Your code (your license choice)
├── includes/                # Your code (your license choice)
├── vendor/
│   └── geekist/
│       └── wp-kernel/       # EUPL-1.2 (framework code)
└── LICENSE.txt              # Your license (GPL-2.0+ for .org)
```

**Your plugin code**: Can be GPL-2.0+, MIT, or even proprietary (for premium versions)
**WP Kernel framework**: Remains EUPL-1.2
**Result**: Your business logic stays yours, framework improvements are shared

---

## Showcase App License: GPL-2.0-or-later

### What's Covered

- `app/showcase` - Example WordPress plugin

### Why GPL-2.0-or-later?

- **WordPress requirement**: All plugins on wordpress.org MUST be GPL-compatible
- **Derivative work**: WordPress itself is GPL-2.0, plugins are derivatives
- **Example/demo code**: Meant to be copied, modified, learned from

### What This Means

✓ The showcase app:

- Can be published to wordpress.org
- Can be freely copied and modified
- Serves as GPL-licensed example code
- Shows how to use EUPL-1.2 framework in GPL products

✗ This does NOT mean:

- Your products must be GPL
- You must open-source your business logic
- You can't build commercial products

---

## Why This Structure Works

### For Businesses

- **Framework is reusable**: EUPL-1.2 allows use in any product
- **Your code stays yours**: Only framework modifications must be shared
- **Commercial viable**: Build and sell products without forced GPL
- **WordPress compatible**: Showcase proves GPL integration works

### For the Ecosystem

- **Framework improvements shared**: EUPL copyleft ensures contributions
- **WordPress compliance**: Showcase app follows .org requirements
- **Clear boundaries**: Easy to understand what's what
- **Best of both worlds**: Business-friendly + community-friendly

---

## FAQ

### Q: Can I build a commercial WordPress plugin with WP Kernel?

**A**: Yes! Your plugin code can be any license (including proprietary). The framework stays EUPL-1.2.

### Q: Do I have to open-source my entire plugin?

**A**: No. Only if you want to publish on wordpress.org (which requires GPL). Premium versions can be closed-source.

### Q: What if I modify the WP Kernel framework?

**A**: Framework modifications must be shared under EUPL-1.2. Your application code is unaffected.

### Q: Can I publish my plugin to wordpress.org?

**A**: Yes! License your plugin as GPL-2.0+, use WP Kernel as a dependency. The showcase app demonstrates this pattern.

### Q: Is this legally sound?

**A**: Yes. EUPL-1.2 is GPL-compatible via Article 5. Many WordPress products use similar structures (e.g., Composer packages).

### Q: What about split licensing for premium versions?

**A**: Common pattern:

- **Free version**: GPL-2.0+ (on wordpress.org)
- **Premium version**: Proprietary license (your code) + EUPL-1.2 (framework)
- **Framework**: Always EUPL-1.2

---

## Practical Examples

### Example 1: Free Plugin on wordpress.org

```php
/**
 * Plugin Name: My Awesome Plugin
 * License: GPL-2.0-or-later
 */

// Uses WP Kernel (EUPL-1.2) - this is fine!
use Geekist\WPKernel\Resource\defineResource;

// Your GPL code
function my_plugin_init() {
    $job = defineResource(...); // Framework code (EUPL-1.2)
    // Your business logic (GPL-2.0+)
}
```

### Example 2: Premium Commercial Plugin

```php
/**
 * Plugin Name: My Premium Plugin
 * License: Proprietary (Commercial License)
 */

// Your premium code stays closed-source
// WP Kernel framework (EUPL-1.2) is included as dependency
// This is allowed because EUPL-1.2 permits use in commercial products
```

### Example 3: SaaS Product

```javascript
// Your SaaS application code (any license)
import { defineResource } from '@geekist/wp-kernel'; // EUPL-1.2

// Your proprietary business logic
export class MySaaSFeature {
	// Closed-source is fine
}
```

---

## License Texts

### Framework (EUPL-1.2)

See: [`LICENSE`](./LICENSE)

### Showcase App (GPL-2.0-or-later)

See: [`app/showcase/LICENSE-GPL.txt`](./app/showcase/LICENSE-GPL.txt)

---

## Questions?

If you're unsure about licensing for your use case:

1. Check the examples above
2. Consult with a lawyer (we can't provide legal advice)
3. Open a discussion on GitHub
4. Remember: Framework modifications = EUPL-1.2, Your code = Your choice

---

**Last Updated**: October 3, 2025  
**Framework License**: EUPL-1.2  
**Showcase License**: GPL-2.0-or-later
