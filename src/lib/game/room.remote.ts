import { query, command } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '$lib/server/db';
import { rooms, players, rounds, playerBoards } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
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
