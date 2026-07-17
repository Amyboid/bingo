import { query, command } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '$lib/server/db';
import { rooms, players, rounds, playerBoards } from '$lib/server/db/schema';
import { eq, and, desc, count, lt } from 'drizzle-orm';
import { generateRoomCode } from '$lib/server/game/utils';

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
		maxPlayers: v.pipe(v.number(), v.minValue(2), v.maxValue(5))
	}),
	async ({ displayName, maxPlayers }) => {
		const code = generateRoomCode();
		const tempHostId = crypto.randomUUID();
		const [room] = await db
			.insert(rooms)
			.values({ code, maxPlayers, hostId: tempHostId })
			.returning();

		const [player] = await db
			.insert(players)
			.values({ roomId: room.id, displayName, joinOrder: 1 })
			.returning();

		await db.update(rooms).set({ hostId: player.id }).where(eq(rooms.id, room.id));

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
		if (!room) throw new Error('Room not found');
		if (room.status !== 'waiting') throw new Error('Game already in progress');

		const existingPlayers = await db
			.select()
			.from(players)
			.where(eq(players.roomId, room.id));

		if (existingPlayers.length >= room.maxPlayers) {
			throw new Error('Room is full');
		}

		const nameTaken = existingPlayers.some(
			(p) => p.displayName.toLowerCase() === displayName.toLowerCase()
		);
		if (nameTaken) throw new Error('Name already taken');

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

export const leaveRoom = command(
	v.object({
		roomId: v.string(),
		playerId: v.string()
	}),
	async ({ roomId, playerId }) => {
		const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
		if (!room) throw new Error('Room not found');

		const [player] = await db
			.select()
			.from(players)
			.where(and(eq(players.roomId, roomId), eq(players.id, playerId)))
			.limit(1);
		if (!player) throw new Error('Player not in this room');

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
				.where(and(eq(rounds.roomId, roomId), eq(rounds.status, 'active')))
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

		// Delete stale rooms (cascade will handle players, rounds, boards)
		for (const roomId of allStaleIds) {
			await db.delete(rooms).where(eq(rooms.id, roomId));
		}

		return { cleaned: allStaleIds.length };
	}
);
