<script lang="ts">
	import Cell from './Cell.svelte';

	const LETTER_COLORS = ['#e07850', '#e8a838', '#7cb87a', '#6a9ecf', '#b07cc6'];

	let {
		grid, winWord = 'BINGO', cutLetters = new Set(), marked = [], calledNumbers = [], disabled = false, editMode = false,
		cellSize = 56,
		onGridChange, onCellClick, onCutLetter,
		onDragStart: onSweepDragStart, onDragMove: onSweepDragMove
	}: {
		grid: number[][]; winWord?: string; cutLetters?: Set<number>; marked?: [number, number][]; calledNumbers?: number[];
		disabled?: boolean; editMode?: boolean; cellSize?: number;
		onGridChange?: (newGrid: number[][]) => void;
		onCellClick?: (row: number, col: number) => void;
		onCutLetter?: (index: number) => void;
		onDragStart?: (row: number, col: number) => void;
		onDragMove?: (row: number, col: number) => void;
	} = $props();

	const letters = $derived(winWord.split(''));
	const gridSize = $derived(letters.length);

	let dragSource: [number, number] | null = $state(null);
	const markedSet = $derived(new Set(marked.map(([r, c]) => `${r},${c}`)));
	const calledSet = $derived(new Set(calledNumbers));

	function isMarked(r: number, c: number) { return markedSet.has(`${r},${c}`); }

	function handleValueChange(r: number, c: number, newVal: number) {
		if (!onGridChange) return;
		const g = grid.map((row) => [...row]);
		for (let rr = 0; rr < gridSize; rr++) for (let cc = 0; cc < gridSize; cc++) {
			if (g[rr][cc] === newVal && (rr !== r || cc !== c)) { g[rr][cc] = grid[r][c]; g[r][c] = newVal; onGridChange(g); return; }
		}
		g[r][c] = newVal; onGridChange(g);
	}

	function handleEditDragStart(r: number, c: number) { dragSource = [r, c]; }
	function handleDrop(r: number, c: number) {
		if (!dragSource || !onGridChange) return;
		const [sr, sc] = dragSource;
		if (sr === r && sc === c) { dragSource = null; return; }
		const g = grid.map((row) => [...row]);
		const t = g[sr][sc]; g[sr][sc] = g[r][c]; g[r][c] = t;
		onGridChange(g); dragSource = null;
	}
</script>

<div class="flex flex-col items-center gap-1.5 sm:gap-2">
	<!-- Clickable letter headers -->
	<div class="flex gap-1.5 sm:gap-2 mb-1">
		{#each letters as letter, i (i)}
			<button
				type="button"
				onclick={() => onCutLetter?.(i)}
				class="flex items-center justify-center rounded-[10px] text-white transition-all duration-200 select-none"
				style="width: {cellSize}px; height: {cellSize}px; font-size: {Math.max(14, Math.round(cellSize * 0.28))}px; background: {LETTER_COLORS[i % LETTER_COLORS.length]}; box-shadow: 0 3px 0 rgba(0,0,0,0.2); text-shadow: 0 1px 0 rgba(0,0,0,0.15);"
				class:opacity-40={cutLetters.has(i)}
				class:line-through={cutLetters.has(i)}
			>
				{letter}
			</button>
		{/each}
	</div>

	<!-- Grid rows (no left-side labels) -->
	{#each grid as gridRow, r (r)}
		<div class="flex gap-1.5 sm:gap-2">
			{#each gridRow as cell, c (c)}
				<Cell value={cell} {r} {c} {disabled} marked={isMarked(r, c)}
					isCalled={calledSet.has(cell)}
					canInteract={editMode || (!disabled && isMarked(r, c))}
					draggable={editMode}
					{cellSize}
					onValueChange={(val: number) => handleValueChange(r, c, val)}
					onClick={!editMode ? onCellClick : undefined}
					onDragStart={editMode ? handleEditDragStart : undefined}
					onDrop={editMode ? handleDrop : undefined}
					onSweepDragStart={!editMode ? onSweepDragStart : undefined}
					onSweepDragMove={!editMode ? onSweepDragMove : undefined} />
			{/each}
		</div>
	{/each}
</div>
