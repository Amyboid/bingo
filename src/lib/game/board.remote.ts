import { command } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '$lib/server/db';
import { rooms, players, rounds, playerBoards } from '$lib/server/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { createDefaultGrid, getLineCells } from '$lib/server/game/utils';
import { markNumberOnAllBoards } from '$lib/server/game/state';

export const updateGrid = command(
	v.object({
		roomId: v.string(),
		playerId: v.string(),
		grid: v.array(v.array(v.number()))
	}),
	async ({ roomId, playerId, grid }) => {
		const [round] = await db
			.select()
			.from(rounds)
			.where(and(eq(rounds.roomId, roomId), eq(rounds.status, 'setup')))
			.limit(1);
		if (!round) error(400, 'No active setup round');

		if (round.setupDeadline && new Date() > round.setupDeadline) {
			error(400, 'Setup time expired');
		}

		const [board] = await db
			.select()
			.from(playerBoards)
			.where(and(eq(playerBoards.roundId, round.id), eq(playerBoards.playerId, playerId)))
			.limit(1);
		if (!board) error(404, 'Board not found');
		if (board.confirmed) error(400, 'Board already confirmed');

		await db
			.update(playerBoards)
			.set({ grid })
			.where(eq(playerBoards.id, board.id));
	}
);

export const confirmBoard = command(
	v.object({
		roomId: v.string(),
		playerId: v.string()
	}),
	async ({ roomId, playerId }) => {
		const [round] = await db
			.select()
			.from(rounds)
			.where(and(eq(rounds.roomId, roomId), eq(rounds.status, 'setup')))
			.limit(1);
		if (!round) error(400, 'No active setup round');

		const [board] = await db
			.select()
			.from(playerBoards)
			.where(and(eq(playerBoards.roundId, round.id), eq(playerBoards.playerId, playerId)))
			.limit(1);
		if (!board) error(404, 'Board not found');
		if (board.confirmed) error(400, 'Already confirmed');

		await db
			.update(playerBoards)
			.set({ confirmed: true, confirmedAt: new Date() })
			.where(eq(playerBoards.id, board.id));

		const totalPlayers = await db
			.select({ value: count() })
			.from(playerBoards)
			.where(eq(playerBoards.roundId, round.id));

		const confirmedPlayers = await db
			.select({ value: count() })
			.from(playerBoards)
			.where(and(eq(playerBoards.roundId, round.id), eq(playerBoards.confirmed, true)));

		const allConfirmed = totalPlayers[0].value === confirmedPlayers[0].value;

		if (allConfirmed) {
			await startRound(roomId, round.id);
		}
	}
);

export const startGame = command(
	v.object({
		roomId: v.string(),
		playerId: v.string()
	}),
	async ({ roomId, playerId }) => {
		const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
		if (!room) error(404, 'Room not found');
		if (room.hostId !== playerId) error(403, 'Only host can start');
		if (room.status !== 'waiting') error(400, 'Game already started');

		const roomPlayers = await db
			.select()
			.from(players)
			.where(eq(players.roomId, roomId))
			.orderBy(players.joinOrder);

		if (roomPlayers.length < 2) error(400, 'Need at least 2 players');

		const existingRounds = await db
			.select({ value: count() })
			.from(rounds)
			.where(eq(rounds.roomId, roomId));

		const [round] = await db
			.insert(rounds)
			.values({
				roomId,
				roundNumber: existingRounds[0].value + 1,
				status: 'setup',
				setupDeadline: new Date(Date.now() + 30_000)
			})
			.returning();

		for (const player of roomPlayers) {
			await db.insert(playerBoards).values({
				roundId: round.id,
				playerId: player.id,
				grid: createDefaultGrid(),
				marked: [],
				sweptLines: [],
				points: 0,
				confirmed: false
			});
		}

		await db.update(rooms).set({ status: 'in_progress' }).where(eq(rooms.id, roomId));
	}
);

async function startRound(roomId: string, roundId: string) {
	const roomPlayers = await db
		.select()
		.from(players)
		.where(eq(players.roomId, roomId))
		.orderBy(players.joinOrder);

	const firstPlayer = roomPlayers[0];

	await db
		.update(rounds)
		.set({
			status: 'active',
			currentTurnPlayerId: firstPlayer.id,
			turnStartedAt: new Date()
		})
		.where(eq(rounds.id, roundId));
}

export const callNumber = command(
	v.object({
		roomId: v.string(),
		playerId: v.string(),
		number: v.pipe(v.number(), v.minValue(1), v.maxValue(25))
	}),
	async ({ roomId, playerId, number }) => {
		const [round] = await db
			.select()
			.from(rounds)
			.where(and(eq(rounds.roomId, roomId), eq(rounds.status, 'active')))
			.limit(1);
		if (!round) error(400, 'No active round');

		// Check turn
		if (round.currentTurnPlayerId !== playerId) {
			error(400, 'Not your turn');
		}

		// Check if already called
		if (round.lastCalledNumber === number) {
			error(400, 'Number already called this turn');
		}

		// Check number on caller's board
		const [myBoard] = await db
			.select()
			.from(playerBoards)
			.where(and(eq(playerBoards.roundId, round.id), eq(playerBoards.playerId, playerId)))
			.limit(1);

		if (!myBoard) error(404, 'Board not found');
		const grid = myBoard.grid as number[][];
		const onBoard = grid.some((row) => row.includes(number));
		if (!onBoard) error(400, 'Number not on your board');

		// Mark on all boards
		await markNumberOnAllBoards(round.id, number);

		// Get all players for turn rotation
		const roomPlayers = await db
			.select()
			.from(players)
			.where(eq(players.roomId, roomId))
			.orderBy(players.joinOrder);

		const currentIndex = roomPlayers.findIndex((p) => p.id === playerId);
		const nextIndex = (currentIndex + 1) % roomPlayers.length;
		const nextPlayer = roomPlayers[nextIndex];

		// Update round: set turn to next player with 2s pause
		await db
			.update(rounds)
			.set({
				lastCalledNumber: number,
				currentTurnPlayerId: nextPlayer.id,
				turnStartedAt: new Date(Date.now() + 2000)
			})
			.where(eq(rounds.id, round.id));
	}
);

export const sweepLine = command(
	v.object({
		roomId: v.string(),
		playerId: v.string(),
		lineIds: v.array(v.string())
	}),
	async ({ roomId, playerId, lineIds }) => {
		const [round] = await db
			.select()
			.from(rounds)
			.where(and(eq(rounds.roomId, roomId), eq(rounds.status, 'active')))
			.limit(1);
		if (!round) error(400, 'No active round');

		if (round.currentTurnPlayerId !== playerId) {
			error(400, 'Can only sweep on your turn');
		}

		const [board] = await db
			.select()
			.from(playerBoards)
			.where(and(eq(playerBoards.roundId, round.id), eq(playerBoards.playerId, playerId)))
			.limit(1);
		if (!board) error(404, 'Board not found');

		const marked = (board.marked as [number, number][]) ?? [];
		const sweptLines = (board.sweptLines as string[]) ?? [];
		let pointsAwarded = 0;

		for (const lineId of lineIds) {
			if (sweptLines.includes(lineId)) continue;

			const cells = getLineCells(lineId);
			const markedSet = new Set(marked.map(([r, c]) => `${r},${c}`));
			const complete = cells.every(([r, c]) => markedSet.has(`${r},${c}`));
			if (!complete) continue;

			sweptLines.push(lineId);
			pointsAwarded++;
		}

		if (pointsAwarded === 0) {
			error(400, 'No valid lines to sweep');
		}

		await db
			.update(playerBoards)
			.set({
				sweptLines,
				points: board.points + pointsAwarded
			})
			.where(eq(playerBoards.id, board.id));
	}
);

export const callBingo = command(
	v.object({
		roomId: v.string(),
		playerId: v.string()
	}),
	async ({ roomId, playerId }) => {
		const [round] = await db
			.select()
			.from(rounds)
			.where(and(eq(rounds.roomId, roomId), eq(rounds.status, 'active')))
			.limit(1);
		if (!round) error(400, 'No active round');

		if (round.currentTurnPlayerId !== playerId) {
			error(400, 'Can only call Bingo on your turn');
		}

		const [board] = await db
			.select()
			.from(playerBoards)
			.where(and(eq(playerBoards.roundId, round.id), eq(playerBoards.playerId, playerId)))
			.limit(1);
		if (!board) error(404, 'Board not found');

		if (board.points < 5) {
			error(400, `Need 5 points to call Bingo (you have ${board.points})`);
		}

		// Winner! End the round
		await db
			.update(rounds)
			.set({ status: 'finished' })
			.where(eq(rounds.id, round.id));

		await db
			.update(rooms)
			.set({ status: 'round_ended' })
			.where(eq(rooms.id, roomId));

		return { winner: playerId, points: board.points };
	}
);
