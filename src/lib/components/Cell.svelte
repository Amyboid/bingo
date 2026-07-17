<script lang="ts">
	let {
		value,
		r,
		c,
		disabled = false,
		marked = false,
		isCalled = false,
		canInteract = false,
		draggable = false,
		onValueChange,
		onClick,
		onDragStart,
		onDrop,
		onSweepDragStart,
		onSweepDragMove
	}: {
		value: number;
		r: number;
		c: number;
		disabled?: boolean;
		marked?: boolean;
		isCalled?: boolean;
		canInteract?: boolean;
		draggable?: boolean;
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

	function handleDoubleClick() {
		if (disabled || !canInteract) return;
		editing = true;
		editValue = String(value);
		setTimeout(() => inputEl?.select(), 0);
	}

	function handleClick() {
		if (!editing && onClick) {
			onClick(r, c);
		}
	}

	function handleMouseDown() {
		if (onSweepDragStart && marked) {
			onSweepDragStart(r, c);
		}
	}

	function handleTouchStart() {
		if (onSweepDragStart && marked) {
			onSweepDragStart(r, c);
		}
	}

	function commitEdit() {
		const num = parseInt(editValue, 10);
		if (!isNaN(num) && num >= 1 && num <= 25 && num !== value) {
			onValueChange?.(num);
		}
		editing = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (editing) {
			if (e.key === 'Enter') commitEdit();
			if (e.key === 'Escape') editing = false;
			return;
		}
		// Non-editing: Enter/Space triggers click for keyboard users
		if ((e.key === 'Enter' || e.key === ' ') && canInteract && onClick) {
			e.preventDefault();
			onClick(r, c);
		}
	}

	const ariaLabel = $derived.by(() => {
		const colLetter = ['B', 'I', 'N', 'G', 'O'][c] ?? '';
		const base = `${colLetter}${value}`;
		if (editing) return `${base}, editing`;
		if (isCalled) return `${base}, called`;
		if (marked) return `${base}, marked`;
		if (disabled) return `${base}, unavailable`;
		if (canInteract) return `${base}, clickable`;
		return base;
	});

	function handleEditDragStartInternal(e: DragEvent) {
		e.dataTransfer?.setData('text/plain', `${r},${c}`);
		e.dataTransfer!.effectAllowed = 'move';
		onDragStart?.(r, c);
	}

	function handleDropInternal(e: DragEvent) {
		e.preventDefault();
		onDrop?.(r, c);
	}

	const cellClasses = $derived.by(() => {
		const base = 'relative flex h-14 w-14 items-center justify-center rounded-lg border text-lg font-bold transition-all select-none ';
		if (editing) return base + 'bg-zinc-800 border-blue-400 text-white ring-2 ring-blue-400';
		if (isCalled) return base + 'bg-green-500/30 border-green-400 text-green-200';
		if (marked) return base + 'bg-blue-500/30 border-blue-400 text-blue-200 cursor-grab';
		if (disabled) return base + 'bg-zinc-800 border-zinc-700 text-white opacity-50 cursor-not-allowed';
		if (canInteract) return base + 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 cursor-pointer';
		return base + 'bg-zinc-800 border-zinc-700 text-white';
	});
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class={cellClasses}
	data-row={r}
	data-col={c}
	aria-label={ariaLabel}
	draggable={draggable && canInteract && !disabled}
	ondragstart={draggable ? handleEditDragStartInternal : undefined}
	ondragover={(e) => e.preventDefault()}
	ondrop={draggable ? handleDropInternal : undefined}
	onmousedown={handleMouseDown}
	ontouchstart={handleTouchStart}
	onclick={handleClick}
	ondblclick={handleDoubleClick}
	onkeydown={handleKeydown}
	role="button"
	tabindex={canInteract ? 0 : undefined}
>
	{#if editing}
		<input
			bind:this={inputEl}
			type="number"
			min="1"
			max="25"
			bind:value={editValue}
			onblur={commitEdit}
			onkeydown={handleKeydown}
			class="absolute inset-0 w-full h-full rounded-lg bg-zinc-700 text-center text-lg font-bold text-white outline-none border-0"
		/>
	{:else}
		{value}
	{/if}

	{#if marked}
		<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
			<div class="h-10 w-0.5 rotate-45 bg-blue-400/60 rounded-full"></div>
			<div class="absolute h-10 w-0.5 -rotate-45 bg-blue-400/60 rounded-full"></div>
		</div>
	{/if}
</div>
