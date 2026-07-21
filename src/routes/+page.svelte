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
		{ value: 10, label: '10s' },
		{ value: 15, label: '15s' },
		{ value: 20, label: '20s' },
		{ value: 30, label: '30s' },
		{ value: 45, label: '45s' },
		{ value: 60, label: '1m' },
		{ value: 90, label: '1.5m' },
		{ value: 120, label: '2m' }
	];

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
	<div class="w-full max-w-md animate-pop">
		<!-- Title -->
		<h1 class="mb-1 text-center text-5xl sm:text-6xl text-white" style="text-shadow: 0 4px 0 rgba(0,0,0,0.12), 0 6px 12px rgba(0,0,0,0.08);">
			Bingo
		</h1>
		<p class="mb-8 text-center text-text-light text-sm">Multiplayer number-calling game</p>

		<!-- Tab buttons -->
		<div class="mb-8 flex gap-2">
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
				class="flex flex-col gap-6"
			>
				<!-- Name -->
				<div>
					<p class="text-[10px] font-semibold text-text-light uppercase tracking-widest mb-2" style="text-shadow: 0 1px 0 rgba(255,255,255,0.6);">Your Name</p>
					<input type="text" bind:value={displayName} maxlength={20} required class="input" placeholder="Enter your name" />
				</div>

				<!-- Players -->
				<div>
					<p class="text-[10px] font-semibold text-text-light uppercase tracking-widest mb-2" style="text-shadow: 0 1px 0 rgba(255,255,255,0.6);">Players</p>
					<div class="flex gap-2">
						{#each [2, 3, 4, 5] as n (n)}
							<button
								type="button"
								class="btn-option flex-1 {maxPlayers === n ? 'btn-option-active' : ''}"
								onclick={() => (maxPlayers = n)}
							>
								{n}
							</button>
						{/each}
					</div>
				</div>

				<!-- Grid Size -->
				<div>
					<p class="text-[10px] font-semibold text-text-light uppercase tracking-widest mb-2" style="text-shadow: 0 1px 0 rgba(255,255,255,0.6);">Grid Size</p>
					<div class="flex gap-2 flex-wrap justify-center">
						{#each [5, 6, 7, 8, 9, 10] as n (n)}
							<button
								type="button"
								class="btn-option {gridSize === n ? 'btn-option-active' : ''}"
								onclick={() => (gridSize = n)}
							>
								{n}
							</button>
						{/each}
					</div>
					<p class="text-xs text-text-light text-center mt-2">{gridSize}×{gridSize} · {gridSize} points to win</p>
				</div>

				<!-- Setup Time -->
				<div>
					<p class="text-[10px] font-semibold text-text-light uppercase tracking-widest mb-2" style="text-shadow: 0 1px 0 rgba(255,255,255,0.6);">Setup Time</p>
					<div class="flex gap-2 flex-wrap justify-center">
						{#each SETUP_TIME_OPTIONS as opt (opt.value)}
							<button
								type="button"
								class="btn-option {setupTimeLimit === opt.value ? 'btn-option-active' : ''}"
								onclick={() => (setupTimeLimit = opt.value)}
							>
								{opt.label}
							</button>
						{/each}
					</div>
				</div>

				<!-- Create button -->
				<button type="submit" disabled={loading || !displayName.trim()} class="btn btn-gold btn-lg w-full disabled:opacity-50 mt-2">
					{loading ? 'Creating...' : 'Create Room'}
				</button>
			</form>
		{:else}
			<form
				onsubmit={(e) => { e.preventDefault(); handleJoin(); }}
				class="flex flex-col gap-6"
			>
				<!-- Room Code -->
				<div>
					<p class="text-[10px] font-semibold text-text-light uppercase tracking-widest mb-2" style="text-shadow: 0 1px 0 rgba(255,255,255,0.6);">Room Code</p>
					<input type="text" bind:value={roomCode} maxlength={6} required class="input text-center text-xl tracking-widest uppercase" placeholder="ABC123" />
				</div>

				<!-- Name -->
				<div>
					<p class="text-[10px] font-semibold text-text-light uppercase tracking-widest mb-2" style="text-shadow: 0 1px 0 rgba(255,255,255,0.6);">Your Name</p>
					<input type="text" bind:value={displayName} maxlength={20} required class="input" placeholder="Enter your name" />
				</div>

				<!-- Join button -->
				<button type="submit" disabled={loading || !displayName.trim() || roomCode.length < 6} class="btn btn-gold btn-lg w-full disabled:opacity-50 mt-2">
					{loading ? 'Joining...' : 'Join Room'}
				</button>
			</form>
		{/if}
	</div>
</div>
