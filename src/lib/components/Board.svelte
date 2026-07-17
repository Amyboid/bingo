<script lang="ts">
	import Cell from './Cell.svelte';

	const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O'];
	const LETTER_COLORS = ['#e07850', '#e8a838', '#7cb87a', '#6a9ecf', '#b07cc6'];

	let {
		grid, marked = [], calledNumbers = [], disabled = false, editMode = false,
		onGridChange, onCellClick,
		onDragStart: onSweepDragStart, onDragMove: onSweepDragMove
	}: {
		grid: number[][]; marked?: [number, number][]; calledNumbers?: number[];
		disabled?: boolean; editMode?: boolean;
		onGridChange?: (newGrid: number[][]) => void;
		onCellClick?: (row: number, col: number) => void;
		onDragStart?: (row: number, col: number) => void;
		onDragMove?: (row: number, col: number) => void;
	} = $props();

	let dragSource: [number, number] | null = $state(null);
	const markedSet = $derived(new Set(marked.map(([r, c]) => `${r},${c}`)));
	const calledSet = $derived(new Set(calledNumbers));

	function isMarked(r: number, c: number) { return markedSet.has(`${r},${c}`); }

	function handleValueChange(r: number, c: number, newVal: number) {
		if (!onGridChange) return;
		const g = grid.map((row) => [...row]);
		for (let rr = 0; rr < 5; rr++) for (let cc = 0; cc < 5; cc++) {
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
	<div class="flex gap-1.5 sm:gap-2 mb-1">
		{#each BINGO_LETTERS as letter, i (i)}
			<div class="h-10 w-14 sm:h-12 sm:w-16 flex items-center justify-center rounded-[10px] text-lg sm:text-xl text-white"
				style="background: {LETTER_COLORS[i]}; box-shadow: 0 3px 0 rgba(0,0,0,0.2); text-shadow: 0 1px 0 rgba(0,0,0,0.15);">
				{letter}
			</div>
		{/each}
	</div>

	{#each grid as gridRow, r (r)}
		<div class="flex gap-1.5 sm:gap-2">
			<div class="h-14 w-6 sm:h-16 sm:w-7 flex items-center justify-center rounded-[10px] text-sm sm:text-base text-white"
				style="background: {LETTER_COLORS[r]}; box-shadow: 0 3px 0 rgba(0,0,0,0.2); text-shadow: 0 1px 0 rgba(0,0,0,0.15);">
				{BINGO_LETTERS[r]}
			</div>
			{#each gridRow as cell, c (c)}
				<Cell value={cell} {r} {c} {disabled} marked={isMarked(r, c)}
					isCalled={calledSet.has(cell)}
					canInteract={editMode || (!disabled && isMarked(r, c))}
					draggable={editMode}
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
