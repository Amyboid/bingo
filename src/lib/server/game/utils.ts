// Server-only utilities — re-exports shared utils plus server-exclusive functions

import { db } from '$lib/server/db';
import { rooms, players, rounds, playerBoards } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { markNumberOnAllBoards } from './state';

export { getLineCells, getAllLineIds, isLineComplete, getCompletableLines, numberOnGrid } from '$lib/game/utils';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TURN_TIMEOUT_MS = 35_000; // 35s — 5s grace after client's 30s timer

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

/**
 * Server-side auto-advance: if the current turn has expired (35s),
 * pick a random uncalled number, mark it, and advance to the next player.
 * Called from getRoomState so any client's poll triggers the advance.
 */
export async function autoAdvanceTurnIfNeeded(roomId: string): Promise<boolean> {
	const [round] = await db
		.select()
		.from(rounds)
		.where(and(eq(rounds.roomId, roomId), eq(rounds.status, 'active')))
		.limit(1);

	if (!round || !round.currentTurnPlayerId || !round.turnStartedAt) return false;

	const elapsed = Date.now() - new Date(round.turnStartedAt).getTime();
	console.log(`[auto-advance] roomId=${roomId} elapsed=${elapsed}ms timeout=${TURN_TIMEOUT_MS}ms`);
	if (elapsed < TURN_TIMEOUT_MS) return false;
	console.log(`[auto-advance] ADVANCING TURN for room ${roomId}`);

	// Save current state for optimistic locking
	const currentTurnPlayerId = round.currentTurnPlayerId;
	const currentTurnStartedAt = round.turnStartedAt;
	const roundId = round.id;

	// ATOMIC LOCK: Try to update turnStartedAt only if it hasn't changed
	// This prevents two processes from advancing the same turn
	const newTimestamp = new Date();
	await db
		.update(rounds)
		.set({ turnStartedAt: newTimestamp })
		.where(and(
			eq(rounds.id, roundId),
			eq(rounds.turnStartedAt, currentTurnStartedAt)
		));

	// Verify lock acquired: re-read and check if OUR timestamp was written
	const [checkRound] = await db
		.select()
		.from(rounds)
		.where(eq(rounds.id, roundId))
		.limit(1);

	// If the timestamp doesn't match what we wrote, another process won the race
	if (checkRound.turnStartedAt.getTime() !== newTimestamp.getTime()) {
		console.log(`[auto-advance] SKIP: turn already advanced by another process`);
		return false;
	}

	// Find the current player's board to determine uncalled numbers
	const [board] = await db
		.select()
		.from(playerBoards)
		.where(and(eq(playerBoards.roundId, roundId), eq(playerBoards.playerId, currentTurnPlayerId)))
		.limit(1);

	if (!board) return false;

	const grid = board.grid as number[][];
	const boardMarked = (board.marked as [number, number][]) ?? [];
	const markedNums = new Set(boardMarked.map(([r, c]) => grid[r]?.[c]));

	const uncalled: number[] = [];
	for (const row of grid) {
		for (const num of row) {
			if (!markedNums.has(num)) uncalled.push(num);
		}
	}

	if (uncalled.length === 0) return false;

	const randomNum = uncalled[Math.floor(Math.random() * uncalled.length)];

	// Mark on all boards
	await markNumberOnAllBoards(roundId, randomNum);

	// Advance to next player
	const roomPlayers = await db
		.select()
		.from(players)
		.where(eq(players.roomId, roomId))
		.orderBy(players.joinOrder);

	const currentIndex = roomPlayers.findIndex((p) => p.id === currentTurnPlayerId);
	const nextPlayer = roomPlayers[(currentIndex + 1) % roomPlayers.length];

	await db
		.update(rounds)
		.set({
			lastCalledNumber: randomNum,
			currentTurnPlayerId: nextPlayer.id,
			turnStartedAt: new Date()
		})
		.where(eq(rounds.id, roundId));

	console.log(`[auto-advance] Completed: called ${randomNum}, next player ${nextPlayer.id}`);
	return true;
}
