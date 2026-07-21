import { db } from '$lib/server/db';
import { playerBoards } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { getLineCells, isLineComplete, getCompletableLines } from './utils';

export async function markNumberOnAllBoards(
	roundId: string,
	calledNumber: number
): Promise<void> {
	const boards = await db
		.select()
		.from(playerBoards)
		.where(eq(playerBoards.roundId, roundId));

	for (const board of boards) {
		const grid = board.grid as number[][];
		const marked = (board.marked as [number, number][]) ?? [];

		for (let r = 0; r < grid.length; r++) {
			for (let c = 0; c < grid[r].length; c++) {
				if (grid[r][c] === calledNumber) {
					const alreadyMarked = marked.some(([mr, mc]) => mr === r && mc === c);
					if (!alreadyMarked) {
						marked.push([r, c]);
					}
				}
			}
		}

		await db
			.update(playerBoards)
			.set({ marked })
			.where(eq(playerBoards.id, board.id));
	}
}

export async function getCompletableLinesForBoard(
	boardId: string,
	gridSize: number = 5
): Promise<string[]> {
	const [board] = await db
		.select()
		.from(playerBoards)
		.where(eq(playerBoards.id, boardId))
		.limit(1);

	if (!board) return [];

	const marked = (board.marked as [number, number][]) ?? [];
	const sweptLines = (board.sweptLines as string[]) ?? [];

	return getCompletableLines(marked, sweptLines, gridSize);
}

export function validateCallNumber(
	grid: number[][],
	number: number,
	calledNumbers: number[],
	gridSize: number = 5
): { valid: boolean; error?: string } {
	const maxNumber = gridSize * gridSize;
	if (number < 1 || number > maxNumber) {
		return { valid: false, error: `Number must be between 1 and ${maxNumber}` };
	}
	if (calledNumbers.includes(number)) {
		return { valid: false, error: 'Number already called' };
	}

	// Check if the number is on the player's grid
	const found = grid.some((row) => row.includes(number));
	if (!found) {
		return { valid: false, error: 'Number not on your board' };
	}

	return { valid: true };
}

export function validateSweepLine(
	sweptLines: string[],
	lineId: string,
	marked: [number, number][],
	gridSize: number = 5
): { valid: boolean; error?: string } {
	if (sweptLines.includes(lineId)) {
		return { valid: false, error: 'Line already swept' };
	}

	const cells = getLineCells(lineId, gridSize);
	const markedSet = new Set(marked.map(([r, c]) => `${r},${c}`));
	const allMarked = cells.every(([r, c]) => markedSet.has(`${r},${c}`));

	if (!allMarked) {
		return { valid: false, error: 'Line not complete' };
	}

	return { valid: true };
}
