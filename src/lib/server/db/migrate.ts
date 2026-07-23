import { neon } from '@neondatabase/serverless';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { createHash } from 'crypto';

const MIGRATIONS_DIR = resolve(import.meta.dirname, '../../../..', 'drizzle');

const IGNORED_ERROR_CODES = new Set(['42710', '42P07', '42701']);
const IGNORED_PATTERNS = ['already exists', 'already declared'];

function isIgnorableError(e: any): boolean {
	if (IGNORED_ERROR_CODES.has(e?.code)) return true;
	const msg = e?.message ?? '';
	return IGNORED_PATTERNS.some((p) => msg.includes(p));
}

async function migrate() {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL is not set');

	const sql = neon(url);

	await sql`CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
		id serial PRIMARY KEY,
		hash text NOT NULL,
		created_at bigint
	)`;

	const applied = await sql`SELECT hash FROM "__drizzle_migrations" ORDER BY id`;
	const appliedHashes = new Set(applied.map((r: any) => r.hash));

	const files = readdirSync(MIGRATIONS_DIR)
		.filter((f) => f.endsWith('.sql'))
		.sort();

	if (files.length === 0) {
		console.log('No migration files found.');
		return;
	}

	console.log(`Found ${files.length} migration file(s), ${appliedHashes.size} already applied.`);

	let appliedCount = 0;

	for (const file of files) {
		const content = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8');
		const hash = createHash('sha256').update(content).digest('hex');

		if (appliedHashes.has(hash)) {
			continue;
		}

		const statements = content
			.split('--> statement-breakpoint')
			.map((s) => s.trim())
			.filter((s) => s.length > 0);

		console.log(`  Applying ${file} (${statements.length} statements)`);
		for (const stmt of statements) {
			try {
				await sql.query(stmt);
			} catch (e: any) {
				if (isIgnorableError(e)) {
					console.log(`    skipped (already exists)`);
				} else {
					throw e;
				}
			}
		}

		await sql`INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (${hash}, ${Date.now()})`;
		appliedCount++;
	}

	if (appliedCount === 0) {
		console.log('Database is up to date. No migrations to apply.');
	} else {
		console.log(`Applied ${appliedCount} migration(s) successfully.`);
	}
}

migrate().catch((err) => {
	console.error('Migration failed:', err);
	process.exit(1);
});
