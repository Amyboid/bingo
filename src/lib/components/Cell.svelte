<script lang="ts">
	let {
		value, r, c, disabled = false, marked = false, isCalled = false,
		canInteract = false, draggable = false,
		onValueChange, onClick, onDragStart, onDrop,
		onSweepDragStart, onSweepDragMove
	}: {
		value: number; r: number; c: number;
		disabled?: boolean; marked?: boolean; isCalled?: boolean;
		canInteract?: boolean; draggable?: boolean;
		onValueChange?: (val: number) => void;
		onClick?: (row: number, col: number) => void;
		onDragStart?: (row: number, col: number) => void;
		onDrop?: (row: number, col: number) => void;
		onSweepDragStart?: (row: number, col: number) => void;
		onSweepDragMove?: (row: number, col: number) => void;
	} = $props();

	let editing = $state(false);
	let editValue = $state('');
	let inputEl: HTMLInputElement | undefined = $state();
	let justMarked = $state(false);

	function handleDoubleClick() {
		if (disabled || !canInteract) return;
		editing = true;
		editValue = String(value);
		setTimeout(() => inputEl?.select(), 0);
	}

	function handleClick() { if (!editing && onClick) onClick(r, c); }
	function handleMouseDown() { if (onSweepDragStart && marked) onSweepDragStart(r, c); }
	function handleTouchStart() { if (onSweepDragStart && marked) onSweepDragStart(r, c); }

	function commitEdit() {
		const num = parseInt(editValue, 10);
		if (!isNaN(num) && num >= 1 && num <= 25 && num !== value) onValueChange?.(num);
		editing = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (editing) { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') editing = false; return; }
		if ((e.key === 'Enter' || e.key === ' ') && canInteract && onClick) { e.preventDefault(); onClick(r, c); }
	}

	function handleEditDragStartInternal(e: DragEvent) {
		e.dataTransfer?.setData('text/plain', `${r},${c}`);
		e.dataTransfer!.effectAllowed = 'move';
		onDragStart?.(r, c);
	}
	function handleDropInternal(e: DragEvent) { e.preventDefault(); onDrop?.(r, c); }

	$effect(() => {
		if (marked) { justMarked = true; const t = setTimeout(() => (justMarked = false), 400); return () => clearTimeout(t); }
	});

	const ariaLabel = $derived.by(() => {
		const l = ['B','I','N','G','O'][c] ?? '';
		const b = `${l}${value}`;
		if (editing) return `${b}, editing`;
		if (isCalled) return `${b}, called`;
		if (marked) return `${b}, marked`;
		if (disabled) return `${b}, unavailable`;
		if (canInteract) return `${b}, clickable`;
		return b;
	});

	const cellClass = $derived.by(() => {
		const base = 'relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-[10px] text-xl sm:text-2xl transition-all duration-100 select-none cursor-default ';
		if (editing) return base + 'tile ring-2 ring-[#e8a838]';
		if (isCalled) return base + 'tile tile-called ' + (justMarked ? 'animate-tile-bounce' : '');
		if (marked) return base + 'tile tile-marked cursor-grab ' + (justMarked ? 'animate-tile-bounce' : '');
		if (disabled) return base + 'tile opacity-30 cursor-not-allowed';
		if (canInteract) return base + 'tile cursor-pointer hover:-translate-y-0.5';
		return base + 'tile opacity-60';
	});
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class={cellClass} data-row={r} data-col={c} aria-label={ariaLabel}
	draggable={draggable && canInteract && !disabled}
	ondragstart={draggable ? handleEditDragStartInternal : undefined}
	ondragover={(e) => e.preventDefault()}
	ondrop={draggable ? handleDropInternal : undefined}
	onmousedown={handleMouseDown} ontouchstart={handleTouchStart}
	onclick={handleClick} ondblclick={handleDoubleClick} onkeydown={handleKeydown}
	role="button" tabindex={canInteract ? 0 : undefined}>
	{#if editing}
		<input bind:this={inputEl} type="number" min="1" max="25" bind:value={editValue}
			onblur={commitEdit} onkeydown={handleKeydown}
			class="absolute inset-0 w-full h-full rounded-[10px] bg-white text-center text-xl font-bold text-text outline-none border-2 border-primary" />
	{:else}
		{value}
	{/if}
	{#if marked && !isCalled}
		<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
			<svg class="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round">
				<line x1="7" y1="7" x2="17" y2="17" class="text-white" />
				<line x1="17" y1="7" x2="7" y2="17" class="text-white" />
			</svg>
		</div>
	{/if}
</div>
