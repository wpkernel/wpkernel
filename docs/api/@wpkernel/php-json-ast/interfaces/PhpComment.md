[**@wpkernel/php-json-ast v0.12.3-beta.2**](../README.md)

***

[@wpkernel/php-json-ast](../README.md) / PhpComment

# Interface: PhpComment

Represents a generic PHP comment.

## Extends

- [`PhpCommentLocation`](PhpCommentLocation.md)

## Properties

### nodeType

```ts
readonly nodeType: "Comment" | `Comment_${string}`;
```

***

### text

```ts
readonly text: string;
```

***

### endFilePos?

```ts
readonly optional endFilePos: number;
```

#### Inherited from

[`PhpCommentLocation`](PhpCommentLocation.md).[`endFilePos`](PhpCommentLocation.md#endfilepos)

***

### endLine?

```ts
readonly optional endLine: number;
```

#### Inherited from

[`PhpCommentLocation`](PhpCommentLocation.md).[`endLine`](PhpCommentLocation.md#endline)

***

### endTokenPos?

```ts
readonly optional endTokenPos: number;
```

#### Inherited from

[`PhpCommentLocation`](PhpCommentLocation.md).[`endTokenPos`](PhpCommentLocation.md#endtokenpos)

***

### filePos?

```ts
readonly optional filePos: number;
```

#### Inherited from

[`PhpCommentLocation`](PhpCommentLocation.md).[`filePos`](PhpCommentLocation.md#filepos)

***

### line?

```ts
readonly optional line: number;
```

#### Inherited from

[`PhpCommentLocation`](PhpCommentLocation.md).[`line`](PhpCommentLocation.md#line)

***

### tokenPos?

```ts
readonly optional tokenPos: number;
```

#### Inherited from

[`PhpCommentLocation`](PhpCommentLocation.md).[`tokenPos`](PhpCommentLocation.md#tokenpos)
