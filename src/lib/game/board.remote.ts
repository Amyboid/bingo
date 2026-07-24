import { command } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '$lib/server/db';
import { rooms, players, rounds, playerBoards } from '$lib/server/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { createDefaultGrid, getLineCells } from '$lib/server/game/utils';
import { markNumberOnAllBoards } from '$lib/server/game/state';
import { getRoomState } from '$lib/game/room.remote';

// Helper: refresh query for all clients in a room
async function refreshByRoomId(roomId: string) {
	const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
	if (room) {
		void getRoomState(room.code).refresh();
	}
}

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
		if (!round) error(400,'No active setup round');

		if (round.setupDeadline && new Date() > round.setupDeadline) {
			error(400,'Setup time expired');
		}

		const [board] = await db
			.select()
			.from(playerBoards)
			.where(and(eq(playerBoards.roundId, round.id), eq(playerBoards.playerId, playerId)))
			.limit(1);
		if (!board) error(400,'Board not found');
		if (board.confirmed) error(400,'Board already confirmed');

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
		if (!round) error(400,'No active setup round');

		const [board] = await db
			.select()
			.from(playerBoards)
			.where(and(eq(playerBoards.roundId, round.id), eq(playerBoards.playerId, playerId)))
			.limit(1);
		if (!board) error(400,'Board not found');
		if (board.confirmed) error(400,'Already confirmed');

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

		// Broadcast state to room (for WebSocket clients)
		await refreshByRoomId(roomId);
	}
);

export const startGame = command(
	v.object({
		roomId: v.string(),
		playerId: v.string()
	}),
	async ({ roomId, playerId }) => {
		const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
		if (!room) error(400,'Room not found');
		if (room.hostId !== playerId) error(400,'Only host can start');
		if (room.status !== 'waiting' && room.status !== 'round_ended') {
			error(400,'Game already started');
		}

		const roomPlayers = await db
			.select()
			.from(players)
			.where(eq(players.roomId, roomId))
			.orderBy(players.joinOrder);

		if (roomPlayers.length < 2) error(400,'Need at least 2 players');

		// Clean up old rounds before creating a new one
		const oldRounds = await db
			.select({ id: rounds.id })
			.from(rounds)
			.where(eq(rounds.roomId, roomId));

		for (const oldRound of oldRounds) {
			await db.delete(playerBoards).where(eq(playerBoards.roundId, oldRound.id));
			await db.delete(rounds).where(eq(rounds.id, oldRound.id));
		}

		const [round] = await db
			.insert(rounds)
			.values({
				roomId,
				roundNumber: 1,
				status: 'setup',
				setupDeadline: new Date(Date.now() + room.setupTimeLimit * 1000)
			})
			.returning();

		for (const player of roomPlayers) {
			await db.insert(playerBoards).values({
				roundId: round.id,
				playerId: player.id,
				grid: createDefaultGrid(room.gridSize),
				marked: [],
				sweptLines: [],
				points: 0,
				confirmed: false
			});
		}

		await db.update(rooms).set({ status: 'in_progress' }).where(eq(rooms.id, roomId));

		// Broadcast state to room (for WebSocket clients)
		await refreshByRoomId(roomId);
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
		number: v.pipe(v.number(), v.minValue(1))
	}),
	async ({ roomId, playerId, number }) => {
		const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
		if (!room) error(400,'Room not found');

		const maxNumber = room.gridSize * room.gridSize;
		if (number > maxNumber) error(400,`Number must be between 1 and ${maxNumber}`);

		const [round] = await db
			.select()
			.from(rounds)
			.where(and(eq(rounds.roomId, roomId), eq(rounds.status, 'active')))
			.limit(1);
		if (!round) error(400,'No active round');

		// Check turn
		if (round.currentTurnPlayerId !== playerId) {
			error(400,'Not your turn');
		}

		// Check if already called
		if (round.lastCalledNumber === number) {
			error(400,'Number already called this turn');
		}

		// Check number on caller's board
		const [myBoard] = await db
			.select()
			.from(playerBoards)
			.where(and(eq(playerBoards.roundId, round.id), eq(playerBoards.playerId, playerId)))
			.limit(1);

		if (!myBoard) error(400,'Board not found');
		const grid = myBoard.grid as number[][];
		const onBoard = grid.some((row) => row.includes(number));
		if (!onBoard) error(400,'Number not on your board');

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

		// Update round: advance turn immediately
		await db
			.update(rounds)
			.set({
				lastCalledNumber: number,
				currentTurnPlayerId: nextPlayer.id,
				turnStartedAt: new Date()
			})
			.where(eq(rounds.id, round.id));

		// Broadcast state to room (for WebSocket clients)
		await refreshByRoomId(roomId);
	}
);

export const sweepLine = command(
	v.object({
		roomId: v.string(),
		playerId: v.string(),
		lineIds: v.array(v.string())
	}),
	async ({ roomId, playerId, lineIds }) => {
		const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
		if (!room) error(400,'Room not found');

		const [round] = await db
			.select()
			.from(rounds)
			.where(and(eq(rounds.roomId, roomId), eq(rounds.status, 'active')))
			.limit(1);
		if (!round) error(400,'No active round');

		const [board] = await db
			.select()
			.from(playerBoards)
			.where(and(eq(playerBoards.roundId, round.id), eq(playerBoards.playerId, playerId)))
			.limit(1);
		if (!board) error(400,'Board not found');

		const marked = (board.marked as [number, number][]) ?? [];
		const sweptLines = (board.sweptLines as string[]) ?? [];
		let pointsAwarded = 0;

		for (const lineId of lineIds) {
			if (sweptLines.includes(lineId)) continue;

			const cells = getLineCells(lineId, room.gridSize);
			const markedSet = new Set(marked.map(([r, c]) => `${r},${c}`));
			const complete = cells.every(([r, c]) => markedSet.has(`${r},${c}`));
			if (!complete) continue;

			sweptLines.push(lineId);
			pointsAwarded++;
		}

		if (pointsAwarded === 0) {
			error(400,'No valid lines to sweep');
		}

		await db
			.update(playerBoards)
			.set({
				sweptLines,
				points: board.points + pointsAwarded
			})
			.where(eq(playerBoards.id, board.id));

		// Broadcast state to room (for WebSocket clients)
		await refreshByRoomId(roomId);
	}
);

export const callBingo = command(
	v.object({
		roomId: v.string(),
		playerId: v.string()
	}),
	async ({ roomId, playerId }) => {
		const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
		if (!room) error(400,'Room not found');

		const [round] = await db
			.select()
			.from(rounds)
			.where(and(eq(rounds.roomId, roomId), eq(rounds.status, 'active')))
			.limit(1);
		if (!round) error(400,'No active round');

		// Allow bingo call on turn OR within 5 seconds after turn ends
		// (extra time to account for polling delay)
		const isMyTurn = round.currentTurnPlayerId === playerId;
		if (!isMyTurn) {
			const turnStartedAt = round.turnStartedAt?.getTime() ?? 0;
			const graceDeadline = turnStartedAt + 5000; // 5s after current player's turn started
			if (Date.now() > graceDeadline) {
				error(400, 'Can only call Bingo on your turn or within 5 seconds after');
			}
		}

		const [board] = await db
			.select()
			.from(playerBoards)
			.where(and(eq(playerBoards.roundId, round.id), eq(playerBoards.playerId, playerId)))
			.limit(1);
		if (!board) error(400,'Board not found');

		if (board.points < room.gridSize) {
			error(400,`Need ${room.gridSize} points to call Bingo (you have ${board.points})`);
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

		// Broadcast state to room (for WebSocket clients)
		await refreshByRoomId(roomId);

		return { winner: playerId, points: board.points };
	}
);

export const checkAutoConfirm = command(
	v.object({ roomId: v.string() }),
	async ({ roomId }) => {
		const [round] = await db
			.select()
			.from(rounds)
			.where(and(eq(rounds.roomId, roomId), eq(rounds.status, 'setup')))
			.limit(1);

		if (!round || !round.setupDeadline) return { started: false };
		if (new Date() <= round.setupDeadline) return { started: false };

		const unconfirmed = await db
			.select()
			.from(playerBoards)
			.where(and(eq(playerBoards.roundId, round.id), eq(playerBoards.confirmed, false)));

		for (const board of unconfirmed) {
			await db
				.update(playerBoards)
				.set({ confirmed: true, confirmedAt: new Date() })
				.where(eq(playerBoards.id, board.id));
		}

		const allBoards = await db
			.select()
			.from(playerBoards)
			.where(eq(playerBoards.roundId, round.id));

		if (allBoards.every((b) => b.confirmed)) {
			const roomPlayers = await db
				.select()
				.from(players)
				.where(eq(players.roomId, roomId))
				.orderBy(players.joinOrder);

			await db
				.update(rounds)
				.set({
					status: 'active',
					currentTurnPlayerId: roomPlayers[0]?.id,
					turnStartedAt: new Date()
				})
				.where(eq(rounds.id, round.id));

			// Broadcast state to room (for WebSocket clients)
			await refreshByRoomId(roomId);

			return { started: true };
		}

		return { started: false };
	}
);

export const autoCallNumber = command(
	v.object({ roomId: v.string(), playerId: v.string() }),
	async ({ roomId, playerId }) => {
		const [round] = await db
			.select()
			.from(rounds)
			.where(and(eq(rounds.roomId, roomId), eq(rounds.status, 'active')))
			.limit(1);
		if (!round) error(400,'No active round');
		if (round.currentTurnPlayerId !== playerId) error(400,'Not your turn');

		const [board] = await db
			.select()
			.from(playerBoards)
			.where(and(eq(playerBoards.roundId, round.id), eq(playerBoards.playerId, playerId)))
			.limit(1);
		if (!board) error(400,'Board not found');

		const grid = board.grid as number[][];
		const boardMarked = (board.marked as [number, number][]) ?? [];
		const markedNums = new Set(boardMarked.map(([r, c]) => grid[r]?.[c]));

		const uncalled: number[] = [];
		for (const row of grid) {
			for (const num of row) {
				if (!markedNums.has(num)) uncalled.push(num);
			}
		}

		if (uncalled.length === 0) return { autoCalled: false };

		const randomNum = uncalled[Math.floor(Math.random() * uncalled.length)];

		const roomPlayers = await db
			.select()
			.from(players)
			.where(eq(players.roomId, roomId))
			.orderBy(players.joinOrder);
		const currentIndex = roomPlayers.findIndex((p) => p.id === playerId);
		const nextPlayer = roomPlayers[(currentIndex + 1) % roomPlayers.length];

		// Atomic lock: claim the turn before marking to prevent race with autoAdvanceTurnIfNeeded
		const result = await db
			.update(rounds)
			.set({
				lastCalledNumber: randomNum,
				currentTurnPlayerId: nextPlayer.id,
				turnStartedAt: new Date()
			})
			.where(and(eq(rounds.id, round.id), eq(rounds.currentTurnPlayerId, playerId)));

		if (result.rowCount === 0) error(400, 'Turn already advanced');

		await markNumberOnAllBoards(round.id, randomNum);

		// Broadcast state to room (for WebSocket clients)
		await refreshByRoomId(roomId);

		return { autoCalled: true, number: randomNum };
	}
);
