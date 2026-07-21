<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getRoomState, leaveRoom, rejoinRoom, backToLobby } from '$lib/game/room.remote';
	import { startGame, checkAutoConfirm } from '$lib/game/board.remote';
	import Lobby from '$lib/components/Lobby.svelte';
	import PlayerList from '$lib/components/PlayerList.svelte';
	import SetupPhase from '$lib/components/SetupPhase.svelte';
	import PlayPhase from '$lib/components/PlayPhase.svelte';
	import WinOverlay from '$lib/components/WinOverlay.svelte';
	import { showToast, getErrorMessage } from '$lib/toast';
	import type { RoomState } from '$lib/game/types';

	const roomCode = $derived(page.params.code ?? '');
	const playerId: string | null = $state(
		typeof localStorage !== 'undefined'
			? localStorage.getItem(`bingo:player:${page.params.code}`)
			: null
	);

	// Redirect home if no playerId and room is not in a rejoinable state
	$effect(() => {
		if (!playerId && !loading && roomData) {
			// Allow rejoin if room is in waiting status
			if (roomData.room.status === 'waiting') {
				showRejoinForm = true;
			} else {
				goto(resolve('/'));
			}
		}
	});

	// Warn before leaving during active game
	$effect(() => {
		if (roomData?.room.status !== 'in_progress' && roomData?.round?.status !== 'active') return;

		function handleBeforeUnload(e: BeforeUnloadEvent) {
			e.preventDefault();
			e.returnValue = '';
		}

		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	});

	let roomData = $state<RoomState | null>(null);
	let loading = $state(true);
	let showLeaveConfirm = $state(false);
	let showRejoinForm = $state(false);
	let rejoinName = $state('');
	let rejoinLoading = $state(false);
	let previousHostId = $state<string | null>(null);

	// Detect host transfer and notify
	$effect(() => {
		const currentHostId = roomData?.room.hostId;
		if (currentHostId && previousHostId && currentHostId !== previousHostId && currentHostId === playerId) {
			showToast('You are now the host!', 'success');
		}
		previousHostId = currentHostId ?? null;
	});

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
			const data = q.current;
			if (data) {
				roomData = data;
				loading = false;

				// Check if player exists in the room
				if (playerId && !roomData.players.find((p) => p.id === playerId) && roomData.room.status !== 'round_ended') {
					showRejoinForm = true;
				}

				// Auto-confirm if setup deadline passed
				if (roomData?.round?.status === 'setup' && roomData.round.setupDeadline) {
					const deadline = new Date(roomData.round.setupDeadline).getTime();
					if (Date.now() >= deadline) {
						try {
							await checkAutoConfirm({ roomId: roomData.room.id });
						} catch {
							// Silently ignore — round may have already started
						}
					}
				}
			}
		} catch (e) {
			console.error('Failed to fetch room state:', e);
		}
	}

	// Polling effect with cleanup
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
		} catch (e) {
			showToast(getErrorMessage(e, 'Failed to start game'));
		}
	}

	async function handleLeaveRoom() {
		if (!roomData || !playerId) return;
		try {
			await leaveRoom({ roomId: roomData.room.id, playerId });
			localStorage.removeItem(`bingo:player:${roomCode}`);
			goto(resolve('/'));
		} catch (e) {
			showToast(getErrorMessage(e, 'Failed to leave room'));
		}
	}

	function confirmLeave() {
		showLeaveConfirm = false;
		handleLeaveRoom();
	}

	async function handleRejoin() {
		if (!rejoinName.trim()) return;
		rejoinLoading = true;
		try {
			const result = await rejoinRoom({ roomCode, displayName: rejoinName.trim() });
			localStorage.setItem(`bingo:player:${roomCode}`, result.playerId);
			// Force page reload to pick up new playerId
			window.location.reload();
		} catch (e) {
			showToast(getErrorMessage(e, 'Failed to rejoin'));
		} finally {
			rejoinLoading = false;
		}
	}

	async function handleBackToLobby() {
		if (!roomData || !playerId) return;
		try {
			await backToLobby({ roomId: roomData.room.id, playerId });
		} catch (e) {
			showToast(getErrorMessage(e, 'Failed to go back to lobby'));
		}
	}
</script>

<div class="flex flex-col md:flex-row min-h-screen bg-zinc-950">
	<!-- Sidebar -->
	<aside class="w-full md:w-56 border-b md:border-b-0 md:border-r-2 border-[#d5cec4] bg-[#f5f0e8]/80 p-4 flex md:flex-col items-center md:items-start gap-4">
		<div class="flex items-center gap-3">
			<h1 class="text-lg text-white" style="text-shadow: 0 2px 0 rgba(0,0,0,0.1);">Bingo</h1>
			<button
				onclick={() => {
					navigator.clipboard?.writeText(roomCode).then(() => {
						showToast('Room code copied!', 'success');
					}).catch(() => {
						showToast('Failed to copy', 'error');
					});
				}}
				class="btn-curve bg-[#a09890] text-xs px-3 py-1"
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
				hostId={roomData.room.hostId}
			/>
			<button
				onclick={() => (showLeaveConfirm = true)}
				class="btn-curve bg-[#e07850] text-xs px-3 py-1 mt-auto md:mt-4"
			>
				Leave
			</button>
		{/if}
	</aside>

	<main class="flex flex-1 items-center justify-center p-4 md:p-8">
		{#if loading}
			<div class="flex flex-col items-center gap-4">
				<div class="h-10 w-10 border-4 border-[#d5cec4] border-t-[#e8a838] rounded-full animate-spin"></div>
				<p class="text-[#7a6e60] text-sm">Loading...</p>
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
		{:else if roomData?.room.status === 'round_ended' && !winner}
			<div class="card flex flex-col items-center gap-5 p-8 max-w-sm w-full animate-pop">
				<h2 class="text-2xl text-[#3d3428]">Round Ended</h2>
				<p class="text-sm text-[#7a6e60] text-center">
					Not enough players to continue. Go back to lobby to invite more players.
				</p>
				<div class="w-full rounded-xl bg-[#f5f0e8] p-4">
					<h3 class="text-[10px] font-semibold text-[#aaa298] uppercase tracking-wider mb-3">Current Players</h3>
					{#each playerScores as player, i (player.displayName)}
						<div class="flex items-center justify-between py-2">
							<div class="flex items-center gap-2">
								<div class="h-5 w-5 rounded-full" style="background: {['#e07850', '#e8a838', '#7cb87a', '#6a9ecf', '#b07cc6'][i % 5]};"></div>
								<span class="text-sm font-semibold text-[#3d3428]">{player.displayName}</span>
							</div>
							<div class="flex items-center gap-0.5">
								{#each Array(5) as _, j (j)}<span class="text-xs" class:text-[#e8a838]={j < player.points} class:text-[#d5cec4]={j >= player.points}>★</span>{/each}
							</div>
						</div>
					{/each}
				</div>
				{#if isHost}
					<button onclick={handleBackToLobby} class="btn btn-gold btn-lg w-full">Back to Lobby</button>
				{:else}
					<p class="text-sm text-[#aaa298] animate-pulse">Waiting for host...</p>
				{/if}
			</div>
		{:else}
			<div class="flex flex-col items-center gap-4">
				<div class="h-10 w-10 border-4 border-[#d5cec4] border-t-[#e8a838] rounded-full animate-spin"></div>
				<p class="text-[#7a6e60] text-sm">Connecting...</p>
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

{#if showLeaveConfirm}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
		<div class="card flex flex-col items-center gap-5 p-8 mx-4 max-w-sm w-full animate-pop">
			<h2 class="text-xl text-[#3d3428]">Leave Room?</h2>
			<p class="text-sm text-[#7a6e60] text-center">
				Are you sure you want to leave? You'll need a new invite to rejoin.
			</p>
			<div class="flex gap-3 w-full">
				<button
					onclick={() => (showLeaveConfirm = false)}
					class="btn btn-gray flex-1"
				>
					Cancel
				</button>
				<button
					onclick={confirmLeave}
					class="btn btn-coral flex-1"
				>
					Leave
				</button>
			</div>
		</div>
	</div>
{/if}

{#if showRejoinForm && roomData?.room.status !== 'round_ended' && roomData?.room.status === 'waiting'}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
		<div class="card flex flex-col items-center gap-5 p-8 mx-4 max-w-sm w-full animate-pop">
			<h2 class="text-xl text-[#3d3428]">Rejoin Room?</h2>
			<p class="text-sm text-[#7a6e60] text-center">
				Your session expired. Enter your name to rejoin.
			</p>
			<form
				onsubmit={(e) => { e.preventDefault(); handleRejoin(); }}
				class="flex flex-col gap-4 w-full"
			>
				<input
					type="text"
					bind:value={rejoinName}
					maxlength={20}
					required
					class="input"
					placeholder="Enter your name"
				/>
				<button
					type="submit"
					disabled={rejoinLoading || !rejoinName.trim()}
					class="btn btn-gold w-full disabled:opacity-50"
				>
					{rejoinLoading ? 'Joining...' : 'Rejoin'}
				</button>
			</form>
		</div>
	</div>
{/if}
