<script lang="ts">
	import Board from './Board.svelte';
	import { updateGrid, confirmBoard } from '$lib/game/board.remote';

	let {
		roomId,
		playerId,
		grid: serverGrid,
		confirmed,
		setupDeadline
	}: {
		roomId: string;
		playerId: string;
		grid: number[][];
		confirmed: boolean;
		setupDeadline: string | Date | null;
	} = $props();

	let grid = $state(serverGrid.map((r) => [...r]));
	let saving = $state(false);
	let timeLeft = $state(30);

	// Sync grid from server when not saving
	$effect(() => {
		if (!saving) {
			grid = serverGrid.map((r) => [...r]);
		}
	});

	// Countdown timer
	$effect(() => {
		const deadline = setupDeadline;
		if (!deadline) return;

		const deadlineMs = new Date(deadline).getTime();
		const update = () => {
			timeLeft = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
		};

		update();
		const interval = setInterval(update, 100);
		return () => clearInterval(interval);
	});

	const timerColor = $derived(timeLeft <= 10 ? 'text-red-400' : 'text-zinc-400');

	async function handleGridChange(newGrid: number[][]) {
		grid = newGrid;
		saving = true;
		try {
			await updateGrid({ roomId, playerId, grid });
		} catch (e) {
			console.error('Failed to save grid:', e);
		} finally {
			saving = false;
		}
	}

	async function handleConfirm() {
		saving = true;
		try {
			await confirmBoard({ roomId, playerId });
		} catch (e) {
			console.error('Failed to confirm:', e);
		} finally {
			saving = false;
		}
	}
</script>

<div class="flex flex-col items-center gap-6">
	<div class="text-center">
		<h2 class="text-xl font-bold text-white">Arrange Your Board</h2>
		<p class="mt-1 text-zinc-400">Drag cells or double-click to edit numbers</p>
	</div>

	<div class="flex items-center gap-3">
		<span class="text-sm {timerColor} font-mono">
			{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
		</span>
		{#if timeLeft <= 10 && timeLeft > 0}
			<span class="text-xs text-red-400 animate-pulse">Time running out!</span>
		{/if}
	</div>

	<div class="rounded-xl bg-zinc-900 p-4 shadow-lg">
		<Board
			{grid}
			editMode={!confirmed}
			disabled={confirmed || timeLeft === 0}
			onGridChange={confirmed ? undefined : handleGridChange}
		/>
	</div>

	{#if confirmed}
		<div class="flex items-center gap-2 text-green-400">
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
			<span class="font-medium">Board confirmed! Waiting for other players...</span>
		</div>
	{:else}
		<button
			onclick={handleConfirm}
			disabled={saving}
			class="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
		>
			{saving ? 'Saving...' : 'Confirm Board'}
		</button>
	{/if}

	{#if saving && !confirmed}
		<span class="text-xs text-zinc-500">Saving...</span>
	{/if}
</div>
