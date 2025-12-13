[**@wpkernel/php-json-ast v0.12.6-beta.0**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / buildDocComment

# Function: buildDocComment()

```ts
function buildDocComment(lines, location): PhpDocComment;
```

Builds a PHP DocBlock comment node.

## Parameters

### lines

readonly `string`[]

An array of strings, where each string is a line of the docblock content.

### location

[`PhpCommentLocation`](../interfaces/PhpCommentLocation.md) = `{}`

Optional location information for the comment.

## Returns

[`PhpDocComment`](../type-aliases/PhpDocComment.md)

A `PhpDocComment` node.
