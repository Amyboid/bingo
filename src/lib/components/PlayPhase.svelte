<script lang="ts">
	import { onMount } from 'svelte';
	import Board from './Board.svelte';
	import TurnIndicator from './TurnIndicator.svelte';
	import { callNumber, sweepLine, callBingo } from '$lib/game/board.remote';

	let {
		roomId,
		playerId,
		grid,
		marked,
		points,
		sweptLines,
		currentTurnPlayerId,
		lastCalledNumber,
		turnStartedAt,
		playerName,
		allCalledNumbers
	}: {
		roomId: string;
		playerId: string;
		grid: number[][];
		marked: [number, number][];
		points: number;
		sweptLines: string[];
		currentTurnPlayerId: string;
		lastCalledNumber: number | null;
		turnStartedAt: string | Date | null;
		playerName: string;
		allCalledNumbers: number[];
	} = $props();

	let calling = $state(false);
	let sweeping = $state(false);
	let errorMsg = $state('');
	let waitTime = $state(0);
	let selectedLines = $state<string[]>([]);

	const isMyTurn = $derived(currentTurnPlayerId === playerId);

	onMount(() => {
		if (!turnStartedAt) return;
		const started = new Date(turnStartedAt).getTime();
		const update = () => {
			const elapsed = (Date.now() - started) / 1000;
			waitTime = Math.max(0, Math.ceil(2 - elapsed));
		};
		update();
		const interval = setInterval(update, 100);
		return () => clearInterval(interval);
	});

	function handleCellClick(row: number, col: number) {
		if (!isMyTurn || waitTime > 0 || calling) return;
		const number = grid[row][col];
		if (marked.some(([r, c]) => r === row && c === col)) return;
		if (allCalledNumbers.includes(number)) return;
		handleCallNumber(number);
	}

	async function handleCallNumber(number: number) {
		calling = true;
		errorMsg = '';
		try {
			await callNumber({ roomId, playerId, number });
		} catch (e: unknown) {
			errorMsg = e instanceof Error ? e.message : 'Failed to call number';
		} finally {
			calling = false;
		}
	}

	async function handleSweep() {
		if (selectedLines.length === 0 || sweeping) return;
		sweeping = true;
		errorMsg = '';
		try {
			await sweepLine({ roomId, playerId, lineIds: selectedLines });
			selectedLines = [];
		} catch (e: unknown) {
			errorMsg = e instanceof Error ? e.message : 'Failed to sweep line';
		} finally {
			sweeping = false;
		}
	}

	function toggleLine(lineId: string) {
		if (!isMyTurn) return;
		if (selectedLines.includes(lineId)) {
			selectedLines = selectedLines.filter((l) => l !== lineId);
		} else {
			selectedLines = [...selectedLines, lineId];
		}
	}

	const completableLines = $derived.by(() => {
		const lines: { id: string; label: string }[] = [];
		const markedSet = new Set(marked.map(([r, c]) => `${r},${c}`));

		for (let i = 0; i < 5; i++) {
			const rowCells = Array.from({ length: 5 }, (_, c) => `${i},${c}`);
			if (rowCells.every((k) => markedSet.has(k)) && !sweptLines.includes(`row-${i}`)) {
				lines.push({ id: `row-${i}`, label: `Row ${i + 1}` });
			}
			const colCells = Array.from({ length: 5 }, (_, r) => `${r},${i}`);
			if (colCells.every((k) => markedSet.has(k)) && !sweptLines.includes(`col-${i}`)) {
				lines.push({ id: `col-${i}`, label: `Col ${i + 1}` });
			}
		}

		const diagMain = Array.from({ length: 5 }, (_, i) => `${i},${i}`);
		if (diagMain.every((k) => markedSet.has(k)) && !sweptLines.includes('diag-main')) {
			lines.push({ id: 'diag-main', label: 'Diagonal \u2197' });
		}
		const diagAnti = Array.from({ length: 5 }, (_, i) => `${i},${4 - i}`);
		if (diagAnti.every((k) => markedSet.has(k)) && !sweptLines.includes('diag-anti')) {
			lines.push({ id: 'diag-anti', label: 'Diagonal \u2196' });
		}

		return lines;
	});

	const canCallBingo = $derived(points >= 5);
</script>

<div class="flex flex-col items-center gap-4">
	<TurnIndicator
		currentPlayerName={playerName}
		{lastCalledNumber}
		{isMyTurn}
		timeLeft={waitTime}
	/>

	<div class="flex items-center gap-4 text-sm">
		<span class="text-zinc-400">
			Points: <span class="font-bold text-white">{points}/5</span>
		</span>
		{#if canCallBingo}
			<span class="text-amber-400 font-semibold animate-pulse">Ready to BINGO!</span>
		{/if}
	</div>

	<div class="rounded-xl bg-zinc-900 p-4 shadow-lg">
		<Board
			{grid}
			{marked}
			calledNumbers={allCalledNumbers}
			disabled={!isMyTurn || waitTime > 0}
			onCellClick={handleCellClick}
		/>
	</div>

	{#if errorMsg}
		<div class="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{errorMsg}</div>
	{/if}

	{#if isMyTurn && completableLines.length > 0}
		<div class="flex flex-col items-center gap-2">
			<span class="text-sm text-zinc-400">Complete lines — tap to select, then sweep:</span>
			<div class="flex flex-wrap gap-2">
				{#each completableLines as line (line.id)}
					{@const selected = selectedLines.includes(line.id)}
					<button
						onclick={() => toggleLine(line.id)}
						class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {selected ? 'bg-green-500/20 text-green-300 border border-green-400' : 'bg-zinc-800 text-zinc-300'}"
					>
						{line.label}
					</button>
				{/each}
			</div>
			<button
				onclick={handleSweep}
				disabled={selectedLines.length === 0 || sweeping}
				class="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition-colors"
			>
				{sweeping ? 'Sweeping...' : `Sweep ${selectedLines.length} line${selectedLines.length > 1 ? 's' : ''}`}
			</button>
		</div>
	{/if}

	{#if canCallBingo && isMyTurn}
		<button
			onclick={async () => {
				try {
					await callBingo({ roomId, playerId });
				} catch (e: unknown) {
					errorMsg = e instanceof Error ? e.message : 'Failed to call Bingo';
				}
			}}
			class="rounded-xl bg-amber-500 px-8 py-4 text-xl font-bold text-black hover:bg-amber-400 animate-bounce transition-colors"
		>
			BINGO!
		</button>
	{/if}
</div>
