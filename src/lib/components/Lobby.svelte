<script lang="ts">
	import type { players } from '$lib/server/db/schema';

	let {
		players: playerList,
		maxPlayers,
		isHost,
		onStartGame
	}: {
		players: typeof players.$inferSelect[];
		maxPlayers: number;
		isHost: boolean;
		onStartGame: () => void;
	} = $props();

	let starting = $state(false);
	let slotsLeft = $derived(maxPlayers - playerList.length);
	let allJoined = $derived(playerList.length >= maxPlayers);

	function handleClick() {
		starting = true;
		onStartGame();
	}
</script>

<div class="flex flex-col items-center gap-6">
	<div class="text-center">
		<h2 class="text-xl font-bold text-white">Waiting for players</h2>
		<p class="mt-1 text-zinc-400">
			{playerList.length}/{maxPlayers} joined
			{#if slotsLeft > 0}
				<span class="text-zinc-500">— {slotsLeft} slot{slotsLeft > 1 ? 's' : ''} left</span>
			{/if}
		</p>
	</div>

	<div class="flex flex-col gap-2 w-full max-w-xs">
		{#each playerList as player (player.id)}
			<div class="flex items-center gap-3 rounded-lg bg-zinc-800 px-4 py-3">
				<span class="text-zinc-500 text-sm">{player.joinOrder}</span>
				<span class="text-white">{player.displayName}</span>
				{#if player.id === playerList[0]?.id}
					<span class="ml-auto text-xs text-amber-400">host</span>
				{/if}
			</div>
		{/each}
		{#each Array(slotsLeft) as _, i (i)}
			<div class="flex items-center gap-3 rounded-lg border border-dashed border-zinc-700 px-4 py-3">
				<span class="text-zinc-600 text-sm">{playerList.length + i + 1}</span>
				<span class="text-zinc-600 text-sm italic">Waiting for player...</span>
			</div>
		{/each}
	</div>

	{#if allJoined && isHost}
		<button
			onclick={handleClick}
			disabled={starting}
			class="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
		>
			{starting ? 'Starting...' : 'Start Game'}
		</button>
	{:else if allJoined && !isHost}
		<p class="text-sm text-zinc-400">Waiting for host to start the game...</p>
	{:else if isHost}
		<p class="text-sm text-zinc-500">Waiting for all players to join...</p>
	{/if}
</div>
