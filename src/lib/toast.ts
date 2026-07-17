import { writable } from 'svelte/store';

export interface Toast {
	id: number;
	message: string;
	type: 'error' | 'success' | 'info';
}

let nextId = 0;
const MAX_TOASTS = 4;

export const toasts = writable<Toast[]>([]);

export function showToast(message: string, type: Toast['type'] = 'error', duration = 3000) {
	const id = nextId++;
	toasts.update((t) => {
		const updated = [...t, { id, message, type }];
		// Keep only the latest MAX_TOASTS
		return updated.length > MAX_TOASTS ? updated.slice(-MAX_TOASTS) : updated;
	});
	setTimeout(() => {
		toasts.update((t) => t.filter((toast) => toast.id !== id));
	}, duration);
}

export function dismissToast(id: number) {
	toasts.update((t) => t.filter((toast) => toast.id !== id));
}
