<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { createRoom, joinRoom } from '$lib/game/room.remote';

	let mode: 'create' | 'join' = $state('create');
	let displayName = $state('');
	let maxPlayers = $state(5);
	let roomCode = $state('');
	let loading = $state(false);
	let errorMsg = $state('');

	async function handleCreate() {
		loading = true;
		errorMsg = '';
		try {
			const result = await createRoom({ displayName, maxPlayers });
			localStorage.setItem('playerId', result.playerId);
			goto(resolve('/room/[code]', { code: result.code }));
		} catch (e: unknown) {
			errorMsg = e instanceof Error ? e.message : 'Failed to create room';
		} finally {
			loading = false;
		}
	}

	async function handleJoin() {
		loading = true;
		errorMsg = '';
		try {
			const result = await joinRoom({ roomCode: roomCode.toUpperCase(), displayName });
			localStorage.setItem('playerId', result.playerId);
			goto(resolve('/room/[code]', { code: result.code }));
		} catch (e: unknown) {
			errorMsg = e instanceof Error ? e.message : 'Failed to join room';
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
	<div class="w-full max-w-md rounded-2xl bg-zinc-900 p-8 shadow-xl">
		<h1 class="mb-2 text-center text-3xl font-bold text-white">Bingo</h1>
		<p class="mb-8 text-center text-zinc-400">Multiplayer number-calling game</p>

		<div class="mb-6 flex gap-2 rounded-lg bg-zinc-800 p-1">
			<button
				class="flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors"
				class:bg-zinc-700={mode === 'create'}
				class:text-white={mode === 'create'}
				class:text-zinc-400={mode !== 'create'}
				onclick={() => (mode = 'create')}
			>
				Create Room
			</button>
			<button
				class="flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors"
				class:bg-zinc-700={mode === 'join'}
				class:text-white={mode === 'join'}
				class:text-zinc-400={mode !== 'join'}
				onclick={() => (mode = 'join')}
			>
				Join Room
			</button>
		</div>

		{#if errorMsg}
			<div class="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
				{errorMsg}
			</div>
		{/if}

		{#if mode === 'create'}
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleCreate();
				}}
				class="flex flex-col gap-4"
			>
				<div>
					<label for="create-name" class="mb-1 block text-sm text-zinc-400">Your Name</label>
					<input
						id="create-name"
						type="text"
						bind:value={displayName}
						maxlength={20}
						required
						class="w-full rounded-lg bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Enter your name"
					/>
				</div>
				<div>
					<label for="create-players" class="mb-1 block text-sm text-zinc-400">Max Players</label>
					<select
						id="create-players"
						bind:value={maxPlayers}
						class="w-full rounded-lg bg-zinc-800 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
					>
						{#each [2, 3, 4, 5] as n (n)}
							<option value={n}>{n} players</option>
						{/each}
					</select>
				</div>
				<button
					type="submit"
					disabled={loading || !displayName.trim()}
					class="mt-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{loading ? 'Creating...' : 'Create Room'}
				</button>
			</form>
		{:else}
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleJoin();
				}}
				class="flex flex-col gap-4"
			>
				<div>
					<label for="join-code" class="mb-1 block text-sm text-zinc-400">Room Code</label>
					<input
						id="join-code"
						type="text"
						bind:value={roomCode}
						maxlength={6}
						required
						class="w-full rounded-lg bg-zinc-800 px-4 py-3 text-white text-center text-xl font-mono tracking-widest placeholder-zinc-500 outline-none focus:ring-2 focus:ring-blue-500 uppercase"
						placeholder="ABC123"
					/>
				</div>
				<div>
					<label for="join-name" class="mb-1 block text-sm text-zinc-400">Your Name</label>
					<input
						id="join-name"
						type="text"
						bind:value={displayName}
						maxlength={20}
						required
						class="w-full rounded-lg bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Enter your name"
					/>
				</div>
				<button
					type="submit"
					disabled={loading || !displayName.trim() || roomCode.length < 6}
					class="mt-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{loading ? 'Joining...' : 'Join Room'}
				</button>
			</form>
		{/if}
	</div>
</div>
