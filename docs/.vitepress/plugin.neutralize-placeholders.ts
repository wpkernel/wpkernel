import type MarkdownIt from 'markdown-it';

/**
 * Avoid treating placeholder-like tags (e.g. `<key>`) that sit tight against text
 * as real HTML, while keeping regular HTML components untouched.
 * This keeps authoring ergonomic without breaking VitePress' Vue transform.
 */
export function neutralizeInlinePlaceholders(md: MarkdownIt) {
	const allowedHtmlTags = new Set([
		'a',
		'abbr',
		'address',
		'area',
		'article',
		'aside',
		'audio',
		'b',
		'base',
		'bdi',
		'bdo',
		'blockquote',
		'body',
		'br',
		'button',
		'canvas',
		'caption',
		'cite',
		'code',
		'col',
		'colgroup',
		'data',
		'datalist',
		'dd',
		'del',
		'details',
		'dfn',
		'dialog',
		'div',
		'dl',
		'dt',
		'em',
		'embed',
		'fieldset',
		'figcaption',
		'figure',
		'footer',
		'form',
		'h1',
		'h2',
		'h3',
		'h4',
		'h5',
		'h6',
		'head',
		'header',
		'hr',
		'html',
		'i',
		'iframe',
		'img',
		'input',
		'ins',
		'kbd',
		'label',
		'legend',
		'li',
		'link',
		'main',
		'map',
		'mark',
		'menu',
		'meta',
		'meter',
		'nav',
		'noscript',
		'object',
		'ol',
		'optgroup',
		'option',
		'output',
		'p',
		'param',
		'picture',
		'pre',
		'progress',
		'q',
		'rp',
		'rt',
		'ruby',
		's',
		'samp',
		'script',
		'section',
		'select',
		'small',
		'source',
		'span',
		'strong',
		'style',
		'sub',
		'summary',
		'sup',
		'table',
		'tbody',
		'td',
		'template',
		'textarea',
		'tfoot',
		'th',
		'thead',
		'time',
		'title',
		'tr',
		'track',
		'u',
		'ul',
		'var',
		'video',
		'wbr',
	]);

	md.core.ruler.after('inline', 'neutralize-inline-placeholders', (state) => {
		for (const token of state.tokens) {
			if (token.type !== 'inline' || !token.children) continue;

			const { children } = token;

			for (let i = 0; i < children.length; i += 1) {
				const child = children[i];

				if (child.type !== 'html_inline') continue;

				// Only consider simple opening tags without attributes or slashes.
				if (!/^<[^>/\\s]+>$/.test(child.content)) continue;

				const tagName = child.content.slice(1, -1);
				const lower = tagName.toLowerCase();
				const looksCustom =
					tagName.includes('-') || /[A-Z]/.test(tagName);

				// Keep known HTML/custom component tags intact; escape placeholder-ish tags like <key>.
				if (allowedHtmlTags.has(lower) || looksCustom) continue;

				child.type = 'text';
				child.content = child.content
					.replace('<', '&lt;')
					.replace('>', '&gt;');
			}
		}
	});
}
