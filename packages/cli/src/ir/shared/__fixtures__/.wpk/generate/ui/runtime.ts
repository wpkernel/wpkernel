import type { WPKernelUIRuntime } from '@wpkernel/core/data';

let runtime: WPKernelUIRuntime | undefined;

export const adminScreenRuntime = {
	setUIRuntime(next: WPKernelUIRuntime) {
		runtime = next;
	},
	getUIRuntime() {
		return runtime;
	},
};
