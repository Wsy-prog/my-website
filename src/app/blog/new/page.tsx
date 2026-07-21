"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Send, Trash2, Save, ImageIcon, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { saveCustomPost, loadCustomPosts, deleteCustomPost } from "@/lib/blog-store";
import { useAuth } from "@/lib/auth-context";
import type { BlogPost } from "@/data/blog-posts";
import { getAllMarkers } from "@/lib/travel-store";
import { compressAndUpload } from "@/lib/cloudinary";
import { ImagePicker } from "@/components/shared/ImagePicker";
import { UploadProgress } from "@/components/shared/UploadProgress";
import RichTextEditor, { type RichTextEditorHandle } from "@/components/editor/RichTextEditor";
import type { Photo } from "@/data/photos";

const categories = [
  { key: "life", label: "生活" },
  { key: "travel", label: "旅行" },
  { key: "photography", label: "摄影" },
  { key: "tech", label: "技术" },
  { key: "reflection", label: "感悟" },
] as const;

function loadCustomTags(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("blog_custom_tags") || "[]"); } catch { return []; }
}
function saveCustomTags(tags: string[]) {
  localStorage.setItem("blog_custom_tags", JSON.stringify(tags));
}
function getAllTags(): string[] {
  const base = typeof window !== "undefined" ? getAllMarkers().map(m => m.title) : [];
  return [...new Set([...base, ...loadCustomTags()])].sort((a, b) => a.localeCompare(b, "zh"));
}

function NewBlogPageInner() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editSlug = searchParams.get("edit");
  const isEditing = !!editSlug;

  const coverInputRef = useRef<HTMLInputElement>(null);
  const richTextRef = useRef<RichTextEditorHandle>(null);

  const [title, setTitle] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverPosition, setCoverPosition] = useState(50);
  const [category, setCategory] = useState<string>("life");
  const [tags, setTags] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [isDraft, setIsDraft] = useState(false);
  const [autoSave, setAutoSave] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("blog_autosave_enabled") !== "false";
    }
    return true;
  });
  const [savedIndicator, setSavedIndicator] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedHtmlRef = useRef("");
  const isSavingRef = useRef(false);

  // 🔑 固定 slug ref：autoSave 和 handleSaveDraft 共用，避免孤立条目
  const draftSlugRef = useRef<string | null>(null);

  // 🔑 ref 方式存储最新状态，避免闭包陷阱
  const titleRef = useRef(title);
  const categoryRef = useRef(category);
  const tagsRef = useRef(tags);
  const summaryRef = useRef(summary);
  const coverImageRef = useRef(coverImage);
  const coverPositionRef = useRef(coverPosition);
  const commentsEnabledRef = useRef(commentsEnabled);
  const isDraftRef = useRef(isDraft);
  const isEditingRef = useRef(isEditing);
  const editSlugRef = useRef(editSlug);
  const autoSaveRef = useRef(autoSave);

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { categoryRef.current = category; }, [category]);
  useEffect(() => { tagsRef.current = tags; }, [tags]);
  useEffect(() => { summaryRef.current = summary; }, [summary]);
  useEffect(() => { coverImageRef.current = coverImage; }, [coverImage]);
  useEffect(() => { coverPositionRef.current = coverPosition; }, [coverPosition]);
  useEffect(() => { commentsEnabledRef.current = commentsEnabled; }, [commentsEnabled]);
  useEffect(() => { isDraftRef.current = isDraft; }, [isDraft]);
  useEffect(() => { isEditingRef.current = isEditing; }, [isEditing]);
  useEffect(() => { editSlugRef.current = editSlug; }, [editSlug]);
  useEffect(() => { autoSaveRef.current = autoSave; }, [autoSave]);


  // 标签弹窗
  const [tagMenu, setTagMenu] = useState<"closed" | "main" | "existing" | "custom">("closed");
  const [tagSearch, setTagSearch] = useState("");
  const [customTagInput, setCustomTagInput] = useState("");
  const [tagError, setTagError] = useState("");
  const [existingTags, setExistingTags] = useState(() => getAllTags());

  // 已有图片弹窗
  const [showExistingImages, setShowExistingImages] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  // ImagePicker 弹窗
  const [showCoverImagePicker, setShowCoverImagePicker] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // 收集所有已有的图片：摄影画廊照片 + 文章封面 + 背景图片
  useEffect(() => {
    const collect = () => {
      const urlSet = new Set<string>();
      // 照片
      import("@/data/photos").then(mod => {
        mod.loadPhotos().forEach((p: Photo) => { if (p.src) urlSet.add(p.src); });
      }).finally(() => {
        // 已有文章的封面
        const posts = loadCustomPosts();
        posts.forEach((p) => { if (p.coverImage) urlSet.add(p.coverImage); });
        // 背景图片
        try {
          const assets = JSON.parse(localStorage.getItem("bg_assets") || "[]") as { src: string; type: string }[];
          assets.forEach((a) => { if (a.type === "image" && a.src) urlSet.add(a.src); });
        } catch { console.warn("blog-new: operation failed"); }
        setExistingImages(Array.from(urlSet));
      });
    };
    collect();
    // 也尝试从服务端拉照片
    import("@/data/photos").then(mod => mod.loadPhotosFromServer()).then(serverPhotos => {
      if (serverPhotos && serverPhotos.length > 0) {
        localStorage.setItem("gallery_photos", JSON.stringify(serverPhotos));
        collect();
      }
    });
  }, []);

  // 编辑模式：加载已有文章
  useEffect(() => {
    if (!editSlug) return;
    const posts = loadCustomPosts();
    const post = posts.find((p) => p.slug === editSlug);
    if (!post) return;
    setTitle(post.title);
    setCategory(post.category);
    setTags(post.tags || []);
    setSummary(post.summary || "");
    setCoverImage(post.coverImage || null);
    setCoverPosition(post.coverPosition ?? 50);
    setCommentsEnabled(post.commentsEnabled !== false);
    setIsDraft(post.draft === true);
    // 延迟填充编辑器内容
    setTimeout(() => {
      richTextRef.current?.setHTML(post.content || "<p></p>");
      lastSavedHtmlRef.current = post.content || "<p></p>";
    }, 50);
  }, [editSlug]);

  // ⏱ 防抖自动保存：停止输入 5 秒后自动保存，使用 ref 避免闭包陷阱
  useEffect(() => {
    if (!autoSave) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      return;
    }
    // autoSave 开关状态下不需要做额外的事
    // RichTextEditor 的 onUpdate 回调会触发内容更新
  }, [autoSave]);

  // TipTap 内容变化时触发防抖保存
  const handleEditorUpdate = useCallback(() => {
    if (!autoSaveRef.current) return;
    const html = richTextRef.current?.getHTML() || "";
    const hasChanges = html !== lastSavedHtmlRef.current && html.replace(/<[^>]*>/g, "").trim();
    if (!hasChanges || isSavingRef.current) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      doAutoSave();
    }, 5000);
  }, []);

  // 切换自动保存开关时持久化
  useEffect(() => {
    localStorage.setItem("blog_autosave_enabled", String(autoSave));
  }, [autoSave]);

  async function doAutoSave() {
    isSavingRef.current = true;
    try {
      const html = richTextRef.current?.getHTML() || "";
      const wordCount = richTextRef.current?.getWordCount() || 0;

      // 🔑 从 DOM 读取最新标题，避免 React state 闭包问题
      const titleInput = document.querySelector<HTMLInputElement>('input[placeholder="文章标题..."]');
      const currentTitle = titleInput?.value?.trim() || titleRef.current?.trim() || "未命名草稿";

      let slug: string;
      let date: string;
      if (isEditingRef.current && editSlugRef.current) {
        slug = editSlugRef.current;
        const posts = loadCustomPosts();
        const existing = posts.find((p) => p.slug === slug);
        date = existing?.date || new Date().toISOString().split("T")[0];
      } else {
        if (!draftSlugRef.current) {
          draftSlugRef.current = "draft-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
        }
        slug = draftSlugRef.current;
        date = new Date().toISOString().split("T")[0];
      }

      const post = {
        slug,
        title: currentTitle,
        date,
        readTime: Math.max(1, Math.round(wordCount / 400)) + " 分钟",
        category: categoryRef.current as BlogPost["category"],
        tags: tagsRef.current,
        summary: summaryRef.current.trim(),
        content: html,
        coverImage: coverImageRef.current || undefined,
        coverPosition: coverImageRef.current ? coverPositionRef.current : undefined,
        commentsEnabled: commentsEnabledRef.current,
        draft: isEditingRef.current ? isDraftRef.current : true,
      };
      await saveCustomPost(post).then(({ ok }) => {
        if (!ok) setSavedIndicator(false);
      });
      lastSavedHtmlRef.current = html;
      setSavedIndicator(true);
      setTimeout(() => setSavedIndicator(false), 2000);

      // 🔑 非编辑模式首次自动保存后更新 URL
      if (!isEditingRef.current && draftSlugRef.current && !window.location.search.includes("edit=")) {
        window.history.replaceState(null, "", `/blog/new?edit=${draftSlugRef.current}`);
      }
    } finally {
      isSavingRef.current = false;
    }
  }

  // 手动保存（仍保留供快捷键 Ctrl+Shift+S 等调用，但 UI 按钮已移除）
  function handleManualSave() {
    handleSaveDraft();
  }

  // 设置封面图片
  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await compressAndUpload(file, 800);
      setCoverImage(url);
    } catch { setCoverImage(null); }
    setUploadingCover(false);
  }

  // 插入图片
  // 插入表情
// 插入图片 URL 到编辑器
// 插入代码块
  // 插入链接 —— 保存光标位置，弹窗关闭后插入
  // 检测当前选区所在的标题级别
  // 执行标题命令并更新状态
// 恢复焦点到编辑器
  // 标签操作
  function addExistingTag(tag: string) {
    if (!tags.includes(tag)) setTags([...tags, tag]);
    setTagMenu("closed"); setTagSearch("");
  }
  function confirmCustomTag() {
    const val = customTagInput.trim();
    if (!val) return;
    if (existingTags.includes(val)) {
      setTagError(`"${val}" 已在原有标签中，请直接选择`);
      return;
    }
    const custom = loadCustomTags();
    if (!custom.includes(val)) {
      custom.push(val);
      saveCustomTags(custom);
      setExistingTags(getAllTags());
    }
    if (!tags.includes(val)) setTags([...tags, val]);
    setCustomTagInput(""); setTagError(""); setTagMenu("closed");
  }

  // 发布 / 更新
  function handlePublish() {
    if (!title.trim()) return;
    const html = richTextRef.current?.getHTML() || "";
    if (!html.replace(/<[^>]*>/g, "").trim()) return;
    const wordCount = richTextRef.current?.getWordCount() || 0;

    // 编辑模式：保留原 slug 和日期
    let slug: string;
    let date: string;
    if (isEditing && editSlug) {
      const posts = loadCustomPosts();
      const existing = posts.find((p) => p.slug === editSlug);
      slug = editSlug;
      date = existing?.date || new Date().toISOString().split("T")[0];
    } else {
      slug = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
      date = new Date().toISOString().split("T")[0];
    }

    const post = {
      slug,
      title: title.trim(),
      date,
      readTime: Math.max(1, Math.round(wordCount / 400)) + " 分钟",
      category: category as BlogPost["category"],
      tags,
      summary: summary.trim(),
      content: html,
      coverImage: coverImage || undefined,
      coverPosition: coverImage ? coverPosition : undefined,
      commentsEnabled: commentsEnabled,
      draft: false,
    };
    saveCustomPost(post).then(({ ok }) => {
      // 🔑 发布后清除草稿缓存，无论 API 是否成功（本地已保存）
    });
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    router.push("/blog");
  }

  // 保存草稿
  function handleSaveDraft() {
    const html = richTextRef.current?.getHTML() || "";
    if (!title.trim() && !html.replace(/<[^>]*>/g, "").trim()) return;
    const wordCount = richTextRef.current?.getWordCount() || 0;

    let slug: string;
    let date: string;
    if (isEditing && editSlug) {
      slug = editSlug;
      const posts = loadCustomPosts();
      const existing = posts.find((p) => p.slug === editSlug);
      date = existing?.date || new Date().toISOString().split("T")[0];
    } else {
      if (!draftSlugRef.current) {
        draftSlugRef.current = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
      }
      slug = draftSlugRef.current;
      date = new Date().toISOString().split("T")[0];
    }

    const post: BlogPost = {
      slug,
      title: title.trim() || "未命名草稿",
      date,
      readTime: Math.max(1, Math.round(wordCount / 400)) + " 分钟",
      category: category as BlogPost["category"],
      tags,
      summary: summary.trim(),
      content: html,
      coverImage: coverImage || undefined,
      coverPosition: coverImage ? coverPosition : undefined,
      commentsEnabled,
      draft: true,
    };
    saveCustomPost(post).then(({ ok }) => {
      if (!ok) setSavedIndicator(false);
    });
    lastSavedHtmlRef.current = html;
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 2000);
    if (!isEditing && slug) {
      router.replace(`/blog/new?edit=${slug}`);
      setTitle(title.trim() || "未命名草稿");
    }
  }

  // 删除（编辑模式下）
  function handleDelete() {
    if (!editSlug) return;
    deleteCustomPost(editSlug).then(({ ok }) => {
      if (!ok) { /* API 删除失败，但本地已删 */ }
    });
    router.push("/blog");
  }

  // 非管理员：重定向
  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-4">
        <h1 className="text-2xl font-bold">需要管理员权限</h1>
        <p className="text-muted-foreground">请先登录后再写文章</p>
        <Button className="rounded-xl" onClick={() => router.push("/blog")}>返回博客</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => router.push("/blog")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">{isEditing ? "编辑文章" : "写文章"}</h1>
        {isAdmin && isEditing && (
          <Button variant="outline" size="sm" className="rounded-lg text-xs text-destructive ml-auto" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> 删除文章
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {/* Title */}
        <Input
          placeholder="文章标题..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-2xl font-bold border-none px-0 rounded-none placeholder:text-muted-foreground/40 focus-visible:ring-0"
        />

        {/* 封面图片 */}
        <div>
          {coverImage ? (
            <div className="space-y-2">
              <div className="relative rounded-xl overflow-hidden">
                <img
                  src={coverImage} alt="封面"
                  className="w-full h-48 object-cover transition-all"
                  style={{ objectPosition: `50% ${coverPosition}%` }}
                />
                <button
                  onClick={() => setCoverImage(null)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 text-sm"
                >✕</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground shrink-0">位置</span>
                <input
                  type="range" min="0" max="100" step="5" value={coverPosition}
                  onChange={(e) => setCoverPosition(parseInt(e.target.value, 10))}
                  className="flex-1 accent-primary h-1"
                />
                <span className="text-[10px] text-muted-foreground w-8">{coverPosition === 0 ? "顶部" : coverPosition === 100 ? "底部" : coverPosition === 50 ? "居中" : ""}</span>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => coverInputRef.current?.click()}
                className="flex-1 py-8 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors text-muted-foreground hover:text-primary text-sm flex flex-col items-center gap-2"
              >
                <ImageIcon className="h-6 w-6" />
                <span>本地上传</span>
              </button>
              <button
                onClick={() => setShowCoverImagePicker(true)}
                className="flex-1 py-8 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors text-muted-foreground hover:text-primary text-sm flex flex-col items-center gap-2"
              >
                <Images className="h-6 w-6" />
                <span>已有图片</span>
              </button>
            </div>
          )}
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
          <UploadProgress visible={uploadingCover} label="正在上传封面..." />
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">分类：</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="text-xs rounded-lg border border-input bg-background px-2 py-1.5">
              {categories.map((c) => (<option key={c.key} value={c.key}>{c.label}</option>))}
            </select>
          </div>

          {/* Tags */}
          <div className="flex items-center gap-1.5 flex-wrap relative">
            <span className="text-xs text-muted-foreground">标签：</span>
            {tags.map((t, i) => (
              <Badge key={i} variant="secondary" className="text-xs gap-1 pr-1">
                {t}
                <button onClick={() => setTags(tags.filter((_, j) => j !== i))}>
                  <span className="text-[10px]">✕</span>
                </button>
              </Badge>
            ))}
            <button onClick={() => { setTagMenu(tagMenu === "closed" ? "main" : "closed"); setTagSearch(""); setCustomTagInput(""); setTagError(""); }}
              className="text-xs rounded-lg border border-input bg-background px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors">
              + 添加标签
            </button>

            {tagMenu !== "closed" && (
              <div className="absolute top-full left-0 mt-1 z-50 w-64 rounded-xl border border-border bg-popover shadow-xl p-3">
                {/* 关闭按钮 */}
                <button
                  onClick={() => { setTagMenu("closed"); setTagSearch(""); setCustomTagInput(""); setTagError(""); }}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground text-xs transition-colors"
                >✕</button>
                {tagMenu === "main" && (
                  <div className="space-y-1">
                    <button onClick={() => { setTagMenu("existing"); setTagSearch(""); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-accent">📋 原有标签</button>
                    <button onClick={() => { setTagMenu("custom"); setCustomTagInput(""); setTagError(""); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-accent">✏️ 自定义标签</button>
                    <hr className="border-border my-1" />
                    <button onClick={() => { setTagMenu("closed"); setTagSearch(""); setCustomTagInput(""); setTagError(""); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50">取消</button>
                  </div>
                )}
                {tagMenu === "existing" && (
                  <div className="space-y-2">
                    <button onClick={() => setTagMenu("main")} className="text-xs text-muted-foreground hover:text-foreground">← 返回</button>
                    <Input placeholder="搜索标签..." value={tagSearch} onChange={(e) => setTagSearch(e.target.value)}
                      className="rounded-lg text-sm h-8" autoFocus />
                    <div className="max-h-40 overflow-y-auto space-y-0.5">
                      {existingTags.filter((t) => !tags.includes(t) && t.toLowerCase().includes(tagSearch.toLowerCase())).map((t) => (
                        <button key={t} onClick={() => addExistingTag(t)}
                          className="w-full text-left px-3 py-1.5 rounded-lg text-sm hover:bg-accent truncate">{t}</button>
                      ))}
                      {existingTags.filter((t) => !tags.includes(t) && t.toLowerCase().includes(tagSearch.toLowerCase())).length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-3">没有匹配的标签</p>
                      )}
                    </div>
                    <button onClick={() => { setTagMenu("closed"); setTagSearch(""); }}
                      className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1.5 rounded-lg hover:bg-accent/50 mt-1">取消</button>
                  </div>
                )}
                {tagMenu === "custom" && (
                  <div className="space-y-2">
                    <button onClick={() => { setTagMenu("main"); setCustomTagInput(""); setTagError(""); }} className="text-xs text-muted-foreground hover:text-foreground">← 返回</button>
                    <Input placeholder="输入新标签名..." value={customTagInput}
                      onChange={(e) => { setCustomTagInput(e.target.value); setTagError(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter") confirmCustomTag(); }}
                      className="rounded-lg text-sm h-8" autoFocus />
                    {tagError && (<p className="text-xs text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-lg">{tagError}</p>)}
                    <Button size="sm" onClick={confirmCustomTag} disabled={!customTagInput.trim()}
                      className="w-full rounded-lg text-xs">确认添加</Button>
                    <button onClick={() => { setTagMenu("closed"); setCustomTagInput(""); setTagError(""); }}
                      className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1.5 rounded-lg hover:bg-accent/50">取消</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <Input placeholder="摘要（可选，留空则不显示）" value={summary}
          onChange={(e) => setSummary(e.target.value)} className="rounded-xl text-sm" />

        {/* 现代化所见即所得编辑器（TipTap） */}
        <RichTextEditor ref={richTextRef} onUpdate={handleEditorUpdate} />

        {/* 已有图片选择 — 封面 */}
        <ImagePicker open={showCoverImagePicker} onOpenChange={setShowCoverImagePicker}
          onSelect={(url) => setCoverImage(url)} title="选择已有图片作为封面" />

        {/* 评论区开关 */}

        {/* 评论区开关 */}
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <button
              type="button"
              role="switch"
              aria-checked={commentsEnabled}
              onClick={() => setCommentsEnabled(!commentsEnabled)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                commentsEnabled ? "bg-primary" : "bg-input"
              }`}
            >
              <span className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${
                commentsEnabled ? "translate-x-4" : "translate-x-0"
              }`} />
            </button>
            <span className="text-xs text-muted-foreground select-none">💬 评论（{commentsEnabled ? "开启" : "关闭"}）</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <button
              type="button"
              role="switch"
              aria-checked={autoSave}
              onClick={() => setAutoSave(!autoSave)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                autoSave ? "bg-primary" : "bg-input"
              }`}
            >
              <span className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${
                autoSave ? "translate-x-4" : "translate-x-0"
              }`} />
            </button>
            <span className="text-xs text-muted-foreground select-none">💾 自动保存（{autoSave ? "每30秒" : "关闭"}）</span>
          </label>
          {savedIndicator && (
            <span className="text-[11px] text-green-500 animate-pulse">✅ 已保存</span>
          )}
        </div>

        {/* Save & Publish */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border flex-wrap">
          <Button variant="outline" className="rounded-xl gap-2" onClick={handleSaveDraft} title="保存为草稿，不公开显示">
            <Save className="h-4 w-4" /> 保存草稿
          </Button>
          <Button onClick={handlePublish} disabled={!title.trim()}
            className="rounded-xl gap-2 bg-gradient-to-r from-purple-600 to-cyan-500 text-white">
            <Send className="h-4 w-4" /> {isEditing ? "发布更新" : "发布文章"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function NewBlogPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">加载中...</div>}>
      <NewBlogPageInner />
    </Suspense>
  );
}
