<script lang="ts">
	let { currentPlayerName, lastCalledNumber, isMyTurn, timeLeft, graceTimeLeft = 0 }: {
		currentPlayerName: string; lastCalledNumber: number | null; isMyTurn: boolean; timeLeft: number; graceTimeLeft?: number;
	} = $props();
</script>

<div class="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-3 bg-white/90 sm:bg-card rounded-xl sm:rounded-2xl shadow-sm sm:shadow-md">
	<div class="flex items-center gap-2">
		<div class="h-3.5 w-3.5 rounded-full {isMyTurn ? 'bg-primary shadow-[0_0_8px_rgba(232,168,56,0.5)]' : 'bg-light-gray'}"></div>
		<div class="flex flex-col">
			<span class="text-[10px] sm:text-xs text-text-light uppercase tracking-wider">Turn</span>
			<span class="text-sm sm:text-text-light {isMyTurn ? 'text-primary' : 'text-text'}">{isMyTurn ? 'Your turn!' : currentPlayerName}</span>
		</div>
	</div>

	{#if lastCalledNumber !== null}
		<div class="h-8 w-px bg-border"></div>
		<div class="flex flex-col items-center">
			<span class="text-[10px] sm:text-xs text-text-light uppercase tracking-wider">Called</span>
			<span class="text-lg sm:text-xl font-bold text-success">{lastCalledNumber}</span>
		</div>
	{/if}

	<div class="h-8 w-px bg-border"></div>
	<div class="flex flex-col items-center">
		{#if isMyTurn}
			<span class="text-[10px] sm:text-xs text-text-light uppercase tracking-wider">Time</span>
			<span class="text-sm sm:text-text-light font-mono {timeLeft <= 10 ? 'text-secondary' : timeLeft <= 20 ? 'text-primary' : 'text-success'}">
				{timeLeft}s
			</span>
		{:else if graceTimeLeft > 0}
			<span class="text-[10px] sm:text-xs text-text-light uppercase tracking-wider">BINGO</span>
			<span class="text-sm font-mono text-secondary">{graceTimeLeft}s</span>
		{:else}
			<span class="text-[10px] sm:text-xs text-text-light uppercase tracking-wider">Wait</span>
			<span class="text-sm sm:text-text-light font-mono">—</span>
		{/if}
	</div>
</div>
