"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Pencil, Trash2, Check, X, ImageIcon, Video, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useAnimation } from "@/lib/animation-context";
import { useCardTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";

type BgType = "aurora" | "image" | "video" | "none";

interface BgSettings {
  type: BgType;
  blur: number;
  opacity: number;
  activeAssetSrc?: string;
}

interface BgAsset {
  id: string;
  name: string;
  type: "image" | "video";
  src: string;
}

const BG_ASSETS_KEY = "bg_assets";

const DEFAULT_ASSETS: BgAsset[] = [
  { id: "__aurora", name: "极光默认", type: "image", src: "" },
  { id: "__bg_image", name: "默认壁纸", type: "image", src: "/images/bg.jpg" },
];

function loadAssets(): BgAsset[] {
  if (typeof window === "undefined") return DEFAULT_ASSETS;
  try {
    const raw = localStorage.getItem(BG_ASSETS_KEY);
    if (!raw) { saveAssets(DEFAULT_ASSETS); return DEFAULT_ASSETS; }
    return JSON.parse(raw);
  } catch { return DEFAULT_ASSETS; }
}
function saveAssets(assets: BgAsset[]) {
  try { localStorage.setItem(BG_ASSETS_KEY, JSON.stringify(assets)); } catch { /* quota */ }
}

function getStored(): BgSettings {
  if (typeof window === "undefined") return { type: "aurora", blur: 0, opacity: 0.3 };
  return {
    type: (localStorage.getItem("bg_type") as BgType) || "aurora",
    blur: parseFloat(localStorage.getItem("bg_blur") || "0"),
    opacity: parseFloat(localStorage.getItem("bg_opacity") || "0.3"),
    activeAssetSrc: localStorage.getItem("bg_active_src") || undefined,
  };
}

function saveSettings(s: BgSettings) {
  localStorage.setItem("bg_type", s.type);
  localStorage.setItem("bg_blur", String(s.blur));
  localStorage.setItem("bg_opacity", String(s.opacity));
  if (s.activeAssetSrc) localStorage.setItem("bg_active_src", s.activeAssetSrc);
  else localStorage.removeItem("bg_active_src");
}

function applySettings(s: BgSettings) {
  const imgEl = document.querySelector(".bg-layer-image") as HTMLElement | null;
  const videoEl = document.querySelector(".bg-layer-video") as HTMLElement | null;
  const overlayEl = document.querySelector(".bg-layer-overlay.light-overlay") as HTMLElement | null;
  const darkOverlayEl = document.querySelector(".bg-layer-overlay.dark-overlay") as HTMLElement | null;
  const aurora = document.querySelector(".aurora-container") as HTMLElement | null;

  if (imgEl) {
    imgEl.style.display = s.type === "image" && s.activeAssetSrc ? "" : "none";
    imgEl.style.filter = `blur(${s.blur}px)`;
    if (s.activeAssetSrc) imgEl.style.backgroundImage = `url(${s.activeAssetSrc})`;
  }
  if (videoEl) {
    videoEl.style.display = s.type === "video" && s.activeAssetSrc ? "" : "none";
    videoEl.style.filter = `blur(${s.blur}px)`;
    if (s.activeAssetSrc) (videoEl as HTMLVideoElement).src = s.activeAssetSrc;
  }
  if (overlayEl) overlayEl.style.opacity = String(s.opacity);
  if (darkOverlayEl) darkOverlayEl.style.opacity = String(s.opacity + 0.1);

  const showAurora = s.type === "aurora" || ((s.type === "image" || s.type === "video") && !s.activeAssetSrc);
  if (aurora) aurora.style.display = showAurora ? "" : "none";
}

function compressImage(file: File, maxW: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function SettingsPanel() {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<BgSettings>({ type: "aurora", blur: 0, opacity: 0.3 });
  const [assets, setAssets] = useState<BgAsset[]>([]);
  const [manageOpen, setManageOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(true);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const imgFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const videoUrlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSettings(getStored());
    setAssets(loadAssets());
  }, []);

  useEffect(() => {
    applySettings(settings);
    saveSettings(settings);
  }, [settings]);

  const update = useCallback((partial: Partial<BgSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  // 选中背景
  function selectAsset(asset: BgAsset) {
    if (asset.id === "__aurora") {
      update({ type: "aurora", activeAssetSrc: undefined });
    } else if (asset.type === "image") {
      update({ type: "image", activeAssetSrc: asset.src });
    } else {
      update({ type: "video", activeAssetSrc: asset.src });
    }
  }

  // 导入图片
  async function importImageFile(file: File) {
    try {
      const dataUrl = await compressImage(file, 1920);
      const asset: BgAsset = { id: Date.now().toString(36), name: file.name.replace(/\.[^.]+$/, ""), type: "image", src: dataUrl };
      const updated = [...assets, asset];
      setAssets(updated); saveAssets(updated);
      selectAsset(asset);
    } catch { /* ignore */ }
  }

  // 导入视频（本地文件）
  function importVideoFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const asset: BgAsset = { id: Date.now().toString(36), name: file.name.replace(/\.[^.]+$/, ""), type: "video", src: reader.result as string };
      const updated = [...assets, asset];
      setAssets(updated); saveAssets(updated);
      selectAsset(asset);
    };
    reader.readAsDataURL(file);
  }

  // 导入视频（URL）
  function importVideoUrl() {
    const url = videoUrlRef.current?.value.trim();
    if (!url) return;
    const asset: BgAsset = { id: Date.now().toString(36), name: url.split("/").pop()?.replace(/\.[^.]+$/, "") || "视频背景", type: "video", src: url };
    const updated = [...assets, asset];
    setAssets(updated); saveAssets(updated);
    selectAsset(asset);
    if (videoUrlRef.current) videoUrlRef.current.value = "";
  }

  // 重命名
  function startRename(asset: BgAsset) { setRenameId(asset.id); setRenameValue(asset.name); }
  function confirmRename() {
    if (!renameId || !renameValue.trim()) return;
    const updated = assets.map(a => a.id === renameId ? { ...a, name: renameValue.trim() } : a);
    setAssets(updated); saveAssets(updated); setRenameId(null);
  }

  // 删除
  function deleteAsset(id: string) {
    const asset = assets.find(a => a.id === id);
    const updated = assets.filter(a => a.id !== id);
    setAssets(updated); saveAssets(updated); setDeleteConfirmId(null);
    if (asset && settings.activeAssetSrc === asset.src) {
      localStorage.removeItem("bg_active_src");
      update({ type: "aurora", activeAssetSrc: undefined });
    }
  }

  const activeAssetId = settings.type === "aurora" || !settings.activeAssetSrc
    ? "__aurora"
    : assets.find(a => a.src === settings.activeAssetSrc)?.id || null;

  // 当前类型下的背景
  const typeAssets = settings.type === "aurora"
    ? assets.filter(a => a.id === "__aurora")
    : settings.type === "image"
    ? assets.filter(a => a.type === "image")
    : settings.type === "video"
    ? assets.filter(a => a.type === "video")
    : [];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="fixed top-4 right-16 z-50 rounded-full p-2 bg-background/30 backdrop-blur-sm hover:bg-background/50 transition-colors" title="页面设置">
        <Settings className="h-4 w-4" />
      </SheetTrigger>
      <SheetContent side="right" className="w-80 sm:w-96 pt-12 flex flex-col gap-5 overflow-y-auto max-h-screen">

        {/* ===== 背景类型 ===== */}
        <section>
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">🎨 背景类型</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {([
              ["aurora", "极光"],
              ["image", "图片"],
              ["video", "视频"],
              ["none", "无"],
            ] as const).map(([val, label]) => (
              <button key={val} onClick={() => {
                if (val === "aurora") selectAsset(assets.find(a => a.id === "__aurora") || { id: "__aurora", name: "", type: "image" as const, src: "" });
                else update({ type: val, activeAssetSrc: undefined });
              }}
                className={`px-2 py-1 rounded-md text-xs border transition-colors ${
                  settings.type === val ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* 当前类型的背景卡片 — 可折叠 */}
          {typeAssets.length > 0 && (
            <div>
              <button onClick={() => setCardsOpen(!cardsOpen)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2">
                <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-300 ${cardsOpen ? "rotate-90" : ""}`} />
                背景选择 ({typeAssets.length})
              </button>
              <AnimatePresence initial={false}>
                {cardsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-3 gap-2">
                      {typeAssets.map((asset) => (
                        <button key={asset.id} onClick={() => selectAsset(asset)}
                          className={`rounded-xl border-2 overflow-hidden transition-all hover:scale-105 ${
                            activeAssetId === asset.id ? "border-primary shadow-md shadow-primary/20" : "border-border hover:border-primary/50"
                          }`}>
                          {asset.id === "__aurora" ? (
                            <div className="aspect-video bg-gradient-to-br from-purple-500/40 to-cyan-400/40 flex items-center justify-center text-2xl">🌌</div>
                          ) : asset.type === "image" ? (
                            <img src={asset.src || "/images/bg.jpg"} className="aspect-video object-cover w-full" />
                          ) : (
                            <div className="aspect-video bg-muted flex items-center justify-center">
                              <Video className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="p-1.5">
                            <p className="text-[11px] font-medium truncate">{asset.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* Blur & Overlay */}
        {settings.type !== "none" && (
          <section>
            <div className="space-y-3">
              {(settings.type === "image" || settings.type === "video") && (
                <div>
                  <label className="text-xs font-medium mb-1.5 block">模糊: {settings.blur}px</label>
                  <input type="range" min="0" max="30" step="1" value={settings.blur}
                    onChange={(e) => update({ blur: parseInt(e.target.value, 10) })}
                    className="w-full accent-primary" />
                </div>
              )}
              <div>
                <label className="text-xs font-medium mb-1.5 block">遮罩: {Math.round(settings.opacity * 100)}%</label>
                <input type="range" min="0" max="100" step="5" value={Math.round(settings.opacity * 100)}
                  onChange={(e) => update({ opacity: parseInt(e.target.value, 10) / 100 })}
                  className="w-full accent-primary h-2" />
              </div>
            </div>
          </section>
        )}

        {/* 恢复默认 */}
        <Button variant="outline" size="sm" className="w-full text-xs"
          onClick={() => update({ type: "aurora", blur: 0, opacity: 0.3, activeAssetSrc: undefined })}>
          恢复默认
        </Button>

        <Separator />

        {/* ===== 背景管理（可折叠） ===== */}
        <section>
          <button onClick={() => setManageOpen(!manageOpen)}
            className="w-full flex items-center justify-between text-sm font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors">
            <span>🖼️ 背景管理</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${manageOpen ? "rotate-180" : ""}`} />
          </button>

          {manageOpen && (
            <div className="mt-3 space-y-2">
              {/* 所有背景列表 */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {assets.map((asset) => (
                  <div key={asset.id} className={`p-2 rounded-lg border flex items-center gap-2 ${activeAssetId === asset.id ? "border-primary/30 bg-primary/5" : "border-border"}`}>
                    {/* 缩略图 */}
                    {asset.id === "__aurora" ? (
                      <div className="w-9 h-7 rounded bg-gradient-to-br from-purple-500/30 to-cyan-400/30 flex items-center justify-center shrink-0 text-sm">🌌</div>
                    ) : asset.type === "image" ? (
                      <img src={asset.src || "/images/bg.jpg"} className="w-9 h-7 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-7 rounded bg-muted flex items-center justify-center shrink-0"><Video className="h-3 w-3 text-muted-foreground" /></div>
                    )}
                    {/* 名称 */}
                    <div className="flex-1 min-w-0">
                      {renameId === asset.id ? (
                        <div className="flex items-center gap-1">
                          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setRenameId(null); }}
                            className="h-6 text-xs rounded-md" autoFocus />
                          <button onClick={confirmRename} className="p-0.5 rounded hover:bg-accent"><Check className="h-3 w-3 text-green-500" /></button>
                          <button onClick={() => setRenameId(null)} className="p-0.5 rounded hover:bg-accent"><X className="h-3 w-3" /></button>
                        </div>
                      ) : (
                        <span className="text-xs font-medium truncate block">{asset.name}</span>
                      )}
                    </div>
                    {/* 操作 */}
                    {isAdmin && renameId !== asset.id && (
                      <div className="flex gap-0.5 shrink-0">
                        <button onClick={() => startRename(asset)} className="p-1 rounded hover:bg-accent"><Pencil className="h-3 w-3" /></button>
                        {deleteConfirmId === asset.id ? (
                          <div className="flex gap-0.5">
                            <button onClick={() => deleteAsset(asset.id)} className="px-1.5 py-0.5 rounded text-[10px] bg-destructive text-destructive-foreground">确认</button>
                            <button onClick={() => setDeleteConfirmId(null)} className="px-1.5 py-0.5 rounded text-[10px] border">取消</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirmId(asset.id)} className="p-1 rounded hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 导入 */}
              {isAdmin && (
                <div className="space-y-1.5 pt-1">
                  <button onClick={() => imgFileRef.current?.click()}
                    className="w-full py-2 rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors text-xs text-muted-foreground hover:text-primary text-center flex items-center justify-center gap-1">
                    <ImageIcon className="h-3.5 w-3.5" /> 导入本地图片
                  </button>
                  <button onClick={() => videoFileRef.current?.click()}
                    className="w-full py-2 rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors text-xs text-muted-foreground hover:text-primary text-center flex items-center justify-center gap-1">
                    <Video className="h-3.5 w-3.5" /> 导入本地视频
                  </button>
                  <div className="flex gap-1">
                    <Input ref={videoUrlRef} placeholder="或输入视频 URL..." className="h-8 text-xs rounded-lg flex-1"
                      onKeyDown={(e) => { if (e.key === "Enter") importVideoUrl(); }} />
                    <Button size="sm" className="h-8 rounded-lg text-xs shrink-0" onClick={importVideoUrl}>导入</Button>
                  </div>
                </div>
              )}
              <input ref={imgFileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) { importImageFile(f); e.target.value = ""; } }} />
              <input ref={videoFileRef} type="file" accept="video/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) { importVideoFile(f); e.target.value = ""; } }} />
            </div>
          )}
        </section>

        <Separator />

        {/* ===== 动画 ===== */}
        <section>
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">✨ 动画</h3>
          <AnimateToggle />
        </section>

        <Separator />

        {/* ===== 卡片样式 ===== */}
        <section>
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">🃏 卡片样式</h3>
          <CardThemeToggle />
        </section>

        <Separator />

        {/* ===== 数据备份 ===== */}
        <section>
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">💾 数据备份</h3>
          <BackupSection />
        </section>

        {/* ===== 管理员登录 ===== */}
        <section>
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">🔒 管理员</h3>
          <AdminLogin />
        </section>

        <p className="text-[10px] text-muted-foreground mt-auto pt-4">设置自动保存在本地浏览器</p>
      </SheetContent>
    </Sheet>
  );
}

function AnimateToggle() {
  const { enabled, toggle } = useAnimation();
  return (
    <button onClick={toggle} className={`w-full px-2 py-1.5 rounded-md text-xs border transition-colors ${enabled ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
      {enabled ? "✅ 滚动动画已启用" : "⏸️ 滚动动画已停用"}
    </button>
  );
}

function CardThemeToggle() {
  const { cardTheme, setCardTheme } = useCardTheme();
  const items: ["glass" | "clean", string][] = [["glass", "🪟 毛玻璃"], ["clean", "📄 简洁白底"]];
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(([val, label]) => (
        <button key={val} onClick={() => setCardTheme(val)} className={`px-2 py-1.5 rounded-md text-xs border transition-colors ${cardTheme === val ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

function BackupSection() {
  const [status, setStatus] = useState<string | null>(null);

  function exportData() {
    const keys = [
      "blog_custom_posts",
      "gallery_photos",
      "travel_all_markers",
      "travel_markers_version",
      "music_tracks",
      "bg_assets",
      "bg_type",
      "bg_blur",
      "bg_opacity",
      "bg_active_src",
      "guestbook_messages",
      "blog_custom_tags",
    ];
    const backup: Record<string, any> = {};
    for (const k of keys) {
      try {
        const v = localStorage.getItem(k);
        if (v) backup[k] = JSON.parse(v);
      } catch {}
    }
    backup._exported_at = new Date().toISOString();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `website-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("已导出！");
    setTimeout(() => setStatus(null), 2000);
  }

  function importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          let count = 0;
          for (const [k, v] of Object.entries(data)) {
            if (k.startsWith("_")) continue;
            localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
            count++;
          }
          setStatus(`已恢复 ${count} 项数据！刷新页面生效`);
          setTimeout(() => setStatus(null), 3000);
        } catch {
          setStatus("文件格式错误");
          setTimeout(() => setStatus(null), 2000);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button onClick={exportData} className="px-2 py-1.5 rounded-md text-xs border border-border hover:bg-accent transition-colors">
          📥 导出备份
        </button>
        <button onClick={importData} className="px-2 py-1.5 rounded-md text-xs border border-border hover:bg-accent transition-colors">
          📤 恢复备份
        </button>
      </div>
      {status && <p className="text-[11px] text-green-500 text-center">{status}</p>}
    </div>
  );
}

function AdminLogin() {
  const { isAdmin, login, logout, loginError } = useAuth();
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);

  if (!show && !isAdmin) {
    return (
      <button onClick={() => setShow(true)} className="w-full px-2 py-1.5 rounded-md text-xs border border-border hover:bg-accent transition-colors">
        🔒 管理员登录
      </button>
    );
  }

  if (isAdmin) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-green-500 font-medium">✅ 已登录管理员</div>
        <button onClick={() => { logout(); setPw(""); }} className="w-full px-2 py-1.5 rounded-md text-xs border border-destructive/30 hover:bg-destructive/10 text-destructive transition-colors">
          退出登录
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <Input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") login(pw).then((ok) => ok && setPw("")).catch(() => {}); }}
          placeholder="输入管理员密码"
          className="h-8 text-xs rounded-lg flex-1"
          autoFocus
        />
        <Button size="sm" className="h-8 rounded-lg text-xs shrink-0"
          onClick={() => login(pw).then((ok) => { if (ok) setPw(""); })}>
          登录
        </Button>
      </div>
      {loginError && <p className="text-[10px] text-destructive">{loginError}</p>}
      <button onClick={() => { setShow(false); setPw(""); }} className="text-[10px] text-muted-foreground hover:underline">取消</button>
    </div>
  );
}
