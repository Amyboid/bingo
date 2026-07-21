<script lang="ts">
	import { onMount } from 'svelte';
	let { winnerName, points, winWord = 'BINGO', allPlayers, isHost, onPlayAgain }: {
		winnerName: string; points: number; winWord?: string;
		allPlayers: { displayName: string; points: number }[];
		isHost: boolean; onPlayAgain: () => void;
	} = $props();
	function handleKeydown(e: KeyboardEvent) { if (e.key === 'Escape' && isHost) onPlayAgain(); }
	onMount(() => { window.addEventListener('keydown', handleKeydown); return () => window.removeEventListener('keydown', handleKeydown); });
	const COLORS = ['bg-secondary', 'bg-primary', 'bg-success', 'bg-blue', 'bg-purple'];
	const COLORS_RAW = ['#e07850', '#e8a838', '#7cb87a', '#6a9ecf', '#b07cc6'];
	const gridSize = $derived(winWord.length);
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
	<div class="absolute inset-0 overflow-hidden pointer-events-none">
		{#each Array(20) as _, i (i)}
			<div class="absolute rounded-full" style="width: {8 + (i % 3) * 6}px; height: {8 + (i % 3) * 6}px; left: {5 + (i * 4.5)}%; top: -20px; background: {COLORS_RAW[i % COLORS_RAW.length]}; animation: confetti-fall {2 + (i % 3)}s linear {i * 0.12}s forwards;"></div>
		{/each}
	</div>
	<div class="card flex flex-col items-center gap-6 sm:gap-8 p-8 sm:p-12 mx-4 max-w-md w-full relative animate-pop">
		<div class="text-6xl sm:text-7xl text-secondary" style="text-shadow: 0 4px 0 rgba(0,0,0,0.12), 0 6px 12px rgba(0,0,0,0.08);">{winWord}!</div>
		<div class="text-center">
			<p class="text-xs text-muted uppercase tracking-widest">Winner</p>
			<p class="text-2xl sm:text-3xl font-bold text-text mt-1">{winnerName}</p>
			<div class="flex items-center justify-center gap-1 mt-2">
				{#each Array(gridSize) as _, i (i)}<span class="text-xl" class:text-primary={i < points} class:text-border={i >= points}>★</span>{/each}
			</div>
		</div>
		<div class="w-full rounded-xl bg-card p-4">
			<h3 class="text-[10px] font-semibold text-muted uppercase tracking-wider mb-3">Final Scores</h3>
			{#each allPlayers as player, i (player.displayName)}
				<div class="flex items-center justify-between py-2 {player.points >= gridSize ? '' : 'opacity-60'}">
					<div class="flex items-center gap-2">
						<div class="h-5 w-5 rounded-full {COLORS[i % COLORS.length]}"></div>
						<span class="text-sm font-semibold {player.points >= gridSize ? 'text-dark-gold' : 'text-text'}">{player.displayName}</span>
					</div>
					<div class="flex items-center gap-0.5">
						{#each Array(gridSize) as _, j (j)}<span class="text-xs" class:text-primary={j < player.points} class:text-border={j >= player.points}>★</span>{/each}
					</div>
				</div>
			{/each}
		</div>
		{#if isHost}
			<button onclick={onPlayAgain} class="btn btn-gold btn-lg w-full">Play Again</button>
		{:else}
			<p class="text-sm text-muted animate-pulse">Waiting for host...</p>
		{/if}
	</div>
</div>

<style>
	@keyframes confetti-fall {
		0% { transform: translateY(0) rotate(0deg); opacity: 1; }
		100% { transform: translateY(calc(100vh + 40px)) rotate(720deg); opacity: 0; }
	}
</style>
