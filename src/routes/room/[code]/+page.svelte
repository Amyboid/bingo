<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getRoomState } from '$lib/game/room.remote';
	import { startGame, checkAutoConfirm } from '$lib/game/board.remote';
	import Lobby from '$lib/components/Lobby.svelte';
	import PlayerList from '$lib/components/PlayerList.svelte';
	import SetupPhase from '$lib/components/SetupPhase.svelte';
	import PlayPhase from '$lib/components/PlayPhase.svelte';
	import WinOverlay from '$lib/components/WinOverlay.svelte';
	import { showToast } from '$lib/toast';
	import type { RoomState } from '$lib/game/types';

	const roomCode = $derived(page.params.code ?? '');
	const playerId: string | null = $state(typeof localStorage !== 'undefined' ? localStorage.getItem('playerId') : null);

	// Redirect home if no playerId
	$effect(() => {
		if (!playerId) {
			goto(resolve('/'));
		}
	});

	let roomData = $state<RoomState | null>(null);
	let loading = $state(true);

	const currentPlayer = $derived(roomData?.players.find((p) => p.id === playerId));
	const isHost = $derived(roomData?.room.hostId === playerId);
	const myBoard = $derived(roomData?.boards.find((b) => b.playerId === playerId));

	const allCalledNumbers = $derived.by(() => {
		if (!roomData?.round) return [];
		if (roomData.round.lastCalledNumber === null) return [];
		const numSet = new Set<number>();
		for (const board of roomData.boards) {
			const grid = board.grid as number[][];
			const marked = (board.marked as [number, number][]) ?? [];
			for (const [r, c] of marked) {
				const num = grid[r]?.[c];
				if (num) numSet.add(num);
			}
		}
		return [...numSet];
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

	const playerScores = $derived.by(() => {
		const boardMap = new Map(roomData?.boards.map((b) => [b.playerId, b.points]) ?? []);
		return (roomData?.players ?? []).map((p) => ({
			displayName: p.displayName,
			points: boardMap.get(p.id) ?? 0
		}));
	});

	async function fetchState() {
		try {
			const q = getRoomState(roomCode);
			await q.refresh();
			roomData = q.current ?? null;
			loading = false;

			// Auto-confirm if setup deadline passed
			if (roomData?.round?.status === 'setup' && roomData.round.setupDeadline) {
				const deadline = new Date(roomData.round.setupDeadline).getTime();
				if (Date.now() >= deadline) {
					await checkAutoConfirm({ roomId: roomData.room.id });
					// Re-fetch after auto-confirm
					const q2 = getRoomState(roomCode);
					await q2.refresh();
					roomData = q2.current ?? null;
				}
			}
		} catch (e) {
			console.error('Failed to fetch room state:', e);
		}
	}

	// Single polling effect with cleanup
	$effect(() => {
		const code = roomCode;
		loading = true;
		fetchState();

		const interval = setInterval(() => {
			fetchState();
		}, 500);

		return () => clearInterval(interval);
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

<div class="flex flex-col md:flex-row min-h-screen bg-zinc-950">
	<!-- Sidebar: horizontal on mobile, vertical on desktop -->
	<aside class="w-full md:w-56 border-b md:border-b-0 md:border-r border-zinc-800 p-4 flex md:flex-col items-center md:items-start gap-4">
		<div class="flex items-center gap-2">
			<h1 class="text-lg font-bold text-white">Bingo</h1>
			<button
				onclick={() => {
					navigator.clipboard?.writeText(roomCode).then(() => {
						showToast('Room code copied!', 'success');
					}).catch(() => {
						showToast('Failed to copy', 'error');
					});
				}}
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

	<main class="flex flex-1 items-center justify-center p-4 md:p-8">
		{#if loading}
			<div class="flex flex-col items-center gap-3">
				<div class="h-8 w-8 border-2 border-zinc-600 border-t-white rounded-full animate-spin"></div>
				<p class="text-zinc-400 text-sm">Loading...</p>
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
			<div class="flex flex-col items-center gap-3">
				<div class="h-8 w-8 border-2 border-zinc-600 border-t-white rounded-full animate-spin"></div>
				<p class="text-zinc-400 text-sm">Connecting...</p>
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
