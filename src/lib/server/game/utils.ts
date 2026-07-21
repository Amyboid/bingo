// Server-only utilities — re-exports shared utils plus server-exclusive functions

export { getLineCells, getAllLineIds, isLineComplete, getCompletableLines, numberOnGrid } from '$lib/game/utils';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
	let code = '';
	for (let i = 0; i < 6; i++) {
		code += CHARS[Math.floor(Math.random() * CHARS.length)];
	}
	return code;
}

export function createDefaultGrid(gridSize: number = 5): number[][] {
	const total = gridSize * gridSize;
	const nums = Array.from({ length: total }, (_, i) => i + 1);
	shuffle(nums);
	const grid: number[][] = [];
	for (let r = 0; r < gridSize; r++) {
		grid.push(nums.slice(r * gridSize, r * gridSize + gridSize));
	}
	return grid;
}

export function generateWinWord(gridSize: number): string {
	return 'BINGO' + 'O'.repeat(gridSize - 5);
}

export function shuffle(arr: number[]): void {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
}
