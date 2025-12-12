[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceDataViewsMenuConfig

# Interface: ResourceDataViewsMenuConfig

Admin menu metadata for a generated DataViews screen.

When provided under `ui.admin.dataviews.screen.menu`, the CLI can emit
matching PHP shims to register the screen in the WordPress admin menu.

## Indexable

```ts
[key: string]: unknown
```

## Properties

### slug

```ts
slug: string;
```

---

### title

```ts
title: string;
```

---

### capability?

```ts
optional capability: string;
```

---

### parent?

```ts
optional parent: string;
```

---

### position?

```ts
optional position: number;
```
