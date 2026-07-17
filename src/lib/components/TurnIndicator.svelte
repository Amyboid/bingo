<script lang="ts">
	let { currentPlayerName, lastCalledNumber, isMyTurn, timeLeft }: {
		currentPlayerName: string; lastCalledNumber: number | null; isMyTurn: boolean; timeLeft: number;
	} = $props();
</script>

<div class="card flex items-center gap-4 sm:gap-6 px-5 sm:px-8 py-3 sm:py-4">
	<div class="flex items-center gap-3">
		<div class="h-3.5 w-3.5 rounded-full {isMyTurn ? 'bg-[#e8a838] shadow-[0_0_8px_rgba(232,168,56,0.5)]' : 'bg-[#bbb]'}"></div>
		<div class="flex flex-col">
			<span class="text-[10px] sm:text-xs text-[#7a6e60] uppercase tracking-wider">Turn</span>
			<span class="text-sm sm:text-base {isMyTurn ? 'text-[#e8a838]' : 'text-[#3d3428]'}">{isMyTurn ? 'Your turn!' : currentPlayerName}</span>
		</div>
	</div>
	{#if lastCalledNumber !== null}
		<div class="h-8 w-px bg-[#d5cec4]"></div>
		<div class="flex flex-col">
			<span class="text-[10px] sm:text-xs text-[#7a6e60] uppercase tracking-wider">Called</span>
			<span class="text-lg sm:text-xl font-bold text-[#7cb87a]">{lastCalledNumber}</span>
		</div>
	{/if}
	<div class="h-8 w-px bg-[#d5cec4]"></div>
	<div class="flex flex-col">
		<span class="text-[10px] sm:text-xs text-[#7a6e60] uppercase tracking-wider">{isMyTurn ? 'Time' : 'Wait'}</span>
		<span class="text-sm sm:text-base font-mono {timeLeft <= 10 ? 'text-[#e07850]' : timeLeft <= 20 ? 'text-[#e8a838]' : 'text-[#7cb87a]'}">
			{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
		</span>
	</div>
</div>
