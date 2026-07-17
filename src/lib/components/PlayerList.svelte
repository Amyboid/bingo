<script lang="ts">
	import type { players } from '$lib/server/db/schema';
	let { players: playerList, currentPlayerId, currentTurnPlayerId }: {
		players: typeof players.$inferSelect[]; currentPlayerId?: string | null; currentTurnPlayerId?: string | null;
	} = $props();
	const COLORS = ['#e07850', '#e8a838', '#7cb87a', '#6a9ecf', '#b07cc6'];
</script>

<div class="flex md:flex-col gap-2">
	<h3 class="text-[10px] sm:text-xs font-semibold text-[#aaa298] uppercase tracking-wider hidden md:block">Players</h3>
	{#each playerList as player, i (player.id)}
		{@const isTurn = player.id === currentTurnPlayerId}
		{@const isMe = player.id === currentPlayerId}
		<div class="flex items-center gap-2 sm:gap-3 rounded-xl px-3 py-2 transition-all duration-200 {isTurn ? 'bg-[#e8a838]/15 border-2 border-[#e8a838]/40' : 'bg-white/60 border border-[#d5cec4]'}">
			<div class="h-7 w-7 rounded-full flex items-center justify-center text-xs text-white shrink-0"
				style="background: {COLORS[i % COLORS.length]}; box-shadow: 0 2px 0 rgba(0,0,0,0.12);">
				{player.displayName[0].toUpperCase()}
			</div>
			<span class="text-xs sm:text-sm font-semibold truncate max-w-[80px] sm:max-w-none {isTurn ? 'text-[#c48a28]' : 'text-[#3d3428]'}">
				{player.displayName}
			</span>
			{#if isMe}<span class="ml-auto text-[10px] text-[#aaa298] hidden sm:inline">you</span>{/if}
			{#if isTurn}<div class="ml-auto h-2 w-2 rounded-full bg-[#e8a838] sm:hidden"></div>{/if}
		</div>
	{/each}
</div>
