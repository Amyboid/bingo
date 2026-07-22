<script lang="ts">
	let { open = false, onClose }: { open: boolean; onClose: () => void } = $props();
	let dialogEl: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) {
			dialogEl.showModal();
		} else if (!open && dialogEl.open) {
			dialogEl.close();
		}
	});

	function handleClose() {
		onClose();
	}
</script>

<dialog
	bind:this={dialogEl}
	onclose={handleClose}
	class="bg-card rounded-2xl shadow-xl p-0 max-w-md w-full backdrop:bg-black/40 backdrop:backdrop-blur-sm"
>
	<div class="max-h-[80vh] overflow-y-auto">
		<header class="flex items-center justify-between px-5 pt-5 pb-3">
			<h2 class="text-lg font-bold text-text">Quick Rules</h2>
			<button
				onclick={() => dialogEl?.close()}
				aria-label="Close rules"
				class="h-8 w-8 flex items-center justify-center rounded-full bg-border/50 text-text-light hover:bg-border transition-colors text-sm"
			>
				&times;
			</button>
		</header>

		<div class="px-5 pb-5 space-y-4 text-sm text-text-light">
			<section>
				<h3 class="font-semibold text-text text-xs uppercase tracking-wider mb-1">How to Play</h3>
				<ul class="space-y-1 list-disc list-inside">
					<li>Take turns calling numbers in round-robin order</li>
					<li>Called numbers mark on all boards that have them</li>
				</ul>
			</section>

			<section>
				<h3 class="font-semibold text-text text-xs uppercase tracking-wider mb-1">Scoring</h3>
				<ul class="space-y-1 list-disc list-inside">
					<li>Tap marked cells to select them</li>
					<li>Swipe across a complete row, column, or diagonal to sweep it</li>
					<li>Each swept line = 1 point</li>
				</ul>
			</section>

			<section>
				<h3 class="font-semibold text-text text-xs uppercase tracking-wider mb-1">Calling BINGO</h3>
				<ul class="space-y-1 list-disc list-inside">
					<li>BINGO button is always available</li>
					<li>Call during your turn or up to 5 seconds after</li>
					<li>Need at least as many points as grid size (e.g., 5 for 5&times;5)</li>
					<li>Calling BINGO ends the round</li>
				</ul>
			</section>

			<section>
				<h3 class="font-semibold text-text text-xs uppercase tracking-wider mb-1">Board Setup</h3>
				<ul class="space-y-1 list-disc list-inside">
					<li>Rearrange numbers before the game starts</li>
					<li>Drag cells or double-click to edit</li>
					<li>Confirm your board before the timer runs out</li>
				</ul>
			</section>

			<section>
				<h3 class="font-semibold text-text text-xs uppercase tracking-wider mb-1">Letter Cut <span class="text-muted font-normal normal-case">(Visual Helper)</span></h3>
				<ul class="space-y-1 list-disc list-inside">
					<li>Tap the BINGO letter headers above the board to cross them off</li>
					<li>This is just for your own tracking &mdash; it doesn't affect gameplay</li>
				</ul>
			</section>
		</div>
	</div>
</dialog>

<style>
	dialog {
		border: none;
		padding: 0;
		max-width: 28rem;
		width: calc(100% - 2rem);
		margin: auto;
	}
	dialog::backdrop {
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(4px);
	}
</style>
