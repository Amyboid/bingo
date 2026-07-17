<script lang="ts">
	import { onMount } from 'svelte';

	let {
		winnerName,
		points,
		allPlayers,
		isHost,
		onPlayAgain
	}: {
		winnerName: string;
		points: number;
		allPlayers: { displayName: string; points: number }[];
		isHost: boolean;
		onPlayAgain: () => void;
	} = $props();

	function handleKeydown(e: KeyboardEvent) {
		// Only host can dismiss with Escape
		if (e.key === 'Escape' && isHost) {
			onPlayAgain();
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
	role="dialog"
	aria-modal="true"
	aria-label="Game over - {winnerName} wins"
	tabindex="-1"
>
	<div class="flex flex-col items-center gap-6 rounded-2xl bg-zinc-900 p-10 shadow-2xl border border-amber-500/30 animate-scale-in">
		<div class="text-6xl font-black text-amber-400 animate-bounce-once">
			BINGO!
		</div>

		<div class="text-center">
			<p class="text-sm text-zinc-400 uppercase tracking-wider">Winner</p>
			<p class="text-2xl font-bold text-white mt-1">{winnerName}</p>
			<p class="text-sm text-zinc-500 mt-1">{points} points</p>
		</div>

		<div class="w-full rounded-lg bg-zinc-800 p-4">
			<h3 class="text-xs font-semibold text-zinc-500 uppercase mb-3">Final Scores</h3>
			{#each allPlayers as player (player.displayName)}
				<div class="flex items-center justify-between py-1.5">
					<span class="text-sm" class:text-amber-400={player.points >= 5} class:text-white={player.points < 5}>
						{player.displayName}
					</span>
					<span class="text-sm font-mono" class:text-amber-400={player.points >= 5} class:text-zinc-400={player.points < 5}>
						{player.points}/5
					</span>
				</div>
			{/each}
		</div>

		{#if isHost}
			<button
				onclick={onPlayAgain}
				class="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white hover:bg-blue-500 transition-colors"
			>
				Play Again
			</button>
		{:else}
			<p class="text-sm text-zinc-500">Waiting for host to start next round...</p>
		{/if}
	</div>
</div>

<style>
	@keyframes fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	@keyframes scale-in {
		from { opacity: 0; transform: scale(0.9); }
		to { opacity: 1; transform: scale(1); }
	}
	@keyframes bounce-once {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-10px); }
	}
	.animate-fade-in { animation: fade-in 0.3s ease-out; }
	.animate-scale-in { animation: scale-in 0.3s ease-out; }
	.animate-bounce-once { animation: bounce-once 0.6s ease-in-out 2; }
</style>
