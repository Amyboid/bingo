// Shared game utilities — safe for both client and server

export function getLineCells(lineId: string): [number, number][] {
	if (lineId.startsWith('row-')) {
		const r = parseInt(lineId.split('-')[1]);
		return Array.from({ length: 5 }, (_, c) => [r, c]);
	}
	if (lineId.startsWith('col-')) {
		const c = parseInt(lineId.split('-')[1]);
		return Array.from({ length: 5 }, (_, r) => [r, c]);
	}
	if (lineId === 'diag-main') {
		return Array.from({ length: 5 }, (_, i) => [i, i]);
	}
	if (lineId === 'diag-anti') {
		return Array.from({ length: 5 }, (_, i) => [i, 4 - i]);
	}
	return [];
}

export function getAllLineIds(): string[] {
	const lines: string[] = [];
	for (let i = 0; i < 5; i++) {
		lines.push(`row-${i}`);
		lines.push(`col-${i}`);
	}
	lines.push('diag-main', 'diag-anti');
	return lines;
}
