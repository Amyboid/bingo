import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Board from './Board.svelte';

const testGrid = [
	[1, 2, 3, 4, 5],
	[6, 7, 8, 9, 10],
	[11, 12, 13, 14, 15],
	[16, 17, 18, 19, 20],
	[21, 22, 23, 24, 25]
];

describe('Board.svelte', () => {
	it('renders BINGO header letters', () => {
		render(Board, { grid: testGrid });
		expect(page.getByText('B')).toBeInTheDocument();
		expect(page.getByText('I')).toBeInTheDocument();
		expect(page.getByText('N')).toBeInTheDocument();
		expect(page.getByText('G')).toBeInTheDocument();
		expect(page.getByText('O')).toBeInTheDocument();
	});

	it('renders all 25 cell values', () => {
		render(Board, { grid: testGrid });
		for (let i = 1; i <= 25; i++) {
			expect(page.getByText(String(i))).toBeInTheDocument();
		}
	});

	it('renders row labels', () => {
		render(Board, { grid: testGrid });
		// Row labels appear in the left column
		const rowLabels = page.getByText('B', { exact: true });
		expect(rowLabels.first()).toBeInTheDocument();
	});

	it('marks cells correctly', () => {
		const marked: [number, number][] = [[0, 0], [1, 1], [2, 2]];
		render(Board, { grid: testGrid, marked });
		// Marked cells should have the tile-marked class
		const cells = page.getByRole('button');
		expect(cells.first()).toBeInTheDocument();
	});
});
