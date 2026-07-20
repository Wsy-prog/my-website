import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const url = process.env.PG_URL;
    if (!url) throw new Error("PG_URL is not set");
    pool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: process.env.NODE_ENV === "production" },
      max: 10,
    });
  }
  return pool;
}

// -- 建表（模块加载时执行一次，冷启动时执行，后续复用） --
const initPromise = (async () => {
  try {
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS data (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch (e) {
    console.error("Failed to initialize database table:", e);
  }
})();

// -- 读取 --
export async function loadFromDb<T = any>(key: string): Promise<{ data: T | null; exists: boolean }> {
  await initPromise;
  const result = await getPool().query("SELECT value FROM data WHERE key = $1", [key]);
  if (result.rows.length === 0) return { data: null, exists: false };
  return { data: result.rows[0].value as T, exists: true };
}

// -- 写入 --
export async function saveToDb(key: string, data: any): Promise<void> {
  await initPromise;
  await getPool().query(
    "INSERT INTO data (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()",
    [key, JSON.stringify(data)]
  );
}

/** 确保数据库连接和表已就绪（供 API 路由调用，等待初始化完成） */
export async function ensureDB() {
  await initPromise;
}