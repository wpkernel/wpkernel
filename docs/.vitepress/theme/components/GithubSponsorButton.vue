<template>
	<div class="sponsor-hero-strip">
		<span class="sponsor-hero-text">
			Help keep WPKernel independent and actively developed.
		</span>

		<iframe
			class="sponsor-hero-button"
			src="https://github.com/sponsors/wpkernel/button"
			title="Sponsor WPKernel"
			height="32"
			width="114"
			loading="lazy"
		></iframe>
	</div>
</template>

<style scoped>
.sponsor-hero-button {
	border: 0;
	height: 32px;
	width: 114px;

	/* kill browser outline on the iframe itself */
	outline: none;
}

/* Optional: only show the ring for keyboard focus */
.sponsor-hero-strip:focus-within:not(:hover) {
	box-shadow: 0 0 0 2px
		color-mix(in srgb, var(--vp-c-brand-1) 80%, transparent);
}
</style>
