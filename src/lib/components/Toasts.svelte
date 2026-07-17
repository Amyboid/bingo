<script lang="ts">
	import { toasts, dismissToast } from '$lib/toast';
</script>

<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-h-[calc(100vh-2rem)] overflow-hidden">
	{#each $toasts as toast (toast.id)}
		<div
			class="pointer-events-auto rounded-lg px-4 py-3 pr-8 text-sm font-medium shadow-lg animate-slide-in relative max-w-sm
				{toast.type === 'error' ? 'bg-red-500/90 text-white' : ''}
				{toast.type === 'success' ? 'bg-green-500/90 text-white' : ''}
				{toast.type === 'info' ? 'bg-zinc-700/90 text-white' : ''}"
		>
			{toast.message}
			<button
				onclick={() => dismissToast(toast.id)}
				class="absolute top-2 right-2 text-white/60 hover:text-white text-xs leading-none"
				aria-label="Dismiss"
			>
				&times;
			</button>
		</div>
	{/each}
</div>

<style>
	@keyframes slide-in {
		from {
			opacity: 0;
			transform: translateX(20px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
	.animate-slide-in {
		animation: slide-in 0.2s ease-out;
	}
</style>
