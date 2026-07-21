import { neon } from '@neondatabase/serverless';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const MIGRATIONS_DIR = resolve(import.meta.dirname, '../../../..', 'drizzle');

async function migrate() {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL is not set');

	const sql = neon(url);

	const files = readdirSync(MIGRATIONS_DIR)
		.filter((f) => f.endsWith('.sql'))
		.sort();

	if (files.length === 0) {
		console.log('No migration files found.');
		return;
	}

	console.log(`Found ${files.length} migration file(s):`);

	for (const file of files) {
		const content = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8');
		const statements = content
			.split('--> statement-breakpoint')
			.map((s) => s.trim())
			.filter((s) => s.length > 0);

		console.log(`  ${file} (${statements.length} statements)`);
		for (const stmt of statements) {
			try {
				await sql.query(stmt);
			} catch (e: any) {
				// Skip "already exists" errors — safe to ignore on re-runs
				if (e?.code === '42710' || e?.code === '42P07' || e?.message?.includes('already exists')) {
					console.log(`    skipped (already exists)`);
				} else {
					throw e;
				}
			}
		}
	}

	console.log('All migrations applied successfully!');
}

migrate().catch((err) => {
	console.error('Migration failed:', err);
	process.exit(1);
});
