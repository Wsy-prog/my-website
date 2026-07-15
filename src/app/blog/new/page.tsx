"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bold, Italic, Underline, List, ListOrdered,
  ImageIcon, Smile, ArrowLeft, Send, Quote, Trash2, Undo2, Redo2,
  Images, Code, Link, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveCustomPost, loadCustomPosts, deleteCustomPost } from "@/lib/blog-store";
import { loadCustomTags, saveCustomTags, getAllTags } from "@/lib/blog-tags";
import { useAuth } from "@/lib/auth-context";
import type { BlogPost } from "@/data/blog-posts";
import { getAllMarkers } from "@/lib/travel-store";
import { compressAndUpload } from "@/lib/cloudinary";
import type { Photo } from "@/data/photos";

const categories = [
  { key: "life", label: "生活" },
  { key: "travel", label: "旅行" },
  { key: "photography", label: "摄影" },
  { key: "tech", label: "技术" },
  { key: "reflection", label: "感悟" },
] as const;

const EMOJIS = ["😀","😂","🥰","😎","🤔","💪","✨","🔥","🌟","💡","📷","✈️","🏔️","🌊","🌅","🎉","❤️","👍","👏","🙏","🎵","📝","💻","🎮","🏀","☕","🍜","🌸","🌿","🐱"];

const locationTags = typeof window !== "undefined" ? getAllMarkers().map(m => m.title) : [];

export const dynamic = "force-dynamic";

function NewBlogPageInner() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editSlug = searchParams.get("edit");
  const isEditing = !!editSlug;

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverPosition, setCoverPosition] = useState(50);
  const [category, setCategory] = useState<string>("life");
  const [tags, setTags] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [currentHeading, setCurrentHeading] = useState("");
  const [bgOpacity, setBgOpacity] = useState(60);
  const [isDark, setIsDark] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [isDraft, setIsDraft] = useState(false);
  const [autoSave, setAutoSave] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("blog_autosave_enabled") !== "false";
    }
    return true;
  });
  const [publishing, setPublishing] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedHtmlRef = useRef("");
  const isSavingRef = useRef(false);

  // 🔑 固定 slug ref：新建草稿首次保存时生成，后续复用
  const draftSlugRef = useRef<string | null>(null);

  // 插入链接
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // 标签弹窗
  const [tagMenu, setTagMenu] = useState<"closed" | "main" | "existing" | "custom">("closed");
  const [tagSearch, setTagSearch] = useState("");
  const [customTagInput, setCustomTagInput] = useState("");
  const [tagError, setTagError] = useState("");
  const [existingTags, setExistingTags] = useState(() => getAllTags(locationTags));

  // 已有图片弹窗
  const [showExistingImages, setShowExistingImages] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  // 收集所有已有的图片：摄影画廊照片 + 文章封面 + 背景图片
  const [pendingImages, setPendingImages] = useState(false);

  useEffect(() => {
    const collectAll = (): string[] => {
      const urlSet = new Set<string>();
      // 照片
      try {
        const photosData = JSON.parse(localStorage.getItem("gallery_photos") || "[]") as Photo[];
        photosData.forEach((p) => { if (p.src) urlSet.add(p.src); });
      } catch {}
      // 已有文章的封面
      const posts = loadCustomPosts();
      posts.forEach((p) => { if (p.coverImage) urlSet.add(p.coverImage); });
      // 背景图片
      try {
        const assets = JSON.parse(localStorage.getItem("bg_assets") || "[]") as { src: string; type: string }[];
        assets.forEach((a) => { if (a.type === "image" && a.src) urlSet.add(a.src); });
      } catch {}
      return Array.from(urlSet);
    };
    setExistingImages(collectAll());
    // 也尝试从服务端拉照片
    import("@/data/photos").then(mod => mod.loadPhotosFromServer()).then(serverPhotos => {
      if (serverPhotos && serverPhotos.length > 0) {
        localStorage.setItem("gallery_photos", JSON.stringify(serverPhotos));
        setExistingImages(collectAll());
      }
    });
  }, []);

  function openExistingImages() {
    if (pendingImages) return;
    setPendingImages(true);
    // 先收集现有图片
    const urlSet = new Set(existingImages);
    // 然后尝试从服务端拉照片
    import("@/data/photos").then(mod => mod.loadPhotosFromServer()).then(serverPhotos => {
      if (serverPhotos && serverPhotos.length > 0) {
        localStorage.setItem("gallery_photos", JSON.stringify(serverPhotos));
        serverPhotos.forEach((p: Photo) => { if (p.src) urlSet.add(p.src); });
      }
    }).finally(() => {
      setExistingImages(Array.from(urlSet));
      setPendingImages(false);
      setShowExistingImages(true);
    });
  }

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
    // 延迟填充编辑器内容（等 DOM 就绪）
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = post.content || "<p><br></p>";
        lastSavedHtmlRef.current = post.content || "<p><br></p>";
      }
    }, 50);
  }, [editSlug]);

  // ⏱ 防抖自动保存：停止输入 5 秒后自动保存
  const autoSaveEnabledRef = useRef(autoSave);
  autoSaveEnabledRef.current = autoSave;

  useEffect(() => {
    if (!autoSave) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      return;
    }
    // 监听键盘和点击事件触发防抖重设
    const handler = () => {
      if (!autoSaveEnabledRef.current) return;
      const html = editorRef.current?.innerHTML || "";
      const hasChanges = html !== lastSavedHtmlRef.current && html.replace(/<[^>]*>/g, "").trim();
      if (!hasChanges || isSavingRef.current) return;

      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        doAutoSave();
      }, 5000);
    };

    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener("input", handler);
      editor.addEventListener("keyup", handler);
    }
    return () => {
      if (editor) {
        editor.removeEventListener("input", handler);
        editor.removeEventListener("keyup", handler);
      }
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, []); // 空 deps — 始终绑定一次，用 ref 读取最新值

  // 切换自动保存开关时持久化
  useEffect(() => {
    localStorage.setItem("blog_autosave_enabled", String(autoSave));
  }, [autoSave]);

  async function doAutoSave() {
    isSavingRef.current = true;
    const html = editorRef.current?.innerHTML || "";
    const wordCount = (editorRef.current?.textContent || "").replace(/\s/g, "").length;

    let slug: string;
    let date: string;
    if (isEditing && editSlug) {
      const posts = loadCustomPosts();
      const existing = posts.find((p) => p.slug === editSlug);
      slug = editSlug;
      date = existing?.date || new Date().toISOString().split("T")[0];
    } else {
      // 🔑 新建草稿：首次生成固定 slug，后续复用
      if (!draftSlugRef.current) {
        draftSlugRef.current = "draft-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
      }
      slug = draftSlugRef.current;
      date = new Date().toISOString().split("T")[0];
    }

    const post = {
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
      // 🔑 新建文章（非编辑模式）自动保存/手动保存一律存为草稿
      draft: isEditing ? isDraft : true,
    };
    saveCustomPost(post as any);
    lastSavedHtmlRef.current = html;
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 2000);
    isSavingRef.current = false;

    // 🔑 非编辑模式首次保存后更新 URL，防止刷新后找不到文章
    if (!isEditing && draftSlugRef.current && !window.location.search.includes("edit=")) {
      router.replace(`/blog/new?edit=${draftSlugRef.current}`, { scroll: false });
    }
  }

  // 手动保存（已合并到 handleSaveDraft，保留以供快捷键等调用）
  function handleManualSave() {
    handleSaveDraft();
  }

  // 执行编辑命令
  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  // 设置封面图片
  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCoverImage("⏳");
      const url = await compressAndUpload(file, 800);
      setCoverImage(url);
    } catch {
      setCoverImage(null);
      setSavedIndicator(false);
    }
  }

  // 插入图片
  async function insertImage() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    try {
      const url = await compressAndUpload(file, 800);
      const el = editorRef.current;
      if (el) {
        el.focus();
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const img = document.createElement("img");
          img.src = url;
          img.alt = file.name.replace(/\.[^.]+$/, "");
          img.className = "rounded-xl my-4 max-w-full";
          img.style.maxHeight = "400px";
          range.insertNode(img);
          const br = document.createElement("br");
          range.setStartAfter(img);
          range.insertNode(br);
          range.setStartAfter(br);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        fileInputRef.current!.value = "";
      }
    } catch {
      // 图片上传失败由自动保存时的检测覆盖
    }
  }

  // 插入表情
  function insertEmoji(emoji: string) {
    const el = editorRef.current;
    if (el) {
      el.focus();
      document.execCommand("insertText", false, emoji);
    }
  }

  // 插入代码块
  function insertCodeBlock() {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    const selectedText = sel && sel.rangeCount > 0 ? sel.toString() : "";
    const pre = document.createElement("pre");
    pre.className = "code-block bg-muted/60 rounded-xl p-4 my-4 text-sm font-mono overflow-x-auto outline-none";
    pre.setAttribute("spellcheck", "false");
    if (selectedText) {
      pre.textContent = selectedText;
    }

    // 后面跟一个空段落，保证代码块下方可继续写正文
    const trailingP = document.createElement("p");
    trailingP.innerHTML = "<br>";

    // 插入
    if (sel && sel.rangeCount > 0 && selectedText) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(pre);
      pre.after(trailingP);
    } else if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.insertNode(pre);
      pre.after(trailingP);
    } else {
      el.appendChild(pre);
      el.appendChild(trailingP);
    }
    // 光标移到 pre 内部开头
    const newRange = document.createRange();
    newRange.setStart(pre, 0);
    newRange.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(newRange);
    el.focus();
  }

  // 插入链接 —— 保存光标位置，弹窗关闭后插入
  const savedRangeRef = useRef<Range | null>(null);

  function openLinkDialog() {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
    setShowLinkDialog(true);
    setLinkUrl("");
    setLinkText("");
  }

  function insertLink() {
    if (!linkUrl.trim()) return;
    const el = editorRef.current;
    if (!el) return;
    el.focus();

    const sel = window.getSelection();
    const displayText = linkText.trim() || linkUrl.trim();
    const href = linkUrl.trim().replace(/"/g, "&quot;");
    const linkHtml = `<a href="${href}" class="text-primary underline" target="_blank" rel="noopener noreferrer">${displayText}</a>`;

    if (savedRangeRef.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
      savedRangeRef.current = null;
    }

    document.execCommand("insertHTML", false, linkHtml);

    setShowLinkDialog(false);
    setLinkUrl("");
    setLinkText("");
  }

  // 检测当前选区所在的标题级别
  function detectHeading() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    for (const startNode of [range.startContainer, range.endContainer]) {
      let node: Node | null = startNode;
      while (node && node !== editorRef.current) {
        if (node.nodeType === 1) {
          const tag = (node as Element).tagName;
          if (/^H[1-3]$/.test(tag)) { setCurrentHeading(tag.toLowerCase()); return; }
        }
        node = node.parentNode;
      }
    }
    setCurrentHeading("");
  }

  function applyHeading(value: string) {
    if (value) {
      exec("formatBlock", `<${value}>`);
      setCurrentHeading(value);
    } else {
      exec("formatBlock", "<p>");
      setCurrentHeading("");
    }
  }

  function focusEditor() {
    const el = editorRef.current;
    if (el) {
      el.focus();
      detectHeading();
      if (el.innerHTML === "" || el.textContent?.trim() === "") {
        el.innerHTML = "<p><br></p>";
        const range = document.createRange();
        range.setStart(el.firstChild?.firstChild || el, 0);
        range.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }

  // ⌨️ 键盘快捷键处理
  function handleEditorKeyDown(e: React.KeyboardEvent) {
    // Ctrl+B / Ctrl+B
    if (e.ctrlKey && e.key === "b") {
      e.preventDefault();
      exec("bold");
      return;
    }
    // Ctrl+I
    if (e.ctrlKey && e.key === "i") {
      e.preventDefault();
      exec("italic");
      return;
    }
    // Ctrl+K 插入链接
    if (e.ctrlKey && e.key === "k") {
      e.preventDefault();
      openLinkDialog();
      return;
    }
    // Ctrl+Shift+S 保存草稿
    if (e.ctrlKey && e.shiftKey && (e.key === "s" || e.key === "S")) {
      e.preventDefault();
      handleSaveDraft();
      return;
    }
    // Ctrl+S 不触发浏览器保存
    if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
      e.preventDefault();
      return;
    }

    // 原有的 blockquote Enter 处理
    if (e.key === "Enter") {
      const sel3 = window.getSelection();
      if (!sel3 || !sel3.rangeCount) return;
      let nodeBq: Node | null = sel3.getRangeAt(0).startContainer;
      while (nodeBq && nodeBq !== editorRef.current) {
        if (nodeBq.nodeType === 1 && (nodeBq as Element).tagName === "BLOCKQUOTE") {
          const text = (nodeBq as Element).textContent || "";
          if (text.trim() === "") {
            e.preventDefault();
            const p = document.createElement("p");
            p.innerHTML = "<br>";
            (nodeBq as Element).replaceWith(p);
            const range = document.createRange();
            range.setStart(p, 0);
            range.collapse(true);
            sel3.removeAllRanges();
            sel3.addRange(range);
            return;
          }
          const range = sel3.getRangeAt(0);
          if (range.collapsed && range.startOffset >= (nodeBq.textContent || "").length) {
            e.preventDefault();
            const p = document.createElement("p");
            p.innerHTML = "<br>";
            (nodeBq as Element).after(p);
            const range2 = document.createRange();
            range2.setStart(p, 0);
            range2.collapse(true);
            sel3.removeAllRanges();
            sel3.addRange(range2);
            return;
          }
          break;
        }
        nodeBq = nodeBq.parentNode;
      }
    }
  }

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
      setExistingTags(getAllTags(locationTags));
    }
    if (!tags.includes(val)) setTags([...tags, val]);
    setCustomTagInput(""); setTagError(""); setTagMenu("closed");
  }

  // 发布 / 更新
  function handlePublish() {
    if (!title.trim() || publishing) return;
    setPublishing(true);
    const html = editorRef.current?.innerHTML || "";
    if (!html.replace(/<[^>]*>/g, "").trim()) return;
    const wordCount = (editorRef.current?.textContent || "").replace(/\s/g, "").length;

    let slug: string;
    let date: string;
    if (isEditing && editSlug) {
      const posts = loadCustomPosts();
      const existing = posts.find((p) => p.slug === editSlug);
      slug = editSlug;
      date = existing?.date || new Date().toISOString().split("T")[0];
    } else {
      // 🔑 如果有草稿 slug，复用（覆盖草稿，避免残留）
      if (draftSlugRef.current) {
        slug = draftSlugRef.current;
      } else {
        slug = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
      }
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
    saveCustomPost(post as any);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setPublishing(false);
    router.push("/blog");
  }

  // 保存草稿
  function handleSaveDraft() {
    const html = editorRef.current?.innerHTML || "";
    if (!title.trim() && !html.replace(/<[^>]*>/g, "").trim()) return;
    const wordCount = (editorRef.current?.textContent || "").replace(/\s/g, "").length;

    let slug: string;
    let date: string;
    if (isEditing && editSlug) {
      const posts = loadCustomPosts();
      const existing = posts.find((p) => p.slug === editSlug);
      slug = editSlug;
      date = existing?.date || new Date().toISOString().split("T")[0];
    } else {
      if (!draftSlugRef.current) {
        draftSlugRef.current = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
      }
      slug = draftSlugRef.current;
      date = new Date().toISOString().split("T")[0];
    }

    const post = {
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
    saveCustomPost(post as any);
    lastSavedHtmlRef.current = html;
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 2000);
    if (!isEditing && draftSlugRef.current) {
      router.replace(`/blog/new?edit=${draftSlugRef.current}`, { scroll: false });
    }
  }

  // 删除（编辑模式下）
  function handleDelete() {
    if (!editSlug) return;
    if (!confirm("确定要删除这篇文章吗？此操作不可撤销。")) return;
    deleteCustomPost(editSlug);
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
        <h1 className="text-2xl font-bold">
          {isEditing ? "编辑文章" : "写文章"}
          {isEditing && isDraft && <span className="ml-2 text-[11px] font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full align-middle">草稿</span>}
        </h1>
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
                onClick={() => {
                  const urlSet = new Set<string>();
                  import("@/data/photos").then(mod => {
                    mod.loadPhotos().forEach((p: Photo) => { if (p.src) urlSet.add(p.src); });
                  }).finally(() => {
                    try {
                      const assets = JSON.parse(localStorage.getItem("bg_assets") || "[]") as { src: string; type: string }[];
                      assets.forEach((a) => { if (a.type === "image" && a.src) urlSet.add(a.src); });
                    } catch {}
                    const posts = loadCustomPosts();
                    posts.forEach((p) => { if (p.coverImage) urlSet.add(p.coverImage); });
                    setExistingImages(Array.from(urlSet));
                  });
                  import("@/data/photos").then(mod => mod.loadPhotosFromServer()).then(serverPhotos => {
                    if (serverPhotos && serverPhotos.length > 0) {
                      localStorage.setItem("gallery_photos", JSON.stringify(serverPhotos));
                      serverPhotos.forEach((p: Photo) => { if (p.src) urlSet.add(p.src); });
                      setExistingImages(Array.from(urlSet));
                    }
                  });
                  setShowExistingImages(true);
                }}
                className="flex-1 py-8 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors text-muted-foreground hover:text-primary text-sm flex flex-col items-center gap-2"
              >
                <Images className="h-6 w-6" />
                <span>已有图片</span>
              </button>
            </div>
          )}
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
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

        {/* Toolbar */}
        <div className="flex items-center gap-1 p-2 rounded-xl bg-muted/50 border border-border flex-wrap sticky top-20 z-40 backdrop-blur">
          <button onClick={() => { editorRef.current?.focus(); document.execCommand("undo"); }} className="p-1.5 rounded hover:bg-accent transition-colors" title="撤销 (Ctrl+Z)"><Undo2 className="h-4 w-4" /></button>
          <button onClick={() => { editorRef.current?.focus(); document.execCommand("redo"); }} className="p-1.5 rounded hover:bg-accent transition-colors" title="重做 (Ctrl+Y)"><Redo2 className="h-4 w-4" /></button>
          <span className="w-px h-5 bg-border mx-0.5" />
          <select value={currentHeading} onChange={(e) => applyHeading(e.target.value)}
            className="text-xs rounded-md border border-input bg-background px-1.5 py-1.5 w-16">
            <option value="">正文</option>
            <option value="h1">标题1</option>
            <option value="h2">标题2</option>
            <option value="h3">标题3</option>
          </select>
          <span className="w-px h-5 bg-border mx-0.5" />
          <button onClick={() => exec("bold")} className="p-1.5 rounded hover:bg-accent transition-colors" title="加粗 (Ctrl+B)"><Bold className="h-4 w-4" /></button>
          <button onClick={() => exec("italic")} className="p-1.5 rounded hover:bg-accent transition-colors" title="斜体 (Ctrl+I)"><Italic className="h-4 w-4" /></button>
          <button onClick={() => exec("underline")} className="p-1.5 rounded hover:bg-accent transition-colors" title="下划线"><Underline className="h-4 w-4" /></button>
          <span className="w-px h-5 bg-border mx-0.5" />
          <button onClick={() => exec("insertUnorderedList")} className="p-1.5 rounded hover:bg-accent transition-colors" title="无序列表"><List className="h-4 w-4" /></button>
          <button onClick={() => exec("insertOrderedList")} className="p-1.5 rounded hover:bg-accent transition-colors" title="有序列表"><ListOrdered className="h-4 w-4" /></button>
          <button onClick={() => exec("formatBlock", "<blockquote>")} className="p-1.5 rounded hover:bg-accent transition-colors" title="引用"><Quote className="h-4 w-4" /></button>
          <span className="w-px h-5 bg-border mx-0.5" />
          <button onClick={insertCodeBlock} className="p-1.5 rounded hover:bg-accent transition-colors" title="插入代码"><Code className="h-4 w-4" /></button>
          <button onClick={openLinkDialog} className="p-1.5 rounded hover:bg-accent transition-colors" title="插入链接 (Ctrl+K)"><Link className="h-4 w-4" /></button>
          <span className="w-px h-5 bg-border mx-0.5" />
          <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded hover:bg-accent transition-colors" title="插入图片"><ImageIcon className="h-4 w-4" /></button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={insertImage} />
          <div className="relative">
            <button onClick={() => setShowEmoji(!showEmoji)} className={`p-1.5 rounded transition-colors ${showEmoji ? "bg-accent" : "hover:bg-accent"}`} title="表情">
              <Smile className="h-4 w-4" />
            </button>
            {showEmoji && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 mt-1 p-3 rounded-xl border border-border bg-popover shadow-xl grid grid-cols-10 gap-1 max-h-32 overflow-y-auto z-50 min-w-[260px]">
                  {EMOJIS.map((emoji) => (
                    <button key={emoji} onClick={() => insertEmoji(emoji)}
                      className="text-lg p-1 rounded hover:bg-accent transition-colors">{emoji}</button>
                  ))}
                </motion.div>
              </>
            )}
          </div>
          <span className="w-px h-5 bg-border mx-0.5" />
          <span className="text-[10px] text-muted-foreground ml-1">模糊</span>
          <input
            type="range" min="0" max="90" step="10" value={bgOpacity}
            onChange={(e) => setBgOpacity(parseInt(e.target.value, 10))}
            className="w-12 accent-primary h-1"
            title="背景模糊度"
          />
          <span className="text-[10px] text-muted-foreground w-5">{bgOpacity}</span>
        </div>

        {/* 所见即所得编辑器 */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onClick={focusEditor}
          onKeyUp={detectHeading}
          onKeyDown={handleEditorKeyDown}
          className="min-h-[500px] p-6 rounded-xl border border-white/20 text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-text shadow-lg [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:my-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:bg-muted/30 [&_blockquote]:rounded-r-lg [&_img]:rounded-xl [&_img]:my-4 [&_img]:max-w-full [&_strong]:font-semibold [&_em]:italic [&_pre]:bg-muted/60 [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:text-sm [&_pre]:font-mono [&_code]:bg-muted/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-sm [&_code]:font-mono [&_code]:text-primary [&_pre_code]:bg-transparent [&_pre_code]:px-0 [&_pre_code]:py-0 [&_pre_code]:rounded-none [&_pre_code]:text-foreground [&_a]:text-primary [&_a]:underline empty:before:content-['\5F00\59CB\5199\4F5C...'] empty:before:text-muted-foreground/40"
          style={{
            backdropFilter: `blur(${bgOpacity < 30 ? 4 : bgOpacity < 60 ? 12 : 24}px)`,
            background: isDark
              ? `rgba(255,255,255,${bgOpacity / 1000})`
              : `rgba(255,255,255,${bgOpacity / 100})`,
          }}
          onPaste={async (e) => {
            const items = e.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
              if (items[i].type.startsWith("image/")) {
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) {
                  try {
                    const url = await compressAndUpload(file, 800);
                    const el = editorRef.current;
                    if (el) {
                      el.focus();
                      const sel = window.getSelection();
                      const img = document.createElement("img");
                      img.src = url;
                      img.alt = "粘贴图片";
                      img.className = "rounded-xl my-4 max-w-full";
                      img.style.maxHeight = "400px";
                      if (sel && sel.rangeCount > 0) {
                        const range = sel.getRangeAt(0);
                        range.insertNode(img);
                        const br = document.createElement("br");
                        range.setStartAfter(img);
                        range.insertNode(br);
                        range.setStartAfter(br);
                        range.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(range);
                      } else {
                        el.appendChild(img);
                      }
                    }
                  } catch { /* ignore */ }
                }
                return;
              }
            }
            e.preventDefault();
            const text = e.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, text);
          }}
        />

        {/* 已有图片选择弹窗 */}
        <Dialog open={showExistingImages} onOpenChange={setShowExistingImages}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>选择已有图片作为封面</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {existingImages.map((src, i) => (
                <button
                  key={i}
                  onClick={() => { setCoverImage(src); setShowExistingImages(false); }}
                  className="group relative rounded-xl overflow-hidden border-2 border-border hover:border-primary transition-all hover:scale-[1.02]"
                >
                  <img src={src} alt="" className="w-full h-24 object-cover" loading="lazy" />
                </button>
              ))}
            </div>
            {existingImages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">暂无已有图片</p>
            )}
          </DialogContent>
        </Dialog>

        {/* 插入链接弹窗 */}
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>🔗 插入链接</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">链接地址</label>
                <Input
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") insertLink(); }}
                  className="rounded-lg text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">显示文字（可选）</label>
                <Input
                  placeholder="点击此处"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") insertLink(); }}
                  className="rounded-lg text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" className="rounded-lg" onClick={() => { setShowLinkDialog(false); setLinkUrl(""); setLinkText(""); }}>取消</Button>
                <Button size="sm" className="rounded-lg" onClick={insertLink} disabled={!linkUrl.trim()}>插入</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 评论区开关 + 自动保存 */}
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
            <span className="text-xs text-muted-foreground select-none">💾 自动保存（{autoSave ? "停止输入5秒后" : "关闭"}）</span>
          </label>
          {savedIndicator && (
            <span className="text-[11px] text-green-500 animate-pulse">✅ 已保存</span>
          )}
        </div>

        {/* Save & Publish */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border flex-wrap">
          <Button variant="outline" className="rounded-xl"
            onClick={() => {
              const hasContent = (editorRef.current?.textContent || "").replace(/\s/g, "").length > 0 || title.trim();
              if (hasContent) {
                if (!confirm("有未发布的内容，确定离开吗？")) return;
              }
              router.push("/blog");
            }}>
            取消
          </Button>
          <Button variant="outline" className="rounded-xl gap-2" onClick={handleSaveDraft} title="保存为草稿 (Ctrl+Shift+S)">
            <Save className="h-4 w-4" /> 保存草稿
          </Button>
          <Button onClick={handlePublish} disabled={!title.trim() || publishing}
            className="rounded-xl gap-2 bg-gradient-to-r from-purple-600 to-cyan-500 text-white">
            <Send className="h-4 w-4" /> {publishing ? "发布中..." : (isEditing ? "发布更新" : "发布文章")}
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
