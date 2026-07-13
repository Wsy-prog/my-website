// 统一数据存储：优先 JSON 文件（API），回退 localStorage

const DATA_DIR = "/api/data";

async function fetchFromApi(key: string): Promise<any | null> {
  try {
    const res = await fetch(`${DATA_DIR}/${key}`);
    const json = await res.json();
    return json.exists ? json.data : null;
  } catch {
    return null;
  }
}

async function saveToApi(key: string, data: any): Promise<boolean> {
  try {
    const res = await fetch(`${DATA_DIR}/${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
    const json = await res.json();
    return json.ok === true;
  } catch {
    return false;
  }
}

function loadFromLocal(key: string): any | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveToLocal(key: string, data: any) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* quota */ }
}

// 通用加载：API 优先，回退 localStorage
export async function loadData(key: string): Promise<any | null> {
  const apiData = await fetchFromApi(key);
  if (apiData !== null) {
    saveToLocal(key, apiData); // 同步到本地缓存
    return apiData;
  }
  return loadFromLocal(key);
}

// 通用保存：同时写 API 和 localStorage
export async function saveData(key: string, data: any): Promise<void> {
  saveToLocal(key, data);
  await saveToApi(key, data);
}

// 便捷方法
export const dataStore = {
  load: loadData,
  save: saveData,
};
