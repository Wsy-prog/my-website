"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Calendar, Clock, List, Timeline as TimelineIcon, X, PenLine, Pencil, Trash2, Tags, Filter } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { GradientText } from "@/components/shared/GradientText";
import { GlassCard } from "@/components/shared/GlassCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAnimation } from "@/lib/animation-context";
import { blogPosts } from "@/data/blog-posts";
import { getAllPosts, loadCustomPosts, deleteCustomPost, saveCustomPost } from "@/lib/blog-store";
import { loadCustomTags, saveCustomTags } from "@/lib/blog-tags";
import { getAllMarkers } from "@/lib/travel-store";

const categories = [
  { key: "all", label: "全部" },
  { key: "life", label: "生活" },
  { key: "travel", label: "旅行" },
  { key: "photography", label: "摄影" },
  { key: "tech", label: "技术" },
  { key: "reflection", label: "感悟" },
];

type ViewMode = "list" | "timeline";

export const dynamic = "force-dynamic";

function BlogPageInner() {
  const { isAdmin } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tagParam = searchParams.get("tag") || "";
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  useEffect(() => {
    if (tagParam && tagFilter.length === 0) {
      setTagFilter([tagParam]);
    }
  }, [tagParam]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [showDrafts, setShowDrafts] = useState(false);
  const [draftCount, setDraftCount] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [dateOpen, setDateOpen] = useState(false);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const { enabled: animEnabled } = useAnimation();
  const [allPosts, setAllPosts] = useState<ReturnType<typeof getAllPosts>>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [tagManageOpen, setTagManageOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [tagDeleteConfirm, setTagDeleteConfirm] = useState<string | null>(null);

  // 不可删除的标签
  const protectedTags = new Set(getAllMarkers().map(m => m.title));

  // 自定义标签状态
  const [customTags, setCustomTagsState] = useState<string[]>([]);
  useEffect(() => { setCustomTagsState(loadCustomTags()); }, [tagManageOpen]);

  function addCustomTag() {
    const val = newTagInput.trim();
    if (!val) return;
    const existing = customTags;
    if (!existing.includes(val) && !protectedTags.has(val)) {
      saveCustomTags([...existing, val]);
      setCustomTagsState([...existing, val]);
      setNewTagInput("");
    }
  }

  function removeCustomTag(tag: string) {
    // 从标签池移除
    const updated = customTags.filter(t => t !== tag);
    saveCustomTags(updated);
    setCustomTagsState(updated);
    // 从所有文章中移除该标签
    const all = getAllPosts(blogPosts);
    let changed = false;
    const newAll = all.map(post => {
      if (post.tags.includes(tag)) {
        changed = true;
        const updatedPost = { ...post, tags: post.tags.filter(t => t !== tag) };
        saveCustomPost(updatedPost);
        return updatedPost;
      }
      return post;
    });
    if (changed) setAllPosts(newAll);
  }

  // 每次导航回 /blog 或初次加载时刷新文章列表
  useEffect(() => {
    // 从 API 拉取最新数据（权威数据源）
    import("@/lib/blog-store").then(mod => mod.loadCustomPostsServer()).then(serverPosts => {
      setAllPosts(serverPosts);
      setDraftCount(serverPosts.filter(p => p.draft).length);
    });
  }, [pathname]);

  // 所有文章都可编辑；只有自定义文章可删除
  function isCustomForDelete(slug: string) {
    return loadCustomPosts().some((p) => p.slug === slug);
  }

  function handleDelete(slug: string) {
    deleteCustomPost(slug);
    setAllPosts(getAllPosts(blogPosts));
    setDraftCount(loadCustomPosts().filter(p => p.draft).length);
    setDeleteTarget(null);
  }

  const filtered = allPosts.filter((post) => {
    // 草稿筛选：管理员切换到草稿视图才显示；分类点击退出草稿视图
    if (post.draft !== showDrafts) return false;
    if (showDrafts) return true;
    const matchCategory = activeCategory === "all" || post.category === activeCategory;
    const matchSearch = post.title.includes(search) || (post.summary || "").includes(search) || post.tags.some((t) => t.includes(search));
    const matchTag = tagFilter.length === 0 || tagFilter.every((f) => post.tags.includes(f));
    const matchDateStart = !dateStart || post.date >= dateStart;
    const matchDateEnd = !dateEnd || post.date <= dateEnd;
    return matchCategory && matchSearch && matchTag && matchDateStart && matchDateEnd;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-20">
      <AnimatedSection className="text-center mb-12">
        <GradientText as="h1" className="text-4xl sm:text-5xl font-bold mb-4">博客</GradientText>
        <p className="text-muted-foreground max-w-xl mx-auto">记录生活随笔、技术文章、旅行见闻与摄影心得</p>
      </AnimatedSection>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 mb-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索文章..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
          <Button
            variant={dateOpen || dateStart || dateEnd ? "default" : "outline"}
            size="icon"
            className="rounded-xl shrink-0"
            onClick={() => setDateOpen(!dateOpen)}
            title="按时间筛选"
          >
            <Calendar className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
            className="rounded-xl shrink-0"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "timeline" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("timeline")}
            className="rounded-xl shrink-0"
          >
            <TimelineIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl shrink-0 gap-1" onClick={() => setTagManageOpen(true)}>
            <Tags className="h-4 w-4" /> 标签
          </Button>
          {isAdmin && (
            <Link href="/blog/new">
              <Button className="rounded-xl gap-2 shrink-0 bg-gradient-to-r from-purple-600 to-cyan-500 text-white" size="sm">
                <PenLine className="h-4 w-4" /> 写文章
              </Button>
            </Link>
          )}
        </div>

        {/* Date range row */}
        {dateOpen && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="rounded-xl text-sm flex-1"
            />
            <span className="text-muted-foreground text-sm">至</span>
            <Input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="rounded-xl text-sm flex-1"
            />
            {(dateStart || dateEnd) && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl shrink-0 text-xs text-muted-foreground"
                onClick={() => { setDateStart(""); setDateEnd(""); }}
              >
                清除
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Active date badges */}
      {(dateStart || dateEnd || tagFilter.length > 0) && (
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {tagFilter.map(tag => (
            <Badge key={tag} variant="secondary" className="px-3 py-1 text-sm gap-1">
              🏷️ {tag}
              <button className="hover:text-foreground" onClick={() => setTagFilter(tagFilter.filter(t => t !== tag))}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {dateStart && (
            <Badge variant="secondary" className="px-3 py-1 text-sm">
              📅 从 {dateStart}
              <button className="ml-2 hover:text-foreground" onClick={() => setDateStart("")}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {dateEnd && (
            <Badge variant="secondary" className="px-3 py-1 text-sm">
              📅 至 {dateEnd}
              <button className="ml-2 hover:text-foreground" onClick={() => setDateEnd("")}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {isAdmin && (
          <Badge
            variant={showDrafts ? "default" : "outline"}
            className="px-4 py-2 text-sm rounded-full cursor-pointer hover:scale-105 transition-transform"
            onClick={() => setShowDrafts(!showDrafts)}
          >
            📝 草稿{draftCount > 0 ? ` (${draftCount})` : ""}
          </Badge>
        )}
        {categories.map((cat) => (
          <Badge
            key={cat.key}
            variant={activeCategory === cat.key ? "default" : "outline"}
            className="px-4 py-2 text-sm rounded-full cursor-pointer hover:scale-105 transition-transform"
            onClick={() => { setActiveCategory(cat.key); setShowDrafts(false); }}
          >
            {cat.label}
          </Badge>
        ))}
      </div>

      {/* List View */}
      {viewMode === "list" && (
        <div className="grid md:grid-cols-2 gap-6">
          {filtered.map((post, i) => (
            <GlassCard key={post.slug} delay={i * 0.1} className="h-full flex flex-col relative group/card">
              <Link href={`/blog/${post.slug}`} className="flex-1">
                {post.coverImage && (
                  <div className="w-full h-36 rounded-xl overflow-hidden mb-3">
                    <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover"
                      style={{ objectPosition: `50% ${post.coverPosition ?? 50}%` }} />
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mb-3">
                  {post.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
                <h3 className="text-lg font-semibold mb-2 line-clamp-2">{post.title}</h3>
                {post.summary ? (
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{post.summary}</p>
                ) : (
                  <div className="flex-1" />
                )}
                {post.draft && (
                  <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full font-medium mb-2 inline-block">草稿</span>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {post.date}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {post.readTime}</span>
                </div>
              </Link>
              {isAdmin && (
                <div className="absolute bottom-2 right-2 flex gap-1 md:opacity-0 md:group-hover/card:opacity-100 md:transition-opacity">
                  <Link href={`/blog/new?edit=${post.slug}`} onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background/80">
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </Link>
                  {isCustomForDelete(post.slug) && (
                    deleteTarget === post.slug ? (
                      <div className="flex gap-1">
                        <Button variant="destructive" size="sm" className="h-7 rounded-lg text-[10px]" onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDelete(post.slug); }}>确认</Button>
                        <Button variant="outline" size="sm" className="h-7 rounded-lg text-[10px]" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setDeleteTarget(null); }}>取消</Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:text-destructive" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setDeleteTarget(post.slug); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )
                  )}
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      {/* Timeline View */}
      {viewMode === "timeline" && (
        <div className="relative max-w-3xl mx-auto">
          {/* Center line */}
          <div
            className="absolute left-8 sm:left-1/2 top-0 bottom-0 w-0.5"
            style={{ background: "linear-gradient(to bottom, var(--primary), oklch(0.65 0.15 180), var(--primary))" }}
          />
          <div className="space-y-0">
            {filtered.map((post, i) => {
              const isEven = i % 2 === 0;
              const postYear = post.date.slice(0, 4);
              const postMonthDay = post.date.slice(5);
              const prevYear = i > 0 ? filtered[i - 1].date.slice(0, 4) : null;
              const showYear = prevYear !== postYear;

              return (
                <motion.div
                  key={post.slug}
                  animate={{ opacity: 1, y: 0 }}
                  initial={animEnabled ? { opacity: 0, y: 30 } : { opacity: 1, y: 0 }}
                  whileInView={animEnabled ? { opacity: 1, y: 0 } : undefined}
                  viewport={animEnabled ? { once: false, margin: "-120px" } : undefined}
                  transition={animEnabled ? { duration: 0.35, delay: Math.min(i * 0.04, 0.3) } : { duration: 0 }}
                  className={`relative flex items-start gap-4 sm:gap-8 py-6 ${isEven ? "sm:flex-row" : "sm:flex-row-reverse"}`}
                >
                  {/* Dot on the line */}
                  <div className="absolute left-8 sm:left-1/2 top-7 -translate-x-1/2 z-10">
                    <motion.div
                      animate={{ scale: 1 }}
                      initial={animEnabled ? { scale: 0 } : { scale: 1 }}
                      whileInView={animEnabled ? { scale: 1 } : undefined}
                      viewport={animEnabled ? { once: false, margin: "-120px" } : undefined}
                      transition={animEnabled ? { duration: 0.3, delay: Math.min(i * 0.04 + 0.05, 0.3), type: "spring" } : { duration: 0 }}
                      className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 shadow-lg shadow-purple-500/30"
                    />
                  </div>

                  {/* Date label on spacer side */}
                  <div className={`flex flex-1 items-start pt-1`}>
                    <div className={`flex-1 flex ${isEven ? "justify-end pr-1" : "justify-start pl-1"}`}>
                      <div className={`${isEven ? "text-right" : "text-left"} max-sm:absolute max-sm:left-14 max-sm:top-0 max-sm:text-left`}>
                        {showYear && (
                          <motion.div
                            animate={{ opacity: 1, x: 0 }}
                            initial={animEnabled ? { opacity: 0, x: isEven ? 10 : -10 } : { opacity: 1, x: 0 }}
                            whileInView={animEnabled ? { opacity: 1, x: 0 } : undefined}
                            viewport={animEnabled ? { once: false, margin: "-120px" } : undefined}
                            transition={animEnabled ? { duration: 0.3 } : { duration: 0 }}
                            className="text-3xl sm:text-4xl font-black text-primary/30 mb-1 tracking-tight"
                          >
                            {postYear}
                          </motion.div>
                        )}
                        <div className="text-2xl sm:text-3xl font-bold text-muted-foreground/50 font-mono tracking-wide max-sm:text-lg max-sm:font-semibold">
                          {postMonthDay}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content card */}
                  <div className="flex-1 sm:flex-1 ml-16 sm:ml-0 relative group/tlcard">
                    <Link href={`/blog/${post.slug}`}>
                      <motion.div
                        whileHover={animEnabled ? { scale: 1.02, y: -2 } : undefined}
                        transition={animEnabled ? { duration: 0.2 } : { duration: 0 }}
                      >
                        <GlassCard className="p-4">
                          {post.coverImage && (
                            <div className="w-full h-28 rounded-lg overflow-hidden mb-3">
                              <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover"
                                style={{ objectPosition: `50% ${post.coverPosition ?? 50}%` }} />
                            </div>
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-mono text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                              {post.date}
                            </span>
                            <span className="text-xs text-muted-foreground">{post.readTime}</span>
                          </div>
                          <h3 className="font-semibold mb-2 leading-snug">{post.title}</h3>
                          {post.draft && (
                            <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full font-medium mb-2 inline-block">草稿</span>
                          )}
                          <div className="flex flex-wrap gap-1.5">
                            {post.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                            ))}
                          </div>
                        </GlassCard>
                      </motion.div>
                    </Link>
                    {isAdmin && (
                      <div className="absolute bottom-2 right-2 flex gap-1 md:opacity-0 md:group-hover/tlcard:opacity-100 md:transition-opacity z-10">
                        <Link href={`/blog/new?edit=${post.slug}`} onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background/80">
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </Link>
                        {isCustomForDelete(post.slug) && (
                          deleteTarget === post.slug ? (
                            <div className="flex gap-1">
                              <Button variant="destructive" size="sm" className="h-7 rounded-lg text-[10px]" onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDelete(post.slug); }}>确认</Button>
                              <Button variant="outline" size="sm" className="h-7 rounded-lg text-[10px]" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setDeleteTarget(null); }}>取消</Button>
                            </div>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background/80 hover:text-destructive" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setDeleteTarget(post.slug); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>{showDrafts ? "没有草稿" : "没有找到匹配的文章"}</p>
          {showDrafts && (
            <button onClick={() => setShowDrafts(false)} className="text-xs text-primary hover:underline mt-2">
              返回全部文章
            </button>
          )}
        </div>
      )}

      {/* 标签管理弹窗 */}
      <Dialog open={tagManageOpen} onOpenChange={setTagManageOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>🏷️ 标签管理</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            {/* 新建标签 */}
            {isAdmin && (
              <div className="flex gap-2">
                <Input placeholder="新建标签..." value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addCustomTag(); }}
                  className="rounded-lg text-sm h-8" />
                <Button size="sm" className="rounded-lg h-8 shrink-0" onClick={addCustomTag}>添加</Button>
              </div>
            )}

            {/* 标签列表 */}
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {/* 不可删除的 */}
              <p className="text-[11px] text-muted-foreground font-medium">📍 地点标签</p>
              {[...protectedTags].sort().map(tag => (
                <div key={tag} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/30 group">
                  <span className="flex-1 text-xs truncate">{tag}</span>
                  <button onClick={() => { setTagFilter(prev => prev.includes(tag) ? prev : [...prev, tag]); setTagManageOpen(false); }}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-all" title="筛选此标签">
                    <Filter className="h-3 w-3" />
                  </button>
                  <span className="text-[10px] text-muted-foreground">地点</span>
                </div>
              ))}
              {/* 可删除的自定义标签 */}
              {customTags.filter(t => !protectedTags.has(t)).length > 0 && (
                <>
                  <p className="text-[11px] text-muted-foreground font-medium mt-3">✏️ 自定义标签</p>
                  {customTags.filter(t => !protectedTags.has(t)).map(tag => (
                    <div key={tag} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent group">
                      <span className="flex-1 text-xs truncate">{tag}</span>
                      <button onClick={() => { setTagFilter(prev => prev.includes(tag) ? prev : [...prev, tag]); setTagManageOpen(false); }}
                        className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-all" title="筛选此标签">
                        <Filter className="h-3 w-3" />
                      </button>
                      {isAdmin && tagDeleteConfirm === tag ? (
                        <div className="flex gap-0.5">
                          <button onClick={() => { removeCustomTag(tag); setTagDeleteConfirm(null); }}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-destructive text-destructive-foreground">确认</button>
                          <button onClick={() => setTagDeleteConfirm(null)}
                            className="px-1.5 py-0.5 rounded text-[10px] border">取消</button>
                        </div>
                      ) : isAdmin ? (
                        <button onClick={() => setTagDeleteConfirm(tag)}
                          className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BlogPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">加载中...</div>}>
      <BlogPageInner />
    </Suspense>
  );
}
