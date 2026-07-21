import { writable } from 'svelte/store';

export interface Toast {
	id: number;
	message: string;
	type: 'error' | 'success' | 'info';
}

let nextId = 0;
const MAX_TOASTS = 4;

export const toasts = writable<Toast[]>([]);

export function getErrorMessage(e: unknown, fallback: string): string {
	if (typeof e === 'string') return e;
	if (e instanceof Error) return e.message;
	if (typeof e === 'object' && e !== null) {
		const obj = e as Record<string, unknown>;
		if ('message' in obj && typeof obj.message === 'string') return obj.message;
		if ('error' in obj) return getErrorMessage(obj.error, fallback);
		if ('body' in obj) return getErrorMessage(obj.body, fallback);
		if ('detail' in obj && typeof obj.detail === 'string') return obj.detail;
		try { return JSON.stringify(e); } catch { /* ignore */ }
	}
	return fallback;
}

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
