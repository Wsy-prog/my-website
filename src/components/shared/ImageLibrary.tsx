"use client";

import { useState, useEffect, useRef } from "react";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { compressAndUpload } from "@/lib/cloudinary";
import { getAllImages } from "@/lib/image-library";

export function ImageLibrary() {
  const { isAdmin } = useAuth();
  const [images, setImages] = useState<string[]>([]);
  const [tab, setTab] = useState<"all" | "import">("all");
  const [importUrl, setImportUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  function refresh() {
    setImages(getAllImages());
  }

  useEffect(() => { refresh(); }, []);

  async function importFile(file: File) {
    try {
      const url = await compressAndUpload(file, 1920);
      // 保存到 bg_assets（与背景管理共用数据源）
      const raw = localStorage.getItem("bg_assets");
      const assets = raw ? JSON.parse(raw) : [];
      const asset = { id: Date.now().toString(36), name: file.name.replace(/\.[^.]+$/, ""), type: "image" as const, src: url };
      assets.push(asset);
      localStorage.setItem("bg_assets", JSON.stringify(assets));
      const token = localStorage.getItem("admin_token");
      fetch("/api/data/bg_assets", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ data: assets }),
      }).catch(() => {});
      refresh();
      setStatus("已导入");
      setTimeout(() => setStatus(null), 2000);
    } catch { setStatus("导入失败"); setTimeout(() => setStatus(null), 2000); }
  }

  async function importFromUrl() {
    const url = importUrl.trim();
    if (!url) return;
    try {
      const raw = localStorage.getItem("bg_assets");
      const assets = raw ? JSON.parse(raw) : [];
      const name = url.split("/").pop()?.replace(/\.[^.]+$/, "") || "URL导入";
      const asset = { id: Date.now().toString(36), name, type: "image" as const, src: url };
      assets.push(asset);
      localStorage.setItem("bg_assets", JSON.stringify(assets));
      const token = localStorage.getItem("admin_token");
      fetch("/api/data/bg_assets", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ data: assets }),
      }).catch(() => {});
      setImportUrl("");
      refresh();
      setStatus("已导入");
      setTimeout(() => setStatus(null), 2000);
    } catch { setStatus("导入失败"); setTimeout(() => setStatus(null), 2000); }
  }

  function copyUrl(src: string) {
    navigator.clipboard.writeText(src);
    setStatus("已复制");
    setTimeout(() => setStatus(null), 1500);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => setTab("all")} className={`flex-1 py-1 rounded-md text-xs border transition-colors ${tab === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
          🖼️ 所有图片
        </button>
        {isAdmin && (
          <button onClick={() => setTab("import")} className={`flex-1 py-1 rounded-md text-xs border transition-colors ${tab === "import" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
            📥 导入
          </button>
        )}
      </div>

      {tab === "import" && (
        <div className="space-y-2">
          <button onClick={() => fileRef.current?.click()}
            className="w-full py-3 rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors text-xs text-muted-foreground hover:text-primary text-center flex items-center justify-center gap-1">
            <ImageIcon className="h-4 w-4" /> 从本地上传图片
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ""; }} />
          <div className="flex gap-1">
            <Input placeholder="输入图片 URL..." value={importUrl} onChange={(e) => setImportUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") importFromUrl(); }} className="h-8 text-xs rounded-lg flex-1" />
            <Button size="sm" className="h-8 rounded-lg text-xs shrink-0" onClick={importFromUrl} disabled={!importUrl.trim()}>导入</Button>
          </div>
          {status && <p className="text-[11px] text-center text-green-500">{status}</p>}
        </div>
      )}

      {tab === "all" && (
        <div className="max-h-60 overflow-y-auto">
          {images.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">暂无图片</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {images.map((src) => (
                <div key={src} className="group relative rounded-lg overflow-hidden border border-border/50">
                  <img src={src} alt="" className="aspect-square object-cover w-full" loading="lazy" />
                  <p className="text-[9px] px-1 py-0.5 truncate text-muted-foreground">{src.split("/").pop()?.slice(0, 20)}</p>
                  <button onClick={() => copyUrl(src)}
                    className="absolute top-1 right-1 w-5 h-5 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px]"
                    title="复制链接">📋</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}