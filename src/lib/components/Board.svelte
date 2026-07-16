<script lang="ts">
	import Cell from './Cell.svelte';

	const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O'];

	let {
		grid,
		marked = [],
		calledNumbers = [],
		disabled = false,
		editMode = false,
		onGridChange,
		onCellClick
	}: {
		grid: number[][];
		marked?: [number, number][];
		calledNumbers?: number[];
		disabled?: boolean;
		editMode?: boolean;
		onGridChange?: (newGrid: number[][]) => void;
		onCellClick?: (row: number, col: number) => void;
	} = $props();

	let dragSource: [number, number] | null = $state(null);

	const markedSet = $derived(new Set(marked.map(([r, c]) => `${r},${c}`)));
	const calledSet = $derived(new Set(calledNumbers));

	function isMarked(r: number, c: number): boolean {
		return markedSet.has(`${r},${c}`);
	}

	function handleValueChange(r: number, c: number, newVal: number) {
		if (!onGridChange) return;
		const newGrid = grid.map((row) => [...row]);

		for (let rr = 0; rr < 5; rr++) {
			for (let cc = 0; cc < 5; cc++) {
				if (newGrid[rr][cc] === newVal && (rr !== r || cc !== c)) {
					newGrid[rr][cc] = grid[r][c];
					newGrid[r][c] = newVal;
					onGridChange(newGrid);
					return;
				}
			}
		}

		newGrid[r][c] = newVal;
		onGridChange(newGrid);
	}

	function handleDragStart(r: number, c: number) {
		dragSource = [r, c];
	}

	function handleDrop(r: number, c: number) {
		if (!dragSource || !onGridChange) return;
		const [sr, sc] = dragSource;
		if (sr === r && sc === c) {
			dragSource = null;
			return;
		}

		const newGrid = grid.map((row) => [...row]);
		const temp = newGrid[sr][sc];
		newGrid[sr][sc] = newGrid[r][c];
		newGrid[r][c] = temp;
		onGridChange(newGrid);
		dragSource = null;
	}
</script>

<div class="flex flex-col items-center gap-1">
	<div class="flex gap-1 mb-1">
		{#each BINGO_LETTERS as letter, i (i)}
			<div class="h-14 w-14 flex items-center justify-center text-xs font-bold text-zinc-500">
				{letter}
			</div>
		{/each}
	</div>

	{#each grid as gridRow, r (r)}
		<div class="flex gap-1">
			<div class="h-14 w-6 flex items-center justify-center text-xs font-bold text-zinc-500">
				{BINGO_LETTERS[r]}
			</div>
			{#each gridRow as cell, c (c)}
				<Cell
					value={cell}
					row={r}
					col={c}
					{disabled}
					marked={isMarked(r, c)}
					isCalled={calledSet.has(cell)}
					canInteract={editMode || (!disabled && !isMarked(r, c))}
					draggable={editMode}
					onValueChange={(val: number) => handleValueChange(r, c, val)}
					onClick={onCellClick}
					onDragStart={editMode ? handleDragStart : undefined}
					onDrop={editMode ? handleDrop : undefined}
				/>
			{/each}
		</div>
	{/each}
</div>
