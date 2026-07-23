<script lang="ts">
	let { currentPlayerName, lastCalledNumber, isMyTurn, timeLeft, graceCountdown = 0 }: {
		currentPlayerName: string; lastCalledNumber: number | null; isMyTurn: boolean; timeLeft: number; graceCountdown?: number;
	} = $props();
</script>

<div class="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-3 bg-white/90 sm:bg-card rounded-xl sm:rounded-2xl shadow-sm sm:shadow-md">
	<!-- Turn -->
	<div class="flex items-center gap-2 min-w-0">
		<div class="h-3.5 w-3.5 rounded-full flex-shrink-0 {isMyTurn ? 'bg-primary shadow-[0_0_8px_rgba(232,168,56,0.5)]' : 'bg-light-gray'}"></div>
		<div class="flex flex-col min-w-0">
			<span class="text-[10px] sm:text-xs text-text-light uppercase tracking-wider">Turn</span>
			<span class="text-base sm:text-lg font-bold truncate {isMyTurn ? 'text-primary' : 'text-text'}">{isMyTurn ? 'Your turn!' : currentPlayerName}</span>
		</div>
	</div>

	<div class="h-8 w-px bg-border flex-shrink-0"></div>

	<!-- Called -->
	<div class="flex flex-col items-center flex-shrink-0">
		<span class="text-[10px] sm:text-xs text-text-light uppercase tracking-wider">Called</span>
		{#if lastCalledNumber !== null}
			<span class="text-lg sm:text-xl font-bold text-success">{lastCalledNumber}</span>
		{:else}
			<span class="text-sm text-text-light font-mono">—</span>
		{/if}
	</div>

	<div class="h-8 w-px bg-border flex-shrink-0"></div>

	<!-- Time -->
	<div class="flex flex-col items-center flex-shrink-0">
		<span class="text-[10px] sm:text-xs text-text-light uppercase tracking-wider">Time</span>
		{#if isMyTurn}
			<span class="text-sm sm:text-text-light font-mono {timeLeft <= 10 ? 'text-secondary' : timeLeft <= 20 ? 'text-primary' : 'text-success'}">
				{timeLeft}s
			</span>
		{:else}
			<span class="text-sm sm:text-text-light font-mono">—</span>
		{/if}
	</div>

	<div class="h-8 w-px bg-border flex-shrink-0"></div>

	<!-- BINGO -->
	<div class="flex flex-col items-center flex-shrink-0">
		<span class="text-[10px] sm:text-xs text-text-light uppercase tracking-wider">BINGO</span>
		{#if graceCountdown > 0}
			<span class="text-sm font-mono text-secondary">{graceCountdown}s</span>
		{:else}
			<span class="text-sm sm:text-text-light font-mono">—</span>
		{/if}
	</div>
</div>
