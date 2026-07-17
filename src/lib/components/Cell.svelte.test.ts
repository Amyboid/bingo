import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Cell from './Cell.svelte';

describe('Cell.svelte', () => {
	it('renders the cell value', () => {
		render(Cell, { value: 13, r: 2, c: 3 });
		expect(page.getByText('13')).toBeInTheDocument();
	});

	it('has correct aria-label', () => {
		render(Cell, { value: 13, r: 2, c: 3 });
		// B=0, I=1, N=2, G=3, O=4 → c=3 → G
		expect(page.getByRole('button')).toHaveAttribute('aria-label', 'G13');
	});

	it('calls onClick when clicked and canInteract is true', async () => {
		const onClick = vi.fn();
		render(Cell, { value: 13, r: 2, c: 3, canInteract: true, onClick });
		await page.getByRole('button').click();
		expect(onClick).toHaveBeenCalledWith(2, 3);
	});

	it('does not call onClick when disabled', async () => {
		const onClick = vi.fn();
		render(Cell, { value: 13, r: 2, c: 3, disabled: true, onClick });
		await page.getByRole('button').click();
		expect(onClick).not.toHaveBeenCalled();
	});

	it('shows X mark when marked and not called', () => {
		render(Cell, { value: 13, r: 2, c: 3, marked: true, isCalled: false });
		expect(page.getByRole('button')).toContainHTML('svg');
	});

	it('does not show X mark when called', () => {
		render(Cell, { value: 13, r: 2, c: 3, marked: true, isCalled: true });
		expect(page.getByRole('button')).not.toContainHTML('svg');
	});

	it('has correct aria-label when marked', () => {
		render(Cell, { value: 13, r: 2, c: 3, marked: true });
		expect(page.getByRole('button')).toHaveAttribute('aria-label', 'G13, marked');
	});

	it('has correct aria-label when called', () => {
		render(Cell, { value: 13, r: 2, c: 3, marked: true, isCalled: true });
		expect(page.getByRole('button')).toHaveAttribute('aria-label', 'G13, called');
	});
});
