<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { createRoom, joinRoom } from '$lib/game/room.remote';
	import { showToast, getErrorMessage } from '$lib/toast';

	let mode: 'create' | 'join' = $state('create');
	let displayName = $state('');
	let maxPlayers = $state(5);
	let gridSize = $state(5);
	let setupTimeLimit = $state(30);
	let roomCode = $state('');
	let loading = $state(false);

	const SETUP_TIME_OPTIONS = [
		{ value: 10, label: '10 seconds' },
		{ value: 15, label: '15 seconds' },
		{ value: 20, label: '20 seconds' },
		{ value: 30, label: '30 seconds (default)' },
		{ value: 45, label: '45 seconds' },
		{ value: 60, label: '1 minute' },
		{ value: 90, label: '1.5 minutes' },
		{ value: 120, label: '2 minutes' }
	];

	function getWinWord(size: number): string {
		return 'BINGO' + 'O'.repeat(size - 5);
	}

	async function handleCreate() {
		loading = true;
		try {
			const result = await createRoom({ displayName, maxPlayers, gridSize, setupTimeLimit });
			localStorage.setItem(`bingo:player:${result.code}`, result.playerId);
			goto(resolve('/room/[code]', { code: result.code }));
		} catch (e: unknown) {
			showToast(getErrorMessage(e, 'Failed to create room'));
		} finally {
			loading = false;
		}
	}

	async function handleJoin() {
		loading = true;
		try {
			const result = await joinRoom({ roomCode: roomCode.toUpperCase(), displayName });
			localStorage.setItem(`bingo:player:${result.code}`, result.playerId);
			goto(resolve('/room/[code]', { code: result.code }));
		} catch (e: unknown) {
			showToast(getErrorMessage(e, 'Failed to join room'));
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<div class="card w-full max-w-md p-8 sm:p-10 animate-pop">
		<!-- Title -->
		<h1 class="mb-1 text-center text-5xl sm:text-6xl text-white" style="text-shadow: 0 4px 0 rgba(0,0,0,0.12), 0 6px 12px rgba(0,0,0,0.08);">
			Bingo
		</h1>
		<p class="mb-8 text-center text-[#7a6e60] text-sm">Multiplayer number-calling game</p>

		<!-- Tab buttons -->
		<div class="mb-6 flex gap-2">
			<button
				class="flex-1 btn-curve {mode === 'create' ? 'btn-gold' : 'btn-gray'}"
				onclick={() => (mode = 'create')}
			>
				Create
			</button>
			<button
				class="flex-1 btn-curve {mode === 'join' ? 'btn-gold' : 'btn-gray'}"
				onclick={() => (mode = 'join')}
			>
				Join
			</button>
		</div>

		{#if mode === 'create'}
			<form
				onsubmit={(e) => { e.preventDefault(); handleCreate(); }}
				class="flex flex-col gap-4"
			>
				<div>
					<label for="create-name" class="mb-1.5 block text-xs font-semibold text-[#7a6e60] uppercase tracking-wider">Your Name</label>
					<input id="create-name" type="text" bind:value={displayName} maxlength={20} required class="input" placeholder="Enter your name" />
				</div>
				<div>
					<label for="create-players" class="mb-1.5 block text-xs font-semibold text-[#7a6e60] uppercase tracking-wider">Max Players</label>
					<select id="create-players" bind:value={maxPlayers} class="input">
						{#each [2, 3, 4, 5] as n (n)}
							<option value={n}>{n} players</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="create-grid" class="mb-1.5 block text-xs font-semibold text-[#7a6e60] uppercase tracking-wider">Letter Count</label>
					<select id="create-grid" bind:value={gridSize} class="input">
						{#each [5, 6, 7, 8, 9, 10] as n (n)}
							<option value={n}>{n} — {getWinWord(n)} ({n}×{n} grid, {n} points to win)</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="create-setup" class="mb-1.5 block text-xs font-semibold text-[#7a6e60] uppercase tracking-wider">Setup Time</label>
					<select id="create-setup" bind:value={setupTimeLimit} class="input">
						{#each SETUP_TIME_OPTIONS as opt (opt.value)}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</div>
				<button type="submit" disabled={loading || !displayName.trim()} class="btn btn-gold btn-lg w-full disabled:opacity-50">
					{loading ? 'Creating...' : 'Create Room'}
				</button>
			</form>
		{:else}
			<form
				onsubmit={(e) => { e.preventDefault(); handleJoin(); }}
				class="flex flex-col gap-4"
			>
				<div>
					<label for="join-code" class="mb-1.5 block text-xs font-semibold text-[#7a6e60] uppercase tracking-wider">Room Code</label>
					<input id="join-code" type="text" bind:value={roomCode} maxlength={6} required class="input text-center text-xl tracking-widest uppercase" placeholder="ABC123" />
				</div>
				<div>
					<label for="join-name" class="mb-1.5 block text-xs font-semibold text-[#7a6e60] uppercase tracking-wider">Your Name</label>
					<input id="join-name" type="text" bind:value={displayName} maxlength={20} required class="input" placeholder="Enter your name" />
				</div>
				<button type="submit" disabled={loading || !displayName.trim() || roomCode.length < 6} class="btn btn-gold btn-lg w-full disabled:opacity-50">
					{loading ? 'Joining...' : 'Join Room'}
				</button>
			</form>
		{/if}
	</div>
</div>
