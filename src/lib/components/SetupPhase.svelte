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
		<h2 class="text-2xl sm:text-3xl text-white" style="text-shadow: 0 3px 0 rgba(0,0,0,0.1);">Arrange Your Board</h2>
		<p class="mt-2 text-[#7a6e60] text-sm">Drag cells or double-click to edit numbers</p>
	</div>

	<div class="card flex items-center gap-3 px-4 py-2">
		<span class="text-lg font-mono {timeLeft <= 10 ? 'text-[#e07850]' : 'text-[#3d3428]'}">
			{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
		</span>
		{#if timeLeft <= 10 && timeLeft > 0}
			<span class="text-xs text-[#e07850] font-semibold animate-pulse">Hurry!</span>
		{/if}
	</div>

	<div class="card p-4 sm:p-6">
		<Board
			{grid}
			editMode={!confirmed}
			disabled={confirmed || timeLeft === 0}
			onGridChange={confirmed ? undefined : handleGridChange}
		/>
	</div>

	{#if confirmed}
		<div class="card flex items-center gap-3 px-5 py-3 border-2 border-[#7cb87a]/40">
			<div class="h-6 w-6 rounded-full bg-[#7cb87a]/20 flex items-center justify-center">
				<svg class="h-4 w-4 text-[#7cb87a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
			</div>
			<span class="text-sm font-semibold text-[#5e9a5c]">Board locked! Waiting...</span>
		</div>
	{:else}
		<button
			onclick={handleConfirm}
			disabled={saving}
			class="btn btn-green disabled:opacity-50"
		>
			{saving ? 'Saving...' : 'Confirm Board'}
		</button>
	{/if}

	{#if saving && !confirmed}
		<span class="text-xs text-zinc-500">Saving...</span>
	{/if}
</div>
