"use client";

import { useState, useEffect, useRef } from "react";
import { ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { compressAndUpload } from "@/lib/cloudinary";
import { getAllImages } from "@/lib/image-library";
import type { Photo } from "@/data/photos";

export function ImageLibrary() {
  const { isAdmin } = useAuth();
  const [images, setImages] = useState<string[]>([]);
  const [tab, setTab] = useState<"all" | "import">("all");
  const [importUrl, setImportUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function refresh() {
    setImages(getAllImages());
  }

  useEffect(() => { refresh(); }, []);

  // === 从所有来源彻底删除某张图片 ===
  async function deleteImage(src: string) {
    setDeleteConfirm(null);
    let changed = false;

    // 1. 从 gallery_photos 删除
    try {
      const photos: Photo[] = JSON.parse(localStorage.getItem("gallery_photos") || "[]");
      const filtered = photos.filter((p) => p.src !== src);
      if (filtered.length !== photos.length) {
        localStorage.setItem("gallery_photos", JSON.stringify(filtered));
        const token = localStorage.getItem("admin_token");
        fetch("/api/data/gallery_photos", {
          method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ data: filtered }),
        }).catch(() => {});
        changed = true;
      }
    } catch {}

    // 2. 从 blog_custom_posts 删除（coverImage + 正文内嵌）
    try {
      const posts: any[] = JSON.parse(localStorage.getItem("blog_custom_posts") || "[]");
      let updated = false;
      const newPosts = posts.map((p: any) => {
        let modified = false;
        // 封面
        if (p.coverImage === src) { p.coverImage = undefined; modified = true; }
        // 正文内的 <img src="...">
        if (p.content && typeof p.content === "string" && p.content.includes(src)) {
          p.content = p.content.replace(new RegExp(`<img[^>]*src="${escapeRegex(src)}"[^>]*>`, "g"), "");
          modified = true;
        }
        if (modified) { updated = true; }
        return p;
      });
      if (updated) {
        localStorage.setItem("blog_custom_posts", JSON.stringify(newPosts));
        const token = localStorage.getItem("admin_token");
        fetch("/api/data/blog_custom_posts", {
          method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ data: newPosts }),
        }).catch(() => {});
        changed = true;
      }
    } catch {}

    // 3. 从 bg_assets 删除
    try {
      const assets: any[] = JSON.parse(localStorage.getItem("bg_assets") || "[]");
      const filtered = assets.filter((a: any) => a.src !== src);
      if (filtered.length !== assets.length) {
        localStorage.setItem("bg_assets", JSON.stringify(filtered));
        const token = localStorage.getItem("admin_token");
        fetch("/api/data/bg_assets", {
          method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ data: filtered }),
        }).catch(() => {});
        changed = true;
      }
    } catch {}

    // 4. 从 music_tracks 删除封面
    try {
      const tracks: any[] = JSON.parse(localStorage.getItem("music_tracks") || "[]");
      let updated = false;
      const newTracks = tracks.map((t: any) => {
        if (t.cover === src) { t.cover = undefined; updated = true; }
        return t;
      });
      if (updated) {
        localStorage.setItem("music_tracks", JSON.stringify(newTracks));
        const token = localStorage.getItem("admin_token");
        fetch("/api/data/music_tracks", {
          method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ data: newTracks }),
        }).catch(() => {});
        changed = true;
      }
    } catch {}

    // 清除默认壁纸标记
    if (src === "/images/bg.jpg" && localStorage.getItem("bg_active_src") === "/images/bg.jpg") {
      localStorage.removeItem("bg_active_src");
    }

    if (changed) {
      setStatus("已删除");
      setTimeout(() => setStatus(null), 2000);
    }
    refresh();
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
                  <div className="absolute top-1 right-1 flex gap-0.5">
                    <button onClick={() => copyUrl(src)}
                      className="w-5 h-5 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px]"
                      title="复制链接">📋</button>
                    {isAdmin && (
                      deleteConfirm === src ? (
                        <div className="flex gap-0.5">
                          <button onClick={() => deleteImage(src)}
                            className="px-1 py-0.5 rounded text-[9px] bg-destructive text-destructive-foreground">确认</button>
                          <button onClick={() => setDeleteConfirm(null)}
                            className="px-1 py-0.5 rounded text-[9px] bg-black/50 text-white">取消</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(src)}
                          className="w-5 h-5 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] hover:bg-destructive/80"
                          title="删除图片">✕</button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // === 辅助函数 ===
  function escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  async function importFile(file: File) {
    try {
      const url = await compressAndUpload(file, 1920);
      const raw = localStorage.getItem("bg_assets");
      const assets = raw ? JSON.parse(raw) : [];
      const asset = { id: Date.now().toString(36), name: file.name.replace(/\.[^.]+$/, ""), type: "image" as const, src: url };
      assets.push(asset);
      localStorage.setItem("bg_assets", JSON.stringify(assets));
      const token = localStorage.getItem("admin_token");
      fetch("/api/data/bg_assets", {
        method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
        method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
}