let initDB: () => Promise<void>;
let loadData: <T = any>(key: string) => Promise<{ data: T | null; exists: boolean }>;
let saveData: (key: string, data: any) => Promise<void>;

async function ensureDB() {
  if (initDB) return;
  const mod = await import("@neondatabase/serverless");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = mod.neon(url);

  initDB = async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS data (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
  };

  loadData = async <T = any>(key: string): Promise<{ data: T | null; exists: boolean }> => {
    const rows = await sql`SELECT value FROM data WHERE key = ${key}`;
    if (rows.length === 0) return { data: null, exists: false };
    return { data: rows[0].value as T, exists: true };
  };

  saveData = async (key: string, data: any) => {
    await sql`
      INSERT INTO data (key, value, updated_at)
      VALUES (${key}, ${JSON.stringify(data)}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;
  };

  await initDB();
}

export { ensureDB, loadData, saveData, initDB };
