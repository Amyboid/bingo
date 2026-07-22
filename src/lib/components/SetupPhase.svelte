<script lang="ts">
	import Board from './Board.svelte';
	import { updateGrid, confirmBoard } from '$lib/game/board.remote';

	let {
		roomId,
		playerId,
		grid: serverGrid,
		winWord = 'BINGO',
		confirmed,
		setupDeadline
	}: {
		roomId: string;
		playerId: string;
		grid: number[][];
		winWord?: string;
		confirmed: boolean;
		setupDeadline: string | Date | null;
	} = $props();

	let grid = $state(serverGrid.map((r) => [...r]));
	let saving = $state(false);
	let timeLeft = $state(30);

	// Responsive cell sizing (same as PlayPhase)
	let windowWidth = $state(typeof window !== 'undefined' ? window.innerWidth : 1024);

	$effect(() => {
		const onResize = () => { windowWidth = window.innerWidth; };
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});

	const gridSize = $derived(winWord.length);
	const isSmall = $derived(windowWidth >= 640);
	const GAP = $derived(isSmall ? 8 : 6);
	const PADDING = $derived(isSmall ? 24 : 16);
	const maxBoardWidth = $derived(windowWidth - PADDING * 2 - 32);
	const maxCell = $derived(Math.floor((maxBoardWidth - (gridSize - 1) * GAP) / gridSize));
	const CELL = $derived(Math.min(isSmall ? 64 : 56, Math.max(maxCell, 28)));

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

	const timerColor = $derived(timeLeft <= 10 ? 'text-secondary' : 'text-text');

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
		<p class="mt-2 text-text-light text-sm">Drag cells or double-click to edit numbers</p>
	</div>

	<div class="card flex items-center gap-3 px-4 py-2">
		<span class="text-lg font-mono {timeLeft <= 10 ? 'text-secondary' : 'text-text'}">
			{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
		</span>
		{#if timeLeft <= 10 && timeLeft > 0}
			<span class="text-xs text-secondary font-semibold animate-pulse">Hurry!</span>
		{/if}
	</div>

	<div class="card p-4 sm:p-6 overflow-hidden max-w-full">
		<Board
			{grid}
			{winWord}
			cellSize={CELL}
			editMode={!confirmed}
			disabled={confirmed || timeLeft === 0}
			onGridChange={confirmed ? undefined : handleGridChange}
		/>
	</div>

	{#if confirmed}
		<div class="card flex items-center gap-3 px-5 py-3 border-2 border-success/40">
			<div class="h-6 w-6 rounded-full bg-success/20 flex items-center justify-center">
				<svg class="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
			</div>
			<span class="text-sm font-semibold text-success">Board locked! Waiting...</span>
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
		<span class="text-xs text-muted">Saving...</span>
	{/if}
</div>
