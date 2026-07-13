import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction | null = null;

function getSql(): NeonQueryFunction {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _sql = neon(url);
  }
  return _sql;
}

// -- 建表（首次运行）--
export async function initDB() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS data (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '[]',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// -- 读取数据 --
export async function loadData<T = any>(key: string): Promise<{ data: T | null; exists: boolean }> {
  const sql = getSql();
  const rows = await sql`SELECT value FROM data WHERE key = ${key}`;
  if (rows.length === 0) return { data: null, exists: false };
  return { data: rows[0].value as T, exists: true };
}

// -- 写入数据 --
export async function saveData(key: string, data: any): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO data (key, value, updated_at)
    VALUES (${key}, ${JSON.stringify(data)}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
}

// -- 删除数据 --
export async function deleteData(key: string): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM data WHERE key = ${key}`;
}
