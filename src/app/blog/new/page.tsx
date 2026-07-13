"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bold, Italic, Underline, Heading1, Heading2, List, ListOrdered,
  ImageIcon, Smile, ArrowLeft, Send, Quote, Trash2, Undo2, Redo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { saveCustomPost, loadCustomPosts, deleteCustomPost } from "@/lib/blog-store";
import { useAuth } from "@/lib/auth-context";
import type { BlogPost } from "@/data/blog-posts";
import { getAllMarkers } from "@/lib/travel-store";

const categories = [
  { key: "life", label: "生活" },
  { key: "travel", label: "旅行" },
  { key: "photography", label: "摄影" },
  { key: "tech", label: "技术" },
  { key: "reflection", label: "感悟" },
] as const;

const EMOJIS = ["😀","😂","🥰","😎","🤔","💪","✨","🔥","🌟","💡","📷","✈️","🏔️","🌊","🌅","🎉","❤️","👍","👏","🙏","🎵","📝","💻","🎮","🏀","☕","🍜","🌸","🌿","🐱"];

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

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 800;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  const [loaded, setLoaded] = useState(false);

  // 标签弹窗
  const [tagMenu, setTagMenu] = useState<"closed" | "main" | "existing" | "custom">("closed");
  const [tagSearch, setTagSearch] = useState("");
  const [customTagInput, setCustomTagInput] = useState("");
  const [tagError, setTagError] = useState("");
  const [existingTags, setExistingTags] = useState(() => getAllTags());

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
    // 延迟填充编辑器内容（等 DOM 就绪）
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = post.content || "<p><br></p>";
      }
    }, 50);
    setLoaded(true);
  }, [editSlug]);

  // 执行编辑命令
  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  // 设置封面图片
  function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImage(file).then((dataUrl) => {
      setCoverImage(dataUrl);
    }).catch(() => {});
  }

  // 插入图片
  async function insertImage() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      const el = editorRef.current;
      if (el) {
        el.focus();
        // 恢复选区到编辑器
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const img = document.createElement("img");
          img.src = dataUrl;
          img.alt = file.name.replace(/\.[^.]+$/, "");
          img.className = "rounded-xl my-4 max-w-full";
          img.style.maxHeight = "400px";
          range.insertNode(img);
          // 在图片后插入换行
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
    } catch { /* ignore */ }
  }

  // 插入表情
  function insertEmoji(emoji: string) {
    const el = editorRef.current;
    if (el) {
      el.focus();
      document.execCommand("insertText", false, emoji);
      setShowEmoji(false);
    }
  }

  // 检测当前选区所在的标题级别
  function detectHeading() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    // 尝试从 startContainer 往上找，同时检查 anchorNode
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

  // 执行标题命令并更新状态
  function applyHeading(value: string) {
    if (value) {
      exec("formatBlock", `<${value}>`);
      setCurrentHeading(value);
    } else {
      exec("formatBlock", "<p>");
      setCurrentHeading("");
    }
  }

  // 恢复焦点到编辑器
  function focusEditor() {
    const el = editorRef.current;
    if (el) {
      el.focus();
      detectHeading();
      // 如果编辑器为空，确保有初始段落
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
  function handleSave() {
    if (!title.trim()) return;
    const html = editorRef.current?.innerHTML || "";
    if (!html.replace(/<[^>]*>/g, "").trim()) return;
    const wordCount = (editorRef.current?.textContent || "").replace(/\s/g, "").length;

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
    };
    saveCustomPost(post as any);
    router.push("/blog");
  }

  // 删除（编辑模式下）
  function handleDelete() {
    if (!editSlug) return;
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
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => router.back()}>
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
            <button
              onClick={() => coverInputRef.current?.click()}
              className="w-full py-8 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors text-muted-foreground hover:text-primary text-sm flex flex-col items-center gap-2"
            >
              <ImageIcon className="h-6 w-6" />
              <span>添加封面图片（可选）</span>
            </button>
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
                {tagMenu === "main" && (
                  <div className="space-y-1">
                    <button onClick={() => { setTagMenu("existing"); setTagSearch(""); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-accent">📋 原有标签</button>
                    <button onClick={() => { setTagMenu("custom"); setCustomTagInput(""); setTagError(""); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-accent">✏️ 自定义标签</button>
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
          <button onClick={() => exec("bold")} className="p-1.5 rounded hover:bg-accent transition-colors" title="加粗"><Bold className="h-4 w-4" /></button>
          <button onClick={() => exec("italic")} className="p-1.5 rounded hover:bg-accent transition-colors" title="斜体"><Italic className="h-4 w-4" /></button>
          <button onClick={() => exec("underline")} className="p-1.5 rounded hover:bg-accent transition-colors" title="下划线"><Underline className="h-4 w-4" /></button>
          <span className="w-px h-5 bg-border mx-0.5" />
          <button onClick={() => exec("insertUnorderedList")} className="p-1.5 rounded hover:bg-accent transition-colors" title="无序列表"><List className="h-4 w-4" /></button>
          <button onClick={() => exec("insertOrderedList")} className="p-1.5 rounded hover:bg-accent transition-colors" title="有序列表"><ListOrdered className="h-4 w-4" /></button>
          <button onClick={() => exec("formatBlock", "<blockquote>")} className="p-1.5 rounded hover:bg-accent transition-colors" title="引用"><Quote className="h-4 w-4" /></button>
          <span className="w-px h-5 bg-border mx-0.5" />
          <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded hover:bg-accent transition-colors" title="插入图片"><ImageIcon className="h-4 w-4" /></button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={insertImage} />
          <button onClick={() => setShowEmoji(!showEmoji)} className={`p-1.5 rounded transition-colors ${showEmoji ? "bg-accent" : "hover:bg-accent"}`} title="表情">
            <Smile className="h-4 w-4" />
          </button>
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

        {/* Emoji grid */}
        {showEmoji && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl border border-border bg-background grid grid-cols-10 gap-1 max-h-32 overflow-y-auto sticky top-44 z-40">
            {EMOJIS.map((emoji) => (
              <button key={emoji} onClick={() => insertEmoji(emoji)}
                className="text-lg p-1 rounded hover:bg-accent transition-colors">{emoji}</button>
            ))}
          </motion.div>
        )}

        {/* 所见即所得编辑器 */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onClick={focusEditor}
          onKeyUp={detectHeading}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const sel = window.getSelection();
              if (!sel || !sel.rangeCount) return;
              // 检查是否在 blockquote 内
              let node: Node | null = sel.getRangeAt(0).startContainer;
              while (node && node !== editorRef.current) {
                if (node.nodeType === 1 && (node as Element).tagName === "BLOCKQUOTE") {
                  const text = (node as Element).textContent || "";
                  // 如果 blockquote 内容为空，退出引用
                  if (text.trim() === "") {
                    e.preventDefault();
                    const p = document.createElement("p");
                    p.innerHTML = "<br>";
                    (node as Element).replaceWith(p);
                    const range = document.createRange();
                    range.setStart(p, 0);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    return;
                  }
                  // 如果在 blockquote 末尾按 Enter，在后面插入新段落
                  const range = sel.getRangeAt(0);
                  if (range.collapsed && range.startOffset >= (node.textContent || "").length) {
                    e.preventDefault();
                    const p = document.createElement("p");
                    p.innerHTML = "<br>";
                    (node as Element).after(p);
                    const range2 = document.createRange();
                    range2.setStart(p, 0);
                    range2.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range2);
                    return;
                  }
                  break;
                }
                node = node.parentNode;
              }
            }
          }}
          className="min-h-[500px] p-6 rounded-xl border border-white/20 text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-text shadow-lg [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:my-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:bg-muted/30 [&_blockquote]:rounded-r-lg [&_img]:rounded-xl [&_img]:my-4 [&_img]:max-w-full [&_strong]:font-semibold [&_em]:italic empty:before:content-['开始写作...'] empty:before:text-muted-foreground/40"
          style={{
            backdropFilter: `blur(${bgOpacity < 30 ? 4 : bgOpacity < 60 ? 12 : 24}px)`,
            background: isDark
              ? `rgba(255,255,255,${bgOpacity / 1000})`
              : `rgba(255,255,255,${bgOpacity / 100})`,
          }}
          onPaste={(e) => {
            // 粘贴时只保留纯文本
            e.preventDefault();
            const text = e.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, text);
          }}
        />

        {/* Save */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" className="rounded-xl" onClick={() => router.back()}>取消</Button>
          <Button onClick={handleSave} disabled={!title.trim()}
            className="rounded-xl gap-2 bg-gradient-to-r from-purple-600 to-cyan-500 text-white">
            <Send className="h-4 w-4" /> {isEditing ? "保存修改" : "发布文章"}
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
