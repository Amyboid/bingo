<script lang="ts">
	import Board from './Board.svelte';
	import TurnIndicator from './TurnIndicator.svelte';
	import { callNumber, sweepLine, callBingo, autoCallNumber } from '$lib/game/board.remote';
	import { getLineCells } from '$lib/game/utils';
	import { showToast } from '$lib/toast';

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
	let turnTimeLeft = $state(30);
	let optimisticMarks = $state<[number, number][]>([]);
	let optimisticSweptLines = $state<string[]>([]);

	// Drag state for swipe-to-sweep
	let isDragging = $state(false);
	let dragCells = $state<[number, number][]>([]);

	const isMyTurn = $derived(currentTurnPlayerId === playerId);
	const displayMarked = $derived([...marked, ...optimisticMarks]);
	const displaySweptLines = $derived([...sweptLines, ...optimisticSweptLines]);

	// Layout constants
	const CELL = 56;
	const GAP = 4;
	const LABEL_W = 24;
	const HEADER_H = 60; // 56px cell + 4px gap

	// 30s turn timer with auto-call
	$effect(() => {
		const startedAt = turnStartedAt;
		if (!startedAt) {
			turnTimeLeft = 0;
			return;
		}

		const deadline = new Date(startedAt).getTime() + 30_000;
		let autoCalled = false;

		const update = () => {
			turnTimeLeft = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
		};

		update();
		const interval = setInterval(update, 100);

		const timeout = setTimeout(async () => {
			if (isMyTurn && !autoCalled) {
				autoCalled = true;
				try {
					await autoCallNumber({ roomId, playerId });
				} catch (e) {
					console.error('Auto-call failed:', e);
				}
			}
		}, Math.max(0, deadline - Date.now()));

		return () => {
			clearInterval(interval);
			clearTimeout(timeout);
		};
	});

	// Completable lines
	const completableLines = $derived.by(() => {
		const lines: { id: string; cells: [number, number][] }[] = [];
		const markedSet = new Set(displayMarked.map(([r, c]) => `${r},${c}`));

		for (let i = 0; i < 5; i++) {
			const rowCells: [number, number][] = Array.from({ length: 5 }, (_, c) => [i, c]);
			if (rowCells.every(([r, c]) => markedSet.has(`${r},${c}`)) && !displaySweptLines.includes(`row-${i}`)) {
				lines.push({ id: `row-${i}`, cells: rowCells });
			}
			const colCells: [number, number][] = Array.from({ length: 5 }, (_, r) => [r, i]);
			if (colCells.every(([r, c]) => markedSet.has(`${r},${c}`)) && !displaySweptLines.includes(`col-${i}`)) {
				lines.push({ id: `col-${i}`, cells: colCells });
			}
		}

		const diagMain: [number, number][] = Array.from({ length: 5 }, (_, i) => [i, i]);
		if (diagMain.every(([r, c]) => markedSet.has(`${r},${c}`)) && !displaySweptLines.includes('diag-main')) {
			lines.push({ id: 'diag-main', cells: diagMain });
		}
		const diagAnti: [number, number][] = Array.from({ length: 5 }, (_, i) => [i, 4 - i]);
		if (diagAnti.every(([r, c]) => markedSet.has(`${r},${c}`)) && !displaySweptLines.includes('diag-anti')) {
			lines.push({ id: 'diag-anti', cells: diagAnti });
		}

		return lines;
	});

	// Swept line overlays
	const lineOverlays = $derived.by(() => {
		const overlays: { cells: [number, number][] }[] = [];
		for (const lineId of displaySweptLines) {
			const cells = getLineCells(lineId) as [number, number][];
			if (cells.length === 5) overlays.push({ cells });
		}
		return overlays;
	});

	const canCallBingo = $derived(points >= 5);

	// Compute cell center positions relative to the SVG container
	function cellCenter(r: number, c: number): { x: number; y: number } {
		// SVG is absolute inset-0 on the p-4 container
		// Content starts at padding (16px), then header (60px), then rows
		// Horizontal: padding + label + col * (cell + gap) + cell/2
		const x = 16 + LABEL_W + c * (CELL + GAP) + CELL / 2;
		// Vertical: padding + header + row * (cell + gap) + cell/2
		const y = 16 + HEADER_H + r * (CELL + GAP) + CELL / 2;
		return { x, y };
	}

	// --- Number calling (turn-locked) ---
	function handleCellClick(row: number, col: number) {
		if (!isMyTurn || turnTimeLeft <= 0 || calling) return;
		const number = grid[row][col];
		if (displayMarked.some(([r, c]) => r === row && c === col)) return;
		if (allCalledNumbers.includes(number)) return;

		optimisticMarks = [...optimisticMarks, [row, col]];
		handleCallNumber(number);
	}

	async function handleCallNumber(number: number) {
		calling = true;
		try {
			await callNumber({ roomId, playerId, number });
			optimisticMarks = [];
		} catch (e: unknown) {
			optimisticMarks = [];
			showToast(e instanceof Error ? e.message : 'Failed to call number');
		} finally {
			calling = false;
		}
	}

	// --- Drag to sweep (allowed anytime) ---
	function handleDragStart(row: number, col: number) {
		if (!displayMarked.some(([r, c]) => r === row && c === col)) return;
		isDragging = true;
		dragCells = [[row, col]];
		boardContainer = null; // Reset cache for fresh measurement
	}

	function handleDragMove(row: number, col: number) {
		if (!isDragging) return;
		if (!displayMarked.some(([r, c]) => r === row && c === col)) return;
		const exists = dragCells.some(([r, c]) => r === row && c === col);
		if (!exists) dragCells = [...dragCells, [row, col]];
	}

	async function handleDragEnd() {
		if (!isDragging) return;
		isDragging = false;

		const dragSet = new Set(dragCells.map(([r, c]) => `${r},${c}`));
		for (const line of completableLines) {
			if (line.cells.every(([r, c]) => dragSet.has(`${r},${c}`))) {
				await doSweep([line.id]);
				break;
			}
		}
		dragCells = [];
	}

	async function doSweep(lineIds: string[]) {
		optimisticSweptLines = [...optimisticSweptLines, ...lineIds];
		try {
			await sweepLine({ roomId, playerId, lineIds });
			optimisticSweptLines = [];
		} catch (e: unknown) {
			optimisticSweptLines = optimisticSweptLines.filter((l) => !lineIds.includes(l));
			showToast(e instanceof Error ? e.message : 'Failed to sweep line');
		}
	}

	// --- Bingo call (turn-locked) ---
	async function handleBingo() {
		try {
			await callBingo({ roomId, playerId });
		} catch (e: unknown) {
			showToast(e instanceof Error ? e.message : 'Failed to call Bingo');
		}
	}
	// Cached container ref for drag detection
	let boardContainer = $state<HTMLElement | null>(null);

	// Compute cell from any pointer coordinates (mouse or touch)
	function getCellFromPosition(clientX: number, clientY: number): [number, number] | null {
		if (!boardContainer) {
			boardContainer = document.querySelector('[data-board-container]');
		}
		if (!boardContainer) return null;
		const rect = boardContainer.getBoundingClientRect();
		const x = clientX - rect.left - 16 - 24; // padding + label
		const y = clientY - rect.top - 16 - 60; // padding + header
		const col = Math.floor(x / 60);
		const row = Math.floor(y / 60);
		if (row < 0 || row > 4 || col < 0 || col > 4) return null;
		return [row, col];
	}
</script>

<svelte:window
	onmouseup={() => handleDragEnd()}
	ontouchend={() => handleDragEnd()}
	onmousemove={(e) => {
		if (!isDragging) return;
		const cell = getCellFromPosition(e.clientX, e.clientY);
		if (cell) handleDragMove(cell[0], cell[1]);
	}}
	ontouchmove={(e) => {
		if (!isDragging) return;
		const touch = e.touches[0];
		if (!touch) return;
		const cell = getCellFromPosition(touch.clientX, touch.clientY);
		if (cell) handleDragMove(cell[0], cell[1]);
	}}
/>

<div class="flex flex-col items-center gap-4">
	<TurnIndicator
		currentPlayerName={playerName}
		{lastCalledNumber}
		{isMyTurn}
		timeLeft={turnTimeLeft}
	/>

	<div class="flex items-center gap-4 text-sm">
		<span class="text-zinc-400">
			Points: <span class="font-bold text-white">{points}/5</span>
		</span>
		{#if canCallBingo}
			<span class="text-amber-400 font-semibold animate-pulse">Ready to BINGO!</span>
		{/if}
	</div>

	<!-- Board with SVG overlay -->
	<div class="relative rounded-xl bg-zinc-900 p-4 shadow-lg" data-board-container>
		<Board
			{grid}
			marked={displayMarked}
			calledNumbers={allCalledNumbers}
			disabled={!isMyTurn || turnTimeLeft <= 0}
			onCellClick={handleCellClick}
			onDragStart={handleDragStart}
			onDragMove={handleDragMove}
		/>

		<!-- SVG overlays -->
		<svg class="absolute inset-0 pointer-events-none" style="width: 100%; height: 100%;">
			<!-- Permanent swept lines -->
			{#each lineOverlays as overlay}
				{@const first = cellCenter(overlay.cells[0][0], overlay.cells[0][1])}
				{@const last = cellCenter(overlay.cells[4][0], overlay.cells[4][1])}
				<line
					x1={first.x}
					y1={first.y}
					x2={last.x}
					y2={last.y}
					stroke="rgb(34, 197, 94)"
					stroke-width="6"
					stroke-linecap="round"
					opacity="0.8"
				/>
			{/each}

			<!-- Temporary drag path (smooth drawing) -->
			{#if dragCells.length > 1}
				<polyline
					points={dragCells.map(([r, c]) => {
						const p = cellCenter(r, c);
						return `${p.x},${p.y}`;
					}).join(' ')}
					stroke="rgb(100, 200, 100)"
					stroke-width="4"
					stroke-linecap="round"
					stroke-linejoin="round"
					fill="none"
					opacity="0.6"
				/>
			{/if}
		</svg>
	</div>

	{#if canCallBingo && isMyTurn}
		<button
			onclick={handleBingo}
			class="rounded-xl bg-amber-500 px-8 py-4 text-xl font-bold text-black hover:bg-amber-400 animate-pulse transition-colors"
		>
			BINGO!
		</button>
	{/if}
</div>
