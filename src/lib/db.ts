import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const url = process.env.PG_URL;
    if (!url) throw new Error("PG_URL is not set");
    pool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return pool;
}

// -- 建表 --
let tableCreated = false;
async function ensureTable() {
  if (tableCreated) return;
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS data (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '[]',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  tableCreated = true;
}

// -- 读取 --
export async function loadData<T = any>(key: string): Promise<{ data: T | null; exists: boolean }> {
  await ensureTable();
  const result = await getPool().query("SELECT value FROM data WHERE key = $1", [key]);
  if (result.rows.length === 0) return { data: null, exists: false };
  return { data: result.rows[0].value as T, exists: true };
}

// -- 写入 --
export async function saveData(key: string, data: any): Promise<void> {
  await ensureTable();
  await getPool().query(
    "INSERT INTO data (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()",
    [key, JSON.stringify(data)]
  );
}

export async function ensureDB() {}
