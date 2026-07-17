import { describe, it, expect } from 'vitest';
import { validateCallNumber, validateSweepLine } from './state';

describe('validateCallNumber', () => {
	const grid = [
		[1, 2, 3, 4, 5],
		[6, 7, 8, 9, 10],
		[11, 12, 13, 14, 15],
		[16, 17, 18, 19, 20],
		[21, 22, 23, 24, 25]
	];

	it('validates a valid number', () => {
		const result = validateCallNumber(grid, 13, []);
		expect(result.valid).toBe(true);
	});

	it('rejects number out of range', () => {
		const result = validateCallNumber(grid, 0, []);
		expect(result.valid).toBe(false);
		expect(result.error).toBe('Number must be between 1 and 25');
	});

	it('rejects number over 25', () => {
		const result = validateCallNumber(grid, 26, []);
		expect(result.valid).toBe(false);
		expect(result.error).toBe('Number must be between 1 and 25');
	});

	it('rejects already called number', () => {
		const result = validateCallNumber(grid, 13, [13]);
		expect(result.valid).toBe(false);
		expect(result.error).toBe('Number already called');
	});

	it('rejects number not on board', () => {
		const smallGrid = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
		const result = validateCallNumber(smallGrid, 13, []);
		expect(result.valid).toBe(false);
		expect(result.error).toBe('Number not on your board');
	});
});

describe('validateSweepLine', () => {
	it('validates a completable line', () => {
		const marked: [number, number][] = [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]];
		const result = validateSweepLine([], 'row-0', marked);
		expect(result.valid).toBe(true);
	});

	it('rejects already swept line', () => {
		const marked: [number, number][] = [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]];
		const result = validateSweepLine(['row-0'], 'row-0', marked);
		expect(result.valid).toBe(false);
		expect(result.error).toBe('Line already swept');
	});

	it('rejects incomplete line', () => {
		const marked: [number, number][] = [[0, 0], [0, 1]];
		const result = validateSweepLine([], 'row-0', marked);
		expect(result.valid).toBe(false);
		expect(result.error).toBe('Line not complete');
	});

	it('validates a diagonal', () => {
		const marked: [number, number][] = [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]];
		const result = validateSweepLine([], 'diag-main', marked);
		expect(result.valid).toBe(true);
	});
});
