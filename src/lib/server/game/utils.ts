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

export function createDefaultGrid(): number[][] {
	const nums = Array.from({ length: 25 }, (_, i) => i + 1);
	shuffle(nums);
	const grid: number[][] = [];
	for (let r = 0; r < 5; r++) {
		grid.push(nums.slice(r * 5, r * 5 + 5));
	}
	return grid;
}

export function shuffle(arr: number[]): void {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
}
