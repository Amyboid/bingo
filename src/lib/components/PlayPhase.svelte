<script lang="ts">
	import Board from './Board.svelte';
	import TurnIndicator from './TurnIndicator.svelte';
	import { callNumber, sweepLine, callBingo, autoCallNumber } from '$lib/game/board.remote';
	import { getLineCells, numberOnGrid } from '$lib/game/utils';
	import { showToast, getErrorMessage } from '$lib/toast';

	let {
		roomId,
		playerId,
		grid,
		winWord = 'BINGO',
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
		winWord?: string;
		marked: [number, number][];
		points: number;
		sweptLines: string[];
		currentTurnPlayerId: string;
		lastCalledNumber: number | null;
		turnStartedAt: string | Date | null;
		playerName: string;
		allCalledNumbers: number[];
	} = $props();

	const gridSize = $derived(winWord.length);

	let calling = $state(false);
	let turnTimeLeft = $state(30);
	let optimisticMarks = $state<[number, number][]>([]);
	let optimisticSweptLines = $state<string[]>([]);
	let autoCalled = $state(false);
	let cutLetters = $state(new Set<number>());

	// Drag state for swipe-to-sweep
	let isDragging = $state(false);
	let dragCells = $state<[number, number][]>([]);

	const isMyTurn = $derived(currentTurnPlayerId === playerId);
	const displayMarked = $derived([...marked, ...optimisticMarks]);
	const displaySweptLines = $derived([...sweptLines, ...optimisticSweptLines]);
	const turnTimestamp = $derived(turnStartedAt ? new Date(turnStartedAt).getTime() : 0);

	// Layout constants (responsive to match Tailwind sm: breakpoints)
	let windowWidth = $state(typeof window !== 'undefined' ? window.innerWidth : 1024);
	let windowHeight = $state(typeof window !== 'undefined' ? window.innerHeight : 812);

	$effect(() => {
		const onResize = () => { windowWidth = window.innerWidth; windowHeight = window.innerHeight; };
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});

	const isSmall = $derived(windowWidth >= 640);
	const GAP = $derived(isSmall ? 8 : 6);
	const LABEL_W = $derived(0);
	const HEADER_H = $derived(isSmall ? 48 : 40);
	const PADDING = $derived(isSmall ? 24 : 16);

	// Dynamic cell size: fit board within viewport (use smaller of width/height constraints)
	const sidebarW = $derived(windowWidth >= 768 ? 224 : 0); // md breakpoint = sidebar visible
	const maxBoardWidth = $derived(windowWidth - sidebarW - PADDING * 2 - 32); // subtract sidebar + card padding
	const maxBoardHeight = $derived(windowHeight - HEADER_H - 80 - PADDING * 2); // top bar + bottom btn + card padding
	const maxCellFromWidth = $derived(Math.floor((maxBoardWidth - (gridSize - 1) * GAP) / gridSize));
	const maxCellFromHeight = $derived(Math.floor((maxBoardHeight - (gridSize - 1) * GAP) / gridSize));
	const maxCell = $derived(Math.min(maxCellFromWidth, maxCellFromHeight));
	const CELL = $derived(Math.min(isSmall ? 64 : 56, Math.max(maxCell, 28)));

	// 30s turn timer + auto-call
	$effect(() => {
		const turnKey = turnTimestamp;
		const myTurn = isMyTurn;
		autoCalled = false;

		if (!turnKey || !myTurn) {
			turnTimeLeft = 0;
			return;
		}

		const deadline = turnKey + 30_000;
		const deadlineMs = deadline - Date.now();
		if (deadlineMs <= 0) {
			turnTimeLeft = 0;
			if (!autoCalled) {
				autoCalled = true;
				autoCallNumber({ roomId, playerId }).then((result) => {
					if (result?.autoCalled && result.number) {
						const pos = numberOnGrid(grid, result.number);
						if (pos) optimisticMarks = [...optimisticMarks, pos];
					}
				}).catch(() => {});
			}
			return;
		}

		const update = () => {
			turnTimeLeft = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
		};

		update();
		const interval = setInterval(update, 100);

		const timeout = setTimeout(() => {
			if (autoCalled) return;
			autoCalled = true;
			autoCallNumber({ roomId, playerId }).then((result) => {
				if (result?.autoCalled && result.number) {
					const pos = numberOnGrid(grid, result.number);
					if (pos) optimisticMarks = [...optimisticMarks, pos];
				}
			}).catch(() => {});
		}, deadlineMs);

		return () => {
			clearInterval(interval);
			clearTimeout(timeout);
		};
	});

	// Completable lines (dynamic gridSize)
	const completableLines = $derived.by(() => {
		const lines: { id: string; cells: [number, number][] }[] = [];
		const markedSet = new Set(displayMarked.map(([r, c]) => `${r},${c}`));

		for (let i = 0; i < gridSize; i++) {
			const rowCells: [number, number][] = Array.from({ length: gridSize }, (_, c) => [i, c]);
			if (rowCells.every(([r, c]) => markedSet.has(`${r},${c}`)) && !displaySweptLines.includes(`row-${i}`)) {
				lines.push({ id: `row-${i}`, cells: rowCells });
			}
			const colCells: [number, number][] = Array.from({ length: gridSize }, (_, r) => [r, i]);
			if (colCells.every(([r, c]) => markedSet.has(`${r},${c}`)) && !displaySweptLines.includes(`col-${i}`)) {
				lines.push({ id: `col-${i}`, cells: colCells });
			}
		}

		const diagMain: [number, number][] = Array.from({ length: gridSize }, (_, i) => [i, i]);
		if (diagMain.every(([r, c]) => markedSet.has(`${r},${c}`)) && !displaySweptLines.includes('diag-main')) {
			lines.push({ id: 'diag-main', cells: diagMain });
		}
		const diagAnti: [number, number][] = Array.from({ length: gridSize }, (_, i) => [i, gridSize - 1 - i]);
		if (diagAnti.every(([r, c]) => markedSet.has(`${r},${c}`)) && !displaySweptLines.includes('diag-anti')) {
			lines.push({ id: 'diag-anti', cells: diagAnti });
		}

		return lines;
	});

	// Swept line overlays
	const lineOverlays = $derived.by(() => {
		const overlays: { cells: [number, number][] }[] = [];
		for (const lineId of displaySweptLines) {
			const cells = getLineCells(lineId, gridSize) as [number, number][];
			if (cells.length === gridSize) overlays.push({ cells });
		}
		return overlays;
	});

	// Grace period: 10 seconds after turn ends (for Bingo calling)
	// Starts immediately when it's not your turn, stops after countdown
	let graceCountdown = $state(0);
	let graceExpired = $state(false);
	const inGracePeriod = $derived(!isMyTurn && graceCountdown > 0);

	$effect(() => {
		if (isMyTurn) {
			graceCountdown = 0;
			graceExpired = false;
		} else if (!graceExpired && graceCountdown === 0) {
			graceCountdown = 10;
			graceExpired = false;
		}
	});

	let graceInterval = $state<ReturnType<typeof setInterval> | null>(null);
	$effect(() => {
		if (inGracePeriod && !graceInterval) {
			graceInterval = setInterval(() => {
				if (graceCountdown > 0) {
					graceCountdown--;
					if (graceCountdown === 0) graceExpired = true;
				}
			}, 1000);
		} else if (!inGracePeriod && graceInterval) {
			clearInterval(graceInterval);
			graceInterval = null;
		}
		return () => { if (graceInterval) clearInterval(graceInterval); };
	});

	function toggleCutLetter(index: number) {
		const next = new Set(cutLetters);
		if (next.has(index)) {
			next.delete(index);
		} else {
			next.add(index);
		}
		cutLetters = next;
	}

	// Compute cell center positions relative to the SVG container
	// Use runtime measurement to get the Board's actual position within the card
	const actualHeaderH = $derived(CELL + 4 + GAP);

	let boardRect = $state<{ left: number; top: number } | null>(null);

	$effect(() => {
		const container = document.querySelector('[data-board-container]');
		const board = document.querySelector('[data-board]');
		if (container && board) {
			const cr = container.getBoundingClientRect();
			const br = board.getBoundingClientRect();
			boardRect = { left: br.left - cr.left, top: br.top - cr.top };
		}
	});

	function cellCenter(r: number, c: number): { x: number; y: number } {
		if (!boardRect) return { x: 0, y: 0 };
		const cellStep = CELL + GAP;
		const x = boardRect.left + c * cellStep + CELL / 2;
		const y = boardRect.top + actualHeaderH + r * cellStep + CELL / 2;
		return { x, y };
	}

	// Proportional line stroke widths (scale with cell size)
	const LINE_OUTLINE = $derived(Math.round(CELL * 0.2));
	const LINE_WIDTH = $derived(Math.round(CELL * 0.1));
	const DRAG_OUTLINE = $derived(Math.round(CELL * 0.15));
	const DRAG_WIDTH = $derived(Math.round(CELL * 0.08));

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
			showToast(getErrorMessage(e, 'Failed to call number'));
		} finally {
			calling = false;
		}
	}

	// --- Drag to sweep (allowed anytime) ---
	function handleDragStart(row: number, col: number) {
		if (!displayMarked.some(([r, c]) => r === row && c === col)) return;
		isDragging = true;
		dragCells = [[row, col]];
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
			showToast(getErrorMessage(e, 'Failed to sweep line'));
		}
	}

	// --- Bingo call (turn-locked + grace period) ---
	async function handleBingo() {
		try {
			await callBingo({ roomId, playerId });
		} catch (e: unknown) {
			showToast(getErrorMessage(e, 'Failed to call Bingo'));
		}
	}

	// Compute cell from any pointer coordinates (mouse or touch)
	// Uses runtime measurement to match cellCenter exactly
	function getCellFromPosition(clientX: number, clientY: number): [number, number] | null {
		if (!boardRect) return null;
		const container = document.querySelector('[data-board-container]');
		if (!container) return null;
		const cr = container.getBoundingClientRect();
		const x = clientX - cr.left - boardRect.left;
		const y = clientY - cr.top - boardRect.top - actualHeaderH;
		const col = Math.floor(x / (CELL + GAP));
		const row = Math.floor(y / (CELL + GAP));
		if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) return null;
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
		e.preventDefault();
		const touch = e.touches[0];
		if (!touch) return;
		const cell = getCellFromPosition(touch.clientX, touch.clientY);
		if (cell) handleDragMove(cell[0], cell[1]);
	}}
/>

<div class="flex flex-col items-center gap-2 sm:gap-4">
	<!-- Compact top bar -->
	<div class="w-full flex-shrink-0">
		<TurnIndicator
			currentPlayerName={playerName}
			{lastCalledNumber}
			{isMyTurn}
			timeLeft={turnTimeLeft}
			{graceCountdown}
		/>
	</div>

	<!-- Board sizes to content -->
	<div class="card relative p-2 sm:p-6 overflow-hidden max-w-full" data-board-container>
		<div data-board>
			<Board
				{grid}
				{winWord}
				{cutLetters}
				cellSize={CELL}
				onCutLetter={toggleCutLetter}
				marked={displayMarked}
				calledNumbers={allCalledNumbers}
				disabled={!isMyTurn || turnTimeLeft <= 0}
				onCellClick={handleCellClick}
				onDragStart={handleDragStart}
				onDragMove={handleDragMove}
			/>
		</div>

		<!-- SVG overlays -->
		<svg class="absolute inset-0 pointer-events-none" style="width: 100%; height: 100%;">
			<!-- Permanent swept lines with white outline for contrast -->
			{#each lineOverlays as overlay, i (i)}
				{@const first = cellCenter(overlay.cells[0][0], overlay.cells[0][1])}
				{@const last = cellCenter(overlay.cells[gridSize - 1][0], overlay.cells[gridSize - 1][1])}
				<!-- White outline -->
				<line
					x1={first.x} y1={first.y} x2={last.x} y2={last.y}
					stroke="white" stroke-width={LINE_OUTLINE} stroke-linecap="round" opacity="0.9"
				/>
				<!-- Coral line -->
				<line
					x1={first.x} y1={first.y} x2={last.x} y2={last.y}
					stroke="#e07850" stroke-width={LINE_WIDTH} stroke-linecap="round" opacity="0.95"
				/>
			{/each}

			<!-- Temporary drag path with white outline -->
			{#if dragCells.length > 1}
				<!-- White outline -->
				<polyline
					points={dragCells.map(([r, c]) => {
						const p = cellCenter(r, c);
						return `${p.x},${p.y}`;
					}).join(' ')}
					stroke="white" stroke-width={DRAG_OUTLINE} stroke-linecap="round"
					stroke-linejoin="round" fill="none" opacity="0.7"
				/>
				<!-- Amber drag line -->
				<polyline
					points={dragCells.map(([r, c]) => {
						const p = cellCenter(r, c);
						return `${p.x},${p.y}`;
					}).join(' ')}
					stroke="#e8a838" stroke-width={DRAG_WIDTH} stroke-linecap="round"
					stroke-linejoin="round" fill="none" opacity="0.9"
				/>
			{/if}
		</svg>
	</div>

	<div class="flex-shrink-0 w-full flex justify-center pb-2 sm:pb-0">
		<button
			onclick={handleBingo}
			class="btn btn-coral btn-lg"
		>
			BINGO!
		</button>
	</div>
</div>
