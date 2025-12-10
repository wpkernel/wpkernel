import { defineCapability } from '@wpkernel/core/capability';
import type { CapabilityHelpers } from '@wpkernel/core/capability';

export type CapabilityConfig = {};
export type CapabilityKey = keyof CapabilityConfig;
export type CapabilityRuntime = CapabilityHelpers<CapabilityConfig>;

export const capabilities = defineCapability<CapabilityConfig>({
	map: {},
});
