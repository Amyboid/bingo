// Shared game utilities — safe for both client and server

// Line identifiers: "row-0".."row-4", "col-0".."col-4", "diag-main", "diag-anti"
export function getAllLineIds(): string[] {
	const lines: string[] = [];
	for (let i = 0; i < 5; i++) {
		lines.push(`row-${i}`);
		lines.push(`col-${i}`);
	}
	lines.push('diag-main', 'diag-anti');
	return lines;
}

export function getLineCells(lineId: string): [number, number][] {
	if (lineId.startsWith('row-')) {
		const r = parseInt(lineId.split('-')[1]);
		return Array.from({ length: 5 }, (_, c) => [r, c]);
	}
	if (lineId.startsWith('col-')) {
		const c = parseInt(lineId.split('-')[1]);
		return Array.from({ length: 5 }, (_, r) => [r, c]);
	}
	if (lineId === 'diag-main') {
		return Array.from({ length: 5 }, (_, i) => [i, i]);
	}
	if (lineId === 'diag-anti') {
		return Array.from({ length: 5 }, (_, i) => [i, 4 - i]);
	}
	return [];
}

export function isLineComplete(lineId: string, marked: [number, number][]): boolean {
	const cells = getLineCells(lineId);
	const markedSet = new Set(marked.map(([r, c]) => `${r},${c}`));
	return cells.every(([r, c]) => markedSet.has(`${r},${c}`));
}

export function getCompletableLines(
	marked: [number, number][],
	sweptLines: string[]
): string[] {
	const sweptSet = new Set(sweptLines);
	return getAllLineIds().filter(
		(id) => !sweptSet.has(id) && isLineComplete(id, marked)
	);
}

export function numberOnGrid(grid: number[][], num: number): [number, number] | null {
	for (let r = 0; r < grid.length; r++) {
		for (let c = 0; c < grid[r].length; c++) {
			if (grid[r][c] === num) return [r, c];
		}
	}
	return null;
}
