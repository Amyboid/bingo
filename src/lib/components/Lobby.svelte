<script lang="ts">
	import type { players } from '$lib/server/db/schema';
	let { players: playerList, maxPlayers, winWord = 'BINGO', gridSize = 5, isHost, onStartGame }: {
		players: typeof players.$inferSelect[]; maxPlayers: number; winWord?: string; gridSize?: number; isHost: boolean; onStartGame: () => void;
	} = $props();
	let starting = $state(false);
	let slotsLeft = $derived(maxPlayers - playerList.length);
	let allJoined = $derived(playerList.length >= maxPlayers);
	function handleClick() { starting = true; onStartGame(); }
	const COLORS = ['bg-secondary', 'bg-primary', 'bg-success', 'bg-blue', 'bg-purple'];
</script>

<div class="flex flex-col items-center gap-6 sm:gap-8">
	<div class="text-center">
		<h2 class="text-2xl sm:text-3xl text-white" style="text-shadow: 0 3px 0 rgba(0,0,0,0.1);">Waiting for Players</h2>
		<p class="mt-2 text-text-light">
			<span class="font-bold text-text">{playerList.length}</span>/{maxPlayers} joined
			{#if slotsLeft > 0}<span class="text-muted"> — {slotsLeft} slot{slotsLeft > 1 ? 's' : ''} left</span>{/if}
		</p>
	</div>
	<div class="card flex items-center gap-3 px-4 py-2 text-sm text-text-light">
		<span>Win word: <span class="font-bold text-text">{winWord}</span></span>
		<span class="text-border">•</span>
		<span>Grid: <span class="font-bold text-text">{gridSize}×{gridSize}</span></span>
		<span class="text-border">•</span>
		<span>Win at: <span class="font-bold text-text">{gridSize} points</span></span>
	</div>
	<div class="flex flex-col gap-3 w-full max-w-xs">
		{#each playerList as player (player.id)}
			<div class="card flex items-center gap-3 px-4 py-3">
				<div class="h-9 w-9 rounded-full flex items-center justify-center text-sm text-white {COLORS[player.joinOrder - 1] ?? 'bg-gray'}"
					style="box-shadow: 0 2px 0 rgba(0,0,0,0.15);">
					{player.displayName[0].toUpperCase()}
				</div>
				<span class="font-semibold text-text">{player.displayName}</span>
				{#if player.id === playerList[0]?.id}
					<span class="ml-auto text-xs font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-full">HOST</span>
				{/if}
			</div>
		{/each}
		{#each Array(slotsLeft) as _, i (i)}
			<div class="card flex items-center gap-3 px-4 py-3 border-2 border-dashed border-border opacity-50">
				<div class="h-9 w-9 rounded-full bg-border flex items-center justify-center text-sm text-muted">{playerList.length + i + 1}</div>
				<span class="text-muted text-sm italic">Waiting...</span>
			</div>
		{/each}
	</div>
	{#if allJoined && isHost}
		<button onclick={handleClick} disabled={starting} class="btn btn-gold btn-lg">{starting ? 'Starting...' : 'Start Game'}</button>
	{:else if allJoined && !isHost}
		<p class="text-sm text-text-light animate-pulse">Waiting for host...</p>
	{:else if isHost}
		<p class="text-sm text-muted">Waiting for players...</p>
	{/if}
</div>
