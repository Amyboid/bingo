<script lang="ts">
	import { page } from '$app/state';
	import { getRoomState } from '$lib/game/room.remote';
	import { startGame } from '$lib/game/board.remote';
	import Lobby from '$lib/components/Lobby.svelte';
	import PlayerList from '$lib/components/PlayerList.svelte';
	import SetupPhase from '$lib/components/SetupPhase.svelte';
	import PlayPhase from '$lib/components/PlayPhase.svelte';
	import WinOverlay from '$lib/components/WinOverlay.svelte';
	import type { RoomState } from '$lib/game/types';

	const roomCode = $derived(page.params.code ?? '');
	const playerId: string | null = $state(typeof localStorage !== 'undefined' ? localStorage.getItem('playerId') : null);

	let tick = $state(0);
	let roomData = $state<RoomState | null>(null);
	let loading = $state(true);

	const currentPlayer = $derived(roomData?.players.find((p) => p.id === playerId));
	const isHost = $derived(roomData?.room.hostId === playerId);
	const myBoard = $derived(roomData?.boards.find((b) => b.playerId === playerId));

	const allCalledNumbers = $derived.by(() => {
		if (!roomData?.round) return [];
		const nums: number[] = [];
		if (roomData.round.lastCalledNumber !== null) {
			for (const board of roomData.boards) {
				const grid = board.grid as number[][];
				const marked = (board.marked as [number, number][]) ?? [];
				for (const [r, c] of marked) {
					const num = grid[r]?.[c];
					if (num && !nums.includes(num)) nums.push(num);
				}
			}
		}
		return nums;
	});

	const winner = $derived.by(() => {
		if (roomData?.room.status !== 'round_ended') return null;
		const winnerBoard = roomData.boards.find((b) => b.points >= 5);
		if (!winnerBoard) return null;
		const winnerPlayer = roomData.players.find((p) => p.id === winnerBoard.playerId);
		return winnerPlayer
			? { name: winnerPlayer.displayName, points: winnerBoard.points }
			: null;
	});

	const playerScores = $derived(
		(roomData?.players ?? []).map((p) => ({
			displayName: p.displayName,
			points: roomData?.boards.find((b) => b.playerId === p.id)?.points ?? 0
		}))
	);

	async function fetchState() {
		try {
			roomData = await getRoomState(roomCode);
			loading = false;
		} catch (e) {
			console.error('Failed to fetch room state:', e);
		}
	}

	// Initial fetch
	$effect(() => {
		loading = true;
		fetchState();
	});

	// Polling loop
	$effect(() => {
		const interval = setInterval(() => {
			tick++;
		}, roomData?.round?.status === 'active' ? 1000 : 1500);
		return () => clearInterval(interval);
	});

	// Re-fetch on tick
	$effect(() => {
		if (tick > 0) {
			fetchState();
		}
	});

	async function handleStartGame() {
		if (!roomData) return;
		try {
			await startGame({ roomId: roomData.room.id, playerId: playerId! });
			await fetchState();
		} catch (e) {
			console.error('Failed to start game:', e);
		}
	}
</script>

<div class="flex min-h-screen bg-zinc-950">
	<aside class="w-56 border-r border-zinc-800 p-4">
		<div class="mb-4 flex items-center gap-2">
			<h1 class="text-lg font-bold text-white">Bingo</h1>
			<button
				onclick={() => navigator.clipboard?.writeText(roomCode)}
				class="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 font-mono hover:bg-zinc-700 transition-colors cursor-pointer"
				title="Click to copy"
			>
				{roomCode}
			</button>
		</div>
		{#if roomData}
			<PlayerList
				players={roomData.players}
				currentPlayerId={playerId}
				currentTurnPlayerId={roomData.round?.currentTurnPlayerId}
			/>
		{/if}
	</aside>

	<main class="flex flex-1 items-center justify-center p-8">
		{#if loading}
			<div class="text-center">
				<h2 class="text-xl font-bold text-white">Loading...</h2>
			</div>
		{:else if roomData?.room.status === 'waiting'}
			<Lobby
				players={roomData.players}
				maxPlayers={roomData.room.maxPlayers}
				{isHost}
				onStartGame={handleStartGame}
			/>
		{:else if roomData?.round?.status === 'setup' && myBoard}
			<SetupPhase
				roomId={roomData.room.id}
				playerId={playerId!}
				grid={myBoard.grid as number[][]}
				confirmed={myBoard.confirmed}
				setupDeadline={roomData.round.setupDeadline}
			/>
		{:else if roomData?.round?.status === 'active' && myBoard}
			<PlayPhase
				roomId={roomData.room.id}
				playerId={playerId!}
				grid={myBoard.grid as number[][]}
				marked={(myBoard.marked as [number, number][]) ?? []}
				points={myBoard.points}
				sweptLines={(myBoard.sweptLines as string[]) ?? []}
				currentTurnPlayerId={roomData.round.currentTurnPlayerId!}
				lastCalledNumber={roomData.round.lastCalledNumber}
				turnStartedAt={roomData.round.turnStartedAt}
				playerName={currentPlayer?.displayName ?? 'Unknown'}
				{allCalledNumbers}
			/>
		{:else}
			<div class="text-center">
				<h2 class="text-xl font-bold text-white">Loading...</h2>
			</div>
		{/if}
	</main>
</div>

{#if winner}
	<WinOverlay
		winnerName={winner.name}
		points={winner.points}
		allPlayers={playerScores}
		{isHost}
		onPlayAgain={handleStartGame}
	/>
{/if}
