<script lang="ts">
	import type { players } from '$lib/server/db/schema';
	let { players: playerList, currentPlayerId, hostId }: {
		players: typeof players.$inferSelect[]; currentPlayerId: string | null; hostId: string;
	} = $props();
</script>

<div class="flex flex-col gap-2 w-full">
	<h3 class="text-[10px] sm:text-xs font-semibold text-muted uppercase tracking-wider hidden md:block">Players</h3>
	{#each playerList as player (player.id)}
		{@const isMe = player.id === currentPlayerId}
		<div class="flex items-center gap-2 sm:gap-3 rounded-xl px-3 py-2 bg-white/60 border border-border">
			<div class="h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-xs sm:text-sm text-white
				{player.joinOrder === 1 ? 'bg-secondary' : player.joinOrder === 2 ? 'bg-primary' : player.joinOrder === 3 ? 'bg-success' : player.joinOrder === 4 ? 'bg-blue' : 'bg-purple'}"
				style="box-shadow: 0 2px 0 rgba(0,0,0,0.15);">
				{player.displayName[0].toUpperCase()}
			</div>
			<span class="text-xs sm:text-sm font-semibold truncate max-w-[80px] sm:max-w-none text-text">
				{player.displayName}{isMe ? ' (you)' : ''}
			</span>
			{#if player.id === hostId}<span class="text-[9px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">HOST</span>{/if}
			{#if isMe}<span class="ml-auto text-[10px] text-muted hidden sm:inline">you</span>{/if}
		</div>
	{/each}
</div>
