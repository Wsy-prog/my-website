import { Pool } from "pg";

let pool: Pool | null = null;
let initPromise: Promise<void> | null = null;

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

// 首次访问数据库时建表（懒初始化，不在模块加载时执行，避免每个 serverless 实例冷启动都跑 DDL）
function ensureTable(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
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
  }
  return initPromise;
}

export async function loadFromDb<T = any>(key: string): Promise<{ data: T | null; exists: boolean }> {
  await ensureTable();
  const result = await getPool().query("SELECT value FROM data WHERE key = $1", [key]);
  if (result.rows.length === 0) return { data: null, exists: false };
  return { data: result.rows[0].value as T, exists: true };
}

export async function saveToDb(key: string, data: any): Promise<void> {
  await ensureTable();
  await getPool().query("INSERT INTO data (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()", [key, JSON.stringify(data)]);
}

/** 列出数据库中所有 key（用于备份导出枚举评论等动态 key） */
export async function listAllKeys(): Promise<string[]> {
  await ensureTable();
  const result = await getPool().query("SELECT key FROM data");
  return result.rows.map((r: any) => r.key as string);
}

export async function ensureDB() { await ensureTable(); }