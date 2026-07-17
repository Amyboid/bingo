<script lang="ts">
	let {
		currentPlayerName,
		lastCalledNumber,
		isMyTurn,
		timeLeft
	}: {
		currentPlayerName: string;
		lastCalledNumber: number | null;
		isMyTurn: boolean;
		timeLeft: number;
	} = $props();

	const timeColor = $derived(timeLeft <= 10 ? 'text-red-400' : 'text-zinc-400');
</script>

<div class="flex items-center gap-4 rounded-xl bg-zinc-900 px-6 py-4 shadow-lg">
	<div class="flex flex-col">
		<span class="text-xs text-zinc-500 uppercase tracking-wider">Current Turn</span>
		<span class="text-lg font-bold" class:text-blue-400={isMyTurn} class:text-white={!isMyTurn}>
			{isMyTurn ? 'Your turn!' : currentPlayerName}
		</span>
	</div>

	{#if lastCalledNumber !== null}
		<div class="h-8 w-px bg-zinc-700"></div>
		<div class="flex flex-col">
			<span class="text-xs text-zinc-500 uppercase tracking-wider">Last Called</span>
			<span class="text-lg font-bold text-green-400">{lastCalledNumber}</span>
		</div>
	{/if}

	{#if timeLeft > 0}
		<div class="h-8 w-px bg-zinc-700"></div>
		<div class="flex flex-col">
			<span class="text-xs text-zinc-500 uppercase tracking-wider">
				{isMyTurn ? 'Time Left' : 'Wait'}
			</span>
			<span class="text-lg font-bold {timeColor} font-mono">
				{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
			</span>
		</div>
	{/if}
</div>
