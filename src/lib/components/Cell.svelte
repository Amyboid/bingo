<script lang="ts">
	let {
		value,
		row,
		col,
		disabled = false,
		marked = false,
		isCalled = false,
		canInteract = false,
		draggable = false,
		onValueChange,
		onClick,
		onDragStart,
		onDrop
	}: {
		value: number;
		row: number;
		col: number;
		disabled?: boolean;
		marked?: boolean;
		isCalled?: boolean;
		canInteract?: boolean;
		draggable?: boolean;
		onValueChange?: (val: number) => void;
		onClick?: (row: number, col: number) => void;
		onDragStart?: (row: number, col: number) => void;
		onDrop?: (row: number, col: number) => void;
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
			onClick(row, col);
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
		if (e.key === 'Enter') commitEdit();
		if (e.key === 'Escape') editing = false;
	}

	function handleDragStartInternal(e: DragEvent) {
		e.dataTransfer?.setData('text/plain', `${row},${col}`);
		e.dataTransfer!.effectAllowed = 'move';
		onDragStart?.(row, col);
	}

	function handleDropInternal(e: DragEvent) {
		e.preventDefault();
		onDrop?.(row, col);
	}

	const cellClasses = $derived.by(() => {
		const base = 'relative flex h-14 w-14 items-center justify-center rounded-lg border text-lg font-bold transition-all select-none ';
		if (editing) return base + 'bg-zinc-800 border-blue-400 text-white ring-2 ring-blue-400';
		if (isCalled) return base + 'bg-green-500/30 border-green-400 text-green-200';
		if (marked) return base + 'bg-blue-500/30 border-blue-400 text-blue-200';
		if (disabled) return base + 'bg-zinc-800 border-zinc-700 text-white opacity-50 cursor-not-allowed';
		if (canInteract) return base + 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 cursor-pointer';
		return base + 'bg-zinc-800 border-zinc-700 text-white';
	});
</script>

<div
	class={cellClasses}
	draggable={draggable && canInteract && !disabled}
	ondragstart={draggable ? handleDragStartInternal : undefined}
	ondragover={(e) => e.preventDefault()}
	ondrop={draggable ? handleDropInternal : undefined}
	onclick={handleClick}
	ondblclick={handleDoubleClick}
	role={canInteract ? 'button' : undefined}
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
