import { query, command } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { db } from '$lib/server/db';
import { rooms, players, rounds, playerBoards } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateRoomCode, createDefaultGrid } from '$lib/server/game/utils';

export const getRoomState = query(v.string(), async (roomCode) => {
	const [room] = await db.select().from(rooms).where(eq(rooms.code, roomCode));
	if (!room) error(404, 'Room not found');

	const roomPlayers = await db
		.select()
		.from(players)
		.where(eq(players.roomId, room.id))
		.orderBy(players.joinOrder);

	// Get the latest round (any status)
	const [latestRound] = await db
		.select()
		.from(rounds)
		.where(eq(rounds.roomId, room.id))
		.orderBy(desc(rounds.createdAt))
		.limit(1);

	// Auto-confirm expired setup rounds
	if (latestRound && latestRound.status === 'setup' && latestRound.setupDeadline) {
		if (new Date() > latestRound.setupDeadline) {
			// Auto-confirm all unconfirmed boards
			const unconfirmedBoards = await db
				.select()
				.from(playerBoards)
				.where(and(eq(playerBoards.roundId, latestRound.id), eq(playerBoards.confirmed, false)));

			for (const board of unconfirmedBoards) {
				await db
					.update(playerBoards)
					.set({ confirmed: true, confirmedAt: new Date() })
					.where(eq(playerBoards.id, board.id));
			}

			// Start the round if all are now confirmed
			const allBoards = await db
				.select()
				.from(playerBoards)
				.where(eq(playerBoards.roundId, latestRound.id));

			const allConfirmed = allBoards.every((b) => b.confirmed);
			if (allConfirmed) {
				const roomPlayersForTurn = await db
					.select()
					.from(players)
					.where(eq(players.roomId, room.id))
					.orderBy(players.joinOrder);

				await db
					.update(rounds)
					.set({
						status: 'active',
						currentTurnPlayerId: roomPlayersForTurn[0]?.id,
						turnStartedAt: new Date()
					})
					.where(eq(rounds.id, latestRound.id));

				// Refetch the updated round
				const [updatedRound] = await db
					.select()
					.from(rounds)
					.where(eq(rounds.id, latestRound.id))
					.limit(1);

				if (updatedRound) {
					const boards = await db
						.select()
						.from(playerBoards)
						.where(eq(playerBoards.roundId, updatedRound.id));

					return {
						room,
						players: roomPlayers,
						round: updatedRound,
						boards
					};
				}
			}
		}
	}

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
		if (!room) error(404, 'Room not found');
		if (room.status !== 'waiting') error(400, 'Game already in progress');

		const existingPlayers = await db
			.select()
			.from(players)
			.where(eq(players.roomId, room.id));

		if (existingPlayers.length >= room.maxPlayers) {
			error(400, 'Room is full');
		}

		const nameTaken = existingPlayers.some(
			(p) => p.displayName.toLowerCase() === displayName.toLowerCase()
		);
		if (nameTaken) error(400, 'Name already taken');

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
