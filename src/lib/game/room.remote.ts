import { query, command } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '$lib/server/db';
import { rooms, players, rounds, playerBoards } from '$lib/server/db/schema';
import { eq, and, or, desc, lt, count } from 'drizzle-orm';
import { generateRoomCode, generateWinWord } from '$lib/server/game/utils';

async function runCleanup() {
	const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

	const staleRooms = await db
		.select({ id: rooms.id })
		.from(rooms)
		.where(and(lt(rooms.createdAt, oneDayAgo), eq(rooms.status, 'waiting')))
		.limit(50);

	const endedRooms = await db
		.select({ id: rooms.id })
		.from(rooms)
		.where(and(lt(rooms.createdAt, oneDayAgo), eq(rooms.status, 'round_ended')))
		.limit(50);

	const allStaleIds = [...staleRooms, ...endedRooms].map((r) => r.id);

	for (const roomId of allStaleIds) {
		const playerCount = await db
			.select({ value: count() })
			.from(players)
			.where(eq(players.roomId, roomId));

		if (playerCount[0].value === 0) {
			await db.delete(rooms).where(eq(rooms.id, roomId));
		}
	}
}

export const getRoomState = query(v.string(), async (roomCode) => {
	const [room] = await db.select().from(rooms).where(eq(rooms.code, roomCode));
	if (!room) error(404, 'Room not found');

	const roomPlayers = await db
		.select()
		.from(players)
		.where(eq(players.roomId, room.id))
		.orderBy(players.joinOrder);

	const [latestRound] = await db
		.select()
		.from(rounds)
		.where(eq(rounds.roomId, room.id))
		.orderBy(desc(rounds.createdAt))
		.limit(1);

	const allBoards = latestRound
		? await db
				.select()
				.from(playerBoards)
				.where(eq(playerBoards.roundId, latestRound.id))
		: [];

	return {
		room,
		players: roomPlayers,
		round: latestRound ?? null,
		boards: allBoards
	};
});

export const createRoom = command(
	v.object({
		displayName: v.pipe(v.string(), v.minLength(1, 'Name is required'), v.maxLength(20)),
		maxPlayers: v.pipe(v.number(), v.minValue(2), v.maxValue(5)),
		gridSize: v.optional(v.pipe(v.number(), v.minValue(5), v.maxValue(10)), 5),
		setupTimeLimit: v.optional(v.pipe(v.number(), v.minValue(10), v.maxValue(120)), 30)
	}),
	async ({ displayName, maxPlayers, gridSize, setupTimeLimit }) => {
		const code = generateRoomCode();
		const tempHostId = crypto.randomUUID();
		const winWord = generateWinWord(gridSize);
		const [room] = await db
			.insert(rooms)
			.values({ code, maxPlayers, hostId: tempHostId, winWord, gridSize, setupTimeLimit })
			.returning();

		const [player] = await db
			.insert(players)
			.values({ roomId: room.id, displayName, joinOrder: 1 })
			.returning();

		await db.update(rooms).set({ hostId: player.id }).where(eq(rooms.id, room.id));

		// Background cleanup of stale rooms
		runCleanup().catch(() => {});

		return { code, playerId: player.id };
	}
);

export const joinRoom = command(
	v.object({
		roomCode: v.pipe(v.string(), v.minLength(6), v.maxLength(6)),
		displayName: v.pipe(v.string(), v.minLength(1, 'Name is required'), v.maxLength(20))
	}),
	async ({ roomCode, displayName }) => {
		const [room] = await db.select().from(rooms).where(eq(rooms.code, roomCode));
		if (!room) error(400,'Room not found');
		if (room.status !== 'waiting') error(400,'Game already in progress');

		const existingPlayers = await db
			.select()
			.from(players)
			.where(eq(players.roomId, room.id));

		if (existingPlayers.length >= room.maxPlayers) {
			error(400,'Room is full');
		}

		const nameTaken = existingPlayers.some(
			(p) => p.displayName.toLowerCase() === displayName.toLowerCase()
		);
		if (nameTaken) error(400,'Name already taken');

		const [player] = await db
			.insert(players)
			.values({
				roomId: room.id,
				displayName,
				joinOrder: existingPlayers.length + 1
			})
			.returning();

		// Background cleanup of stale rooms
		runCleanup().catch(() => {});

		return { code: roomCode, playerId: player.id };
	}
);

export const leaveRoom = command(
	v.object({
		roomId: v.string(),
		playerId: v.string()
	}),
	async ({ roomId, playerId }) => {
		const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
		if (!room) error(400,'Room not found');

		const [player] = await db
			.select()
			.from(players)
			.where(and(eq(players.roomId, roomId), eq(players.id, playerId)))
			.limit(1);
		if (!player) error(400,'Player not in this room');

		// Delete the player (cascade will handle boards)
		await db.delete(players).where(eq(players.id, playerId));

		// Check remaining players
		const remaining = await db
			.select()
			.from(players)
			.where(eq(players.roomId, roomId))
			.orderBy(players.joinOrder);

		// If no players left, delete the room entirely
		if (remaining.length === 0) {
			await db.delete(rooms).where(eq(rooms.id, roomId));
			return { left: true, roomDeleted: true };
		}

		// If leaving player was host, transfer to next player
		if (room.hostId === playerId) {
			await db
				.update(rooms)
				.set({ hostId: remaining[0].id })
				.where(eq(rooms.id, roomId));
		}

		// If game is in progress and only 1 player remains, end the round
		if (room.status === 'in_progress' && remaining.length === 1) {
			const [latestRound] = await db
				.select()
				.from(rounds)
				.where(and(eq(rounds.roomId, roomId), or(
					eq(rounds.status, 'active'),
					eq(rounds.status, 'setup')
				)))
				.limit(1);

			if (latestRound) {
				await db
					.update(rounds)
					.set({ status: 'finished' })
					.where(eq(rounds.id, latestRound.id));

				await db
					.update(rooms)
					.set({ status: 'round_ended' })
					.where(eq(rooms.id, roomId));
			}
		}

		// If round_ended and only 1 player remains, go back to waiting
		if (room.status === 'round_ended' && remaining.length === 1) {
			await db
				.update(rooms)
				.set({ status: 'waiting' })
				.where(eq(rooms.id, roomId));
		}

		return { left: true, roomDeleted: false };
	}
);

export const cleanupStaleRooms = command(
	v.optional(v.object({}), {}),
	async () => {
		const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

		// Find stale rooms (waiting or round_ended, older than 24h)
		const staleRooms = await db
			.select({ id: rooms.id })
			.from(rooms)
			.where(
				and(
					lt(rooms.createdAt, oneDayAgo),
					eq(rooms.status, 'waiting')
				)
			)
			.limit(50);

		// Also find round_ended rooms older than 24h
		const endedRooms = await db
			.select({ id: rooms.id })
			.from(rooms)
			.where(
				and(
					lt(rooms.createdAt, oneDayAgo),
					eq(rooms.status, 'round_ended')
				)
			)
			.limit(50);

		const allStaleIds = [...staleRooms, ...endedRooms].map((r) => r.id);

		if (allStaleIds.length === 0) {
			return { cleaned: 0 };
		}

		// Only delete rooms with 0 players (cascade will handle rounds, boards)
		let cleaned = 0;
		for (const roomId of allStaleIds) {
			const playerCount = await db
				.select({ value: count() })
				.from(players)
				.where(eq(players.roomId, roomId));

			if (playerCount[0].value === 0) {
				await db.delete(rooms).where(eq(rooms.id, roomId));
				cleaned++;
			}
		}

		return { cleaned };
	}
);

export const rejoinRoom = command(
	v.object({
		roomCode: v.pipe(v.string(), v.minLength(6), v.maxLength(6)),
		displayName: v.pipe(v.string(), v.minLength(1, 'Name is required'), v.maxLength(20))
	}),
	async ({ roomCode, displayName }) => {
		const [room] = await db.select().from(rooms).where(eq(rooms.code, roomCode));
		if (!room) error(400,'Room not found');
		if (room.status === 'in_progress') error(400,'Game already in progress');

		// Check if name is taken by existing players
		const existingPlayers = await db
			.select()
			.from(players)
			.where(eq(players.roomId, room.id));

		if (existingPlayers.length >= room.maxPlayers) {
			error(400,'Room is full');
		}

		const nameTaken = existingPlayers.some(
			(p) => p.displayName.toLowerCase() === displayName.toLowerCase()
		);
		if (nameTaken) error(400,'Name already taken');

		// Create new player entry
		const [player] = await db
			.insert(players)
			.values({
				roomId: room.id,
				displayName,
				joinOrder: existingPlayers.length + 1
			})
			.returning();

		return { code: roomCode, playerId: player.id };
	}
);

export const backToLobby = command(
	v.object({
		roomId: v.string(),
		playerId: v.string()
	}),
	async ({ roomId, playerId }) => {
		const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
		if (!room) error(400,'Room not found');
		if (room.hostId !== playerId) error(400,'Only host can go back to lobby');

		// Already in lobby — nothing to do
		if (room.status === 'waiting') return { success: true };

		if (room.status !== 'round_ended') error(400,'Room is not in round_ended state');

		// Clean up old rounds
		const oldRounds = await db
			.select({ id: rounds.id })
			.from(rounds)
			.where(eq(rounds.roomId, roomId));

		for (const oldRound of oldRounds) {
			await db.delete(playerBoards).where(eq(playerBoards.roundId, oldRound.id));
			await db.delete(rounds).where(eq(rounds.id, oldRound.id));
		}

		await db
			.update(rooms)
			.set({ status: 'waiting' })
			.where(eq(rooms.id, roomId));

		return { success: true };
	}
);
