<script lang="ts">
	import type { players } from '$lib/server/db/schema';

	let {
		players: playerList,
		currentPlayerId,
		currentTurnPlayerId
	}: {
		players: typeof players.$inferSelect[];
		currentPlayerId?: string | null;
		currentTurnPlayerId?: string | null;
	} = $props();
</script>

<div class="flex flex-col gap-2">
	<h3 class="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Players</h3>
	{#each playerList as player (player.id)}
		{@const isCurrentTurn = player.id === currentTurnPlayerId}
		{@const isMe = player.id === currentPlayerId}
		<div
			class="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors {isCurrentTurn ? 'bg-blue-500/20 border border-blue-400' : 'bg-zinc-800'}"
		>
			{#if isCurrentTurn}
				<span class="inline-block h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
			{:else}
				<span class="inline-block h-2 w-2 rounded-full bg-zinc-600"></span>
			{/if}
			<span class="text-sm {isCurrentTurn ? 'text-blue-300' : ''}">
				{player.displayName}
			</span>
			{#if isMe}
				<span class="ml-auto text-xs text-zinc-500">(you)</span>
			{/if}
		</div>
	{/each}
</div>
