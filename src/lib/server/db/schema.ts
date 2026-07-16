import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';

export const roomStatusEnum = pgEnum('room_status', ['waiting', 'in_progress', 'round_ended']);
export const roundStatusEnum = pgEnum('round_status', ['setup', 'active', 'finished']);

export const rooms = pgTable(
	'rooms',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		code: text('code').notNull().unique(),
		hostId: uuid('host_id').notNull(),
		maxPlayers: integer('max_players').notNull().default(5),
		status: roomStatusEnum('status').notNull().default('waiting'),
		winWord: text('win_word').notNull().default('BINGO'),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => [index('rooms_code_idx').on(table.code)]
);

export const players = pgTable(
	'players',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		roomId: uuid('room_id')
			.notNull()
			.references(() => rooms.id, { onDelete: 'cascade' }),
		displayName: text('display_name').notNull(),
		joinOrder: integer('join_order').notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => [index('players_room_id_idx').on(table.roomId)]
);

export const rounds = pgTable(
	'rounds',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		roomId: uuid('room_id')
			.notNull()
			.references(() => rooms.id, { onDelete: 'cascade' }),
		roundNumber: integer('round_number').notNull().default(1),
		status: roundStatusEnum('status').notNull().default('setup'),
		currentTurnPlayerId: uuid('current_turn_player_id'),
		lastCalledNumber: integer('last_called_number'),
		turnStartedAt: timestamp('turn_started_at'),
		setupDeadline: timestamp('setup_deadline'),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => [index('rounds_room_id_idx').on(table.roomId)]
);

export const playerBoards = pgTable(
	'player_boards',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		roundId: uuid('round_id')
			.notNull()
			.references(() => rounds.id, { onDelete: 'cascade' }),
		playerId: uuid('player_id')
			.notNull()
			.references(() => players.id, { onDelete: 'cascade' }),
		grid: jsonb('grid').notNull(),
		marked: jsonb('marked').notNull().default('[]'),
		sweptLines: jsonb('swept_lines').notNull().default('[]'),
		points: integer('points').notNull().default(0),
		confirmed: boolean('confirmed').notNull().default(false),
		confirmedAt: timestamp('confirmed_at')
	},
	(table) => [
		index('player_boards_round_id_idx').on(table.roundId),
		index('player_boards_player_id_idx').on(table.playerId)
	]
);
