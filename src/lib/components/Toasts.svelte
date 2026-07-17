<script lang="ts">
	import { toasts, dismissToast } from '$lib/toast';
</script>

<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-h-[calc(100vh-2rem)] overflow-hidden">
	{#each $toasts as toast (toast.id)}
		<div class="pointer-events-auto card flex items-center gap-3 px-4 py-3 pr-8 text-sm shadow-lg animate-pop relative max-w-sm border-l-4
			{toast.type === 'error' ? 'border-[#e07850]' : ''}{toast.type === 'success' ? 'border-[#7cb87a]' : ''}{toast.type === 'info' ? 'border-[#6a9ecf]' : ''}">
			<span class="text-base shrink-0">{#if toast.type === 'error'}<span class="text-[#e07850]">✕</span>{:else if toast.type === 'success'}<span class="text-[#7cb87a]">✓</span>{:else}<span class="text-[#6a9ecf]">ℹ</span>{/if}</span>
			<span class="text-[#3d3428]">{toast.message}</span>
			<button onclick={() => dismissToast(toast.id)} class="absolute top-2 right-2 text-[#bbb] hover:text-[#3d3428] text-xs leading-none transition-colors" aria-label="Dismiss">&times;</button>
		</div>
	{/each}
</div>
