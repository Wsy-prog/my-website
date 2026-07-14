"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Pencil, Trash2, Check, X, ImageIcon, Video, ChevronDown, ChevronRight, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAnimation } from "@/lib/animation-context";
import { useCardTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { syncSiteDefaults } from "@/lib/site-defaults";
import { compressAndUpload, uploadToCloudinary } from "@/lib/cloudinary";

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
    type: (localStorage.getItem("bg_type") as BgType) || "none",
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
  // 用户手动改过背景 → 标记自定义，applySiteDefaults 不再覆盖
  localStorage.setItem("bg_customized", "true");
}

function applySettings(s: BgSettings) {
  // type === 'none' 表示不操作，保留服务端渲染的背景
  if (s.type === "none") return;

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

export function SettingsPanel() {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<BgSettings>({ type: "none", blur: 0, opacity: 0.3 });
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
      const url = await compressAndUpload(file, 1920);
      const asset: BgAsset = { id: Date.now().toString(36), name: file.name.replace(/\.[^.]+$/, ""), type: "image", src: url };
      const updated = [...assets, asset];
      setAssets(updated); saveAssets(updated);
      selectAsset(asset);
    } catch { /* ignore */ }
  }

  // 导入视频（本地文件）
  async function importVideoFile(file: File) {
    try {
      const url = await uploadToCloudinary(file);
      const asset: BgAsset = { id: Date.now().toString(36), name: file.name.replace(/\.[^.]+$/, ""), type: "video", src: url };
      const updated = [...assets, asset];
      setAssets(updated); saveAssets(updated);
      selectAsset(asset);
    } catch { /* ignore */ }
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

  // 背景专注模式
  const [bgOnly, setBgOnly] = useState(false);

  function toggleBgOnly() {
    const next = !bgOnly;
    setBgOnly(next);
    document.documentElement.classList.toggle("bg-only-mode", next);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="fixed top-4 right-16 z-50 rounded-full p-2 bg-background/30 backdrop-blur-sm hover:bg-background/50 transition-colors" title="页面设置">
          <Settings className="h-4 w-4" />
        </SheetTrigger>
      <SheetContent side="right" className="w-80 sm:w-96 pt-14 flex flex-col gap-5 overflow-y-auto max-h-screen">

        {/* 背景专注模式 — 最顶部 */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex-1">👁️ 背景专注</span>
          <button
            onClick={toggleBgOnly}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              bgOnly
                ? "bg-gradient-to-r from-purple-500 via-pink-400 to-cyan-400 text-white border-transparent shadow-lg shadow-purple-500/25"
                : "border-border hover:bg-accent"
            }`}
          >
            {bgOnly ? "已开启" : "开启"}
          </button>
        </div>

        {/* 音乐播放 — 最顶部 */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex-1">🎵 背景音乐</span>
          <button
            onClick={() => document.dispatchEvent(new CustomEvent("toggle-music"))}
            className="p-2 rounded-lg border border-border hover:bg-accent transition-colors"
            title="打开/关闭音乐"
          >
            <MusicControl />
          </button>
        </div>

        {/* 一键应用博主同款 */}
        <button
          className="w-full rounded-xl bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-400 px-4 py-2.5 text-xs font-medium text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          onClick={() => {
            fetch("/api/data/site_defaults")
              .then(r => r.json())
              .then(json => {
                if (json.exists && json.data) {
                  const d = json.data as Record<string, string>;
                  if (d.bg_type) localStorage.setItem("bg_type", d.bg_type);
                  if (d.bg_blur) localStorage.setItem("bg_blur", d.bg_blur);
                  if (d.bg_opacity) localStorage.setItem("bg_opacity", d.bg_opacity);
                  if (d.bg_active_src) localStorage.setItem("bg_active_src", d.bg_active_src);
                  if (d.theme) localStorage.setItem("theme", d.theme);
                  if (d.card_theme) localStorage.setItem("card_theme", d.card_theme);
                  window.location.reload();
                }
              })
              .catch(() => {});
          }}
        >
          ✨ 一键设置博主同款背景
        </button>

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

        {/* ===== 主题模式 ===== */}
        <section>
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">🌓 主题模式</h3>
          <ThemeModeToggle />
        </section>

        <Separator />

        {/* ===== 默认外观（管理员） ===== */}
        {isAdmin && (
          <section>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">🎨 默认外观</h3>
            <SiteDefaultsDialog settings={settings} />
          </section>
        )}

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
    </>
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

function MusicControl() {
  const [isPlaying, setIsPlaying] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => {
      setIsPlaying((e as CustomEvent).detail.isPlaying);
    };
    document.addEventListener("music-state-change", handler);
    return () => document.removeEventListener("music-state-change", handler);
  }, []);
  return (
    <motion.div
      animate={{ rotate: isPlaying ? [0, 360] : 0 }}
      transition={isPlaying ? { duration: 3, ease: "linear", repeat: Infinity } : { duration: 0.5, ease: "easeInOut" }}
      style={{ display: "inline-flex" }}
    >
      <Music className="h-4 w-4" />
    </motion.div>
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

function ThemeModeToggle() {
  const [theme, setThemeState] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("theme") || "auto";
    return "auto";
  });

  useEffect(() => {
    const stored = localStorage.getItem("theme") || "auto";
    setThemeState(stored);
  }, []);

  const setTheme = (t: string) => {
    setThemeState(t);
    if (t === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else if (t === "light") {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      // auto: 跟随系统
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", prefersDark);
      localStorage.removeItem("theme");
    }
  };

  const items: [string, string][] = [["auto", "💻 跟随系统"], ["light", "☀️ 亮色"], ["dark", "🌙 暗色"]];
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(([val, label]) => (
        <button key={val} onClick={() => setTheme(val)} className={`px-2 py-1.5 rounded-md text-xs border transition-colors ${theme === val ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
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

function SiteDefaultsDialog({ settings }: { settings: BgSettings }) {
  const { cardTheme: currentCardTheme } = useCardTheme();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentDefaults, setCurrentDefaults] = useState<Record<string, string> | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // 当前外观 — 从 props + context（实时响应设置面板变化）
  const bgType = settings.type || "aurora";
  const bgBlur = settings.blur;
  const bgOpacity = settings.opacity;
  const bgSrc = settings.activeAssetSrc || "";
  const theme = localStorage.getItem("theme") || "";
  const cardTheme = currentCardTheme;
  const assets = JSON.parse(localStorage.getItem("bg_assets") || "[]") as { id: string; name: string; type: string; src: string }[];
  const activeAsset = assets.find(a => a.id !== "__aurora" && bgSrc && (bgSrc.includes(a.id) || bgSrc === a.src));

  const bgLabel = bgType === "aurora" ? "极光动画" : bgType === "image" ? (activeAsset?.name || "图片") : bgType === "video" ? (activeAsset?.name || "视频") : "无背景";
  const blurLabel = `${bgBlur}px`;
  const opacityLabel = `${Math.round(bgOpacity * 100)}%`;
  const themeLabel = theme === "dark" ? "🌙 暗色模式" : theme === "light" ? "☀️ 亮色模式" : "跟随系统";
  const cardLabel = cardTheme === "clean" ? "📄 简洁白底" : "🪟 毛玻璃";

  useEffect(() => {
    if (open) {
      fetch("/api/data/site_defaults")
        .then(r => r.json())
        .then(json => {
          if (json.exists && json.data) setCurrentDefaults(json.data as Record<string, string>);
        })
        .catch(() => {});
      setSaved(false);
    }
  }, [open]);

  async function handleSave() {
    await syncSiteDefaults();
    // 刷新当前默认显示
    const res = await fetch("/api/data/site_defaults");
    const json = await res.json();
    if (json.exists) {
      setCurrentDefaults({ ...(json.data as Record<string, string>) });
    } else {
      setCurrentDefaults({ bg_type: "aurora", theme: "", card_theme: "glass" });
    }
    setRefreshKey(k => k + 1);
    setSaved(true);
  }

  function handleSwitchToDefaults() {
    fetch("/api/data/site_defaults")
      .then(r => r.json())
      .then(json => {
        if (json.exists && json.data) {
          const d = json.data as Record<string, string>;
          // 覆盖本地设置
          if (d.bg_type) localStorage.setItem("bg_type", d.bg_type);
          if (d.bg_blur) localStorage.setItem("bg_blur", d.bg_blur);
          if (d.bg_opacity) localStorage.setItem("bg_opacity", d.bg_opacity);
          if (d.bg_active_src) localStorage.setItem("bg_active_src", d.bg_active_src);
          if (d.theme) localStorage.setItem("theme", d.theme);
          if (d.card_theme) localStorage.setItem("card_theme", d.card_theme);
          // 刷新页面以应用
          window.location.reload();
        }
      })
      .catch(() => {});
  }

  return (
    <div className="space-y-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger className="w-full px-2 py-1.5 rounded-md text-xs border border-border hover:bg-accent transition-colors text-left">
          🎨 设置默认外观
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm" key={refreshKey}>
          <DialogHeader>
            <DialogTitle>🎨 设置默认外观</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* 当前外观 */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">📱 你当前的外观</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>背景</span><span className="font-medium">{bgLabel}</span></div>
                <div className="flex justify-between"><span>模糊</span><span className="font-medium">{blurLabel}</span></div>
                <div className="flex justify-between"><span>遮罩</span><span className="font-medium">{opacityLabel}</span></div>
                <div className="flex justify-between"><span>模式</span><span className="font-medium">{themeLabel}</span></div>
                <div className="flex justify-between"><span>卡片</span><span className="font-medium">{cardLabel}</span></div>
              </div>
            </div>

            {/* 当前默认 */}
            <div className="p-3 rounded-lg bg-accent/50 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">🌐 站点默认外观</p>
              {currentDefaults ? (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span>背景</span><span className="font-medium">{
                    currentDefaults.bg_type === "aurora" ? "极光动画" :
                    currentDefaults.bg_type === "image" ? (currentDefaults.bg_active_name || "图片") :
                    currentDefaults.bg_type === "video" ? (currentDefaults.bg_active_name || "视频") : "无背景"
                  }</span></div>
                  <div className="flex justify-between"><span>模糊</span><span className="font-medium">{currentDefaults.bg_blur || "0"}px</span></div>
                  <div className="flex justify-between"><span>遮罩</span><span className="font-medium">{Math.round((parseFloat(currentDefaults.bg_opacity || "0.3")) * 100)}%</span></div>
                  <div className="flex justify-between"><span>模式</span><span className="font-medium">{
                    currentDefaults.theme === "dark" ? "🌙 暗色模式" :
                    currentDefaults.theme === "light" ? "☀️ 亮色模式" : "跟随系统"
                  }</span></div>
                  <div className="flex justify-between"><span>卡片</span><span className="font-medium">{
                    currentDefaults.card_theme === "clean" ? "📄 简洁白底" : "🪟 毛玻璃"
                  }</span></div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">未设置，使用系统默认</p>
              )}
            </div>

            {/* 操作 */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="rounded-lg text-xs" size="sm" onClick={handleSwitchToDefaults} disabled={!currentDefaults}>
                🔄 切换到默认
              </Button>
              <Button className="rounded-lg text-xs" size="sm" onClick={handleSave} disabled={saved}>
                {saved ? "✅ 已保存" : "📌 设为默认"}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">「设为默认」新访客看到此外观 | 「切换到默认」你立即应用</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
