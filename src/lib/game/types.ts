import type { rooms, players, rounds, playerBoards } from '$lib/server/db/schema';

type Room = typeof rooms.$inferSelect;
type Player = typeof players.$inferSelect;
type Round = typeof rounds.$inferSelect;
type PlayerBoard = typeof playerBoards.$inferSelect;

export interface RoomState {
	room: Room;
	players: Player[];
	round: Round | null;
	boards: PlayerBoard[];
}
