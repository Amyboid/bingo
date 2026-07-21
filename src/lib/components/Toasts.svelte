<script lang="ts">
	import { toasts, dismissToast } from '$lib/toast';
</script>

<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
	{#each $toasts as toast (toast.id)}
		<div class="card relative pl-4 pr-8 py-3 border-l-4 {toast.type === 'error' ? 'border-secondary' : toast.type === 'success' ? 'border-success' : 'border-blue'}">
			<span class="text-base shrink-0">{#if toast.type === 'error'}<span class="text-secondary">✕</span>{:else if toast.type === 'success'}<span class="text-success">✓</span>{:else}<span class="text-blue">ℹ</span>{/if}</span>
			<span class="text-text">{toast.message}</span>
			<button onclick={() => dismissToast(toast.id)} class="absolute top-2 right-2 text-light-gray hover:text-text text-xs leading-none transition-colors" aria-label="Dismiss">&times;</button>
		</div>
	{/each}
</div>
