import { describe, it, expect } from 'vitest';
import {
	generateRoomCode,
	createDefaultGrid,
	shuffle,
	getAllLineIds,
	getLineCells,
	isLineComplete,
	getCompletableLines,
	numberOnGrid
} from './utils';

describe('generateRoomCode', () => {
	it('returns a 6-character code', () => {
		const code = generateRoomCode();
		expect(code).toHaveLength(6);
	});

	it('only contains valid characters', () => {
		const validChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
		const code = generateRoomCode();
		for (const char of code) {
			expect(validChars).toContain(char);
		}
	});

	it('generates unique codes', () => {
		const codes = new Set(Array.from({ length: 100 }, () => generateRoomCode()));
		expect(codes.size).toBe(100);
	});
});

describe('createDefaultGrid', () => {
	it('returns a 5x5 grid', () => {
		const grid = createDefaultGrid();
		expect(grid).toHaveLength(5);
		for (const row of grid) {
			expect(row).toHaveLength(5);
		}
	});

	it('contains numbers 1-25', () => {
		const grid = createDefaultGrid();
		const nums = grid.flat().sort((a, b) => a - b);
		expect(nums).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]);
	});

	it('has unique numbers', () => {
		const grid = createDefaultGrid();
		const nums = grid.flat();
		expect(new Set(nums).size).toBe(25);
	});
});

describe('shuffle', () => {
	it('reorders the array', () => {
		const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		const original = [...arr];
		shuffle(arr);
		// Technically could be same order, but extremely unlikely with 10 elements
		expect(arr).not.toEqual(original);
	});

	it('preserves all elements', () => {
		const arr = [1, 2, 3, 4, 5];
		const original = [...arr];
		shuffle(arr);
		expect(arr.sort()).toEqual(original.sort());
	});
});

describe('getAllLineIds', () => {
	it('returns 12 line IDs', () => {
		const lines = getAllLineIds();
		expect(lines).toHaveLength(12);
	});

	it('includes rows, columns, and diagonals', () => {
		const lines = getAllLineIds();
		expect(lines).toContain('row-0');
		expect(lines).toContain('row-4');
		expect(lines).toContain('col-0');
		expect(lines).toContain('col-4');
		expect(lines).toContain('diag-main');
		expect(lines).toContain('diag-anti');
	});
});

describe('getLineCells', () => {
	it('returns correct cells for row', () => {
		const cells = getLineCells('row-2');
		expect(cells).toEqual([[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]]);
	});

	it('returns correct cells for column', () => {
		const cells = getLineCells('col-3');
		expect(cells).toEqual([[0, 3], [1, 3], [2, 3], [3, 3], [4, 3]]);
	});

	it('returns correct cells for main diagonal', () => {
		const cells = getLineCells('diag-main');
		expect(cells).toEqual([[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]);
	});

	it('returns correct cells for anti diagonal', () => {
		const cells = getLineCells('diag-anti');
		expect(cells).toEqual([[0, 4], [1, 3], [2, 2], [3, 1], [4, 0]]);
	});

	it('returns empty array for unknown line', () => {
		const cells = getLineCells('unknown');
		expect(cells).toEqual([]);
	});
});

describe('isLineComplete', () => {
	it('returns true when all cells are marked', () => {
		const marked: [number, number][] = [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]];
		expect(isLineComplete('row-0', marked)).toBe(true);
	});

	it('returns false when some cells are missing', () => {
		const marked: [number, number][] = [[0, 0], [0, 1], [0, 2]];
		expect(isLineComplete('row-0', marked)).toBe(false);
	});

	it('returns false when no cells are marked', () => {
		const marked: [number, number][] = [];
		expect(isLineComplete('row-0', marked)).toBe(false);
	});
});

describe('getCompletableLines', () => {
	it('returns completable lines', () => {
		const marked: [number, number][] = [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]];
		const completable = getCompletableLines(marked, []);
		expect(completable).toContain('row-0');
	});

	it('excludes already swept lines', () => {
		const marked: [number, number][] = [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]];
		const completable = getCompletableLines(marked, ['row-0']);
		expect(completable).not.toContain('row-0');
	});

	it('returns empty array when no lines are complete', () => {
		const marked: [number, number][] = [[0, 0], [0, 1]];
		const completable = getCompletableLines(marked, []);
		expect(completable).toEqual([]);
	});
});

describe('numberOnGrid', () => {
	it('finds a number on the grid', () => {
		const grid = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
		expect(numberOnGrid(grid, 5)).toEqual([1, 1]);
	});

	it('returns null when number is not found', () => {
		const grid = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
		expect(numberOnGrid(grid, 10)).toBeNull();
	});

	it('returns first occurrence', () => {
		const grid = [[1, 2], [1, 3]];
		expect(numberOnGrid(grid, 1)).toEqual([0, 0]);
	});
});
