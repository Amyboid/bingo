<script lang="ts">
	import type { players } from '$lib/server/db/schema';
	let { players: playerList, maxPlayers, winWord = 'BINGO', gridSize = 5, isHost, onStartGame }: {
		players: typeof players.$inferSelect[]; maxPlayers: number; winWord?: string; gridSize?: number; isHost: boolean; onStartGame: () => void;
	} = $props();
	let starting = $state(false);
	let slotsLeft = $derived(maxPlayers - playerList.length);
	let allJoined = $derived(playerList.length >= maxPlayers);
	function handleClick() { starting = true; onStartGame(); }
	const COLORS = ['#e07850', '#e8a838', '#7cb87a', '#6a9ecf', '#b07cc6'];
</script>

<div class="flex flex-col items-center gap-6 sm:gap-8">
	<div class="text-center">
		<h2 class="text-2xl sm:text-3xl text-white" style="text-shadow: 0 3px 0 rgba(0,0,0,0.1);">Waiting for Players</h2>
		<p class="mt-2 text-[#7a6e60]">
			<span class="font-bold text-[#3d3428]">{playerList.length}</span>/{maxPlayers} joined
			{#if slotsLeft > 0}<span class="text-[#aaa298]"> — {slotsLeft} slot{slotsLeft > 1 ? 's' : ''} left</span>{/if}
		</p>
	</div>
	<div class="card flex items-center gap-3 px-4 py-2 text-sm text-[#7a6e60]">
		<span>Win word: <span class="font-bold text-[#3d3428]">{winWord}</span></span>
		<span class="text-[#d5cec4]">•</span>
		<span>Grid: <span class="font-bold text-[#3d3428]">{gridSize}×{gridSize}</span></span>
		<span class="text-[#d5cec4]">•</span>
		<span>Win at: <span class="font-bold text-[#3d3428]">{gridSize} points</span></span>
	</div>
	<div class="flex flex-col gap-3 w-full max-w-xs">
		{#each playerList as player (player.id)}
			<div class="card flex items-center gap-3 px-4 py-3">
				<div class="h-9 w-9 rounded-full flex items-center justify-center text-sm text-white"
					style="background: {COLORS[player.joinOrder - 1] ?? '#aaa298'}; box-shadow: 0 2px 0 rgba(0,0,0,0.15);">
					{player.displayName[0].toUpperCase()}
				</div>
				<span class="font-semibold text-[#3d3428]">{player.displayName}</span>
				{#if player.id === playerList[0]?.id}
					<span class="ml-auto text-xs font-bold text-[#e8a838] bg-[#e8a838]/15 px-2 py-0.5 rounded-full">HOST</span>
				{/if}
			</div>
		{/each}
		{#each Array(slotsLeft) as _, i (i)}
			<div class="card flex items-center gap-3 px-4 py-3 border-2 border-dashed border-[#d5cec4] opacity-50">
				<div class="h-9 w-9 rounded-full bg-[#d5cec4] flex items-center justify-center text-sm text-[#aaa298]">{playerList.length + i + 1}</div>
				<span class="text-[#aaa298] text-sm italic">Waiting...</span>
			</div>
		{/each}
	</div>
	{#if allJoined && isHost}
		<button onclick={handleClick} disabled={starting} class="btn btn-gold btn-lg">{starting ? 'Starting...' : 'Start Game'}</button>
	{:else if allJoined && !isHost}
		<p class="text-sm text-[#7a6e60] animate-pulse">Waiting for host...</p>
	{:else if isHost}
		<p class="text-sm text-[#aaa298]">Waiting for players...</p>
	{/if}
</div>
