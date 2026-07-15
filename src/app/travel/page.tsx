"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Calendar, ChevronRight, BookOpen, ChevronDown, Image, Settings, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { GradientText } from "@/components/shared/GradientText";
import { GlassCard } from "@/components/shared/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { blogPosts, type BlogPost } from "@/data/blog-posts";
import { getAllPosts, loadCustomPosts, saveCustomPost } from "@/lib/blog-store";
import { type TravelMarker } from "@/data/travel-markers";
import { getAllMarkers, saveAllMarkers } from "@/lib/travel-store";
import { loadPhotos } from "@/data/photos";

const EMOJIS = ["🏙️","🌆","🏞️","🏡","🌶️","⛰️","🏛️","🦘","🌊","🌃","🐼","🏭","🌴","🏮","🏯","🏝️","🏰","🎡","🗼","🏖️","🌋","🗿","🏕️","🎪","🕌","⛩️","🏗️","🛤️"];

export default function TravelPage() {
  const { isAdmin } = useAuth();
  const [selectedMarker, setSelectedMarker] = useState<TravelMarker | null>(null);
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [markers, setMarkers] = useState<TravelMarker[]>([]);
  const [manageOpen, setManageOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<TravelMarker>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const photos = loadPhotos();

  useEffect(() => { setAllPosts(getAllPosts(blogPosts)); }, []);
  useEffect(() => {
    setMarkers(getAllMarkers());
  }, []);

  function getPhotoCount(title: string): number {
    return photos.filter((p) => p.location === title).length;
  }
  function getLinkedPosts(title: string): BlogPost[] {
    return allPosts.filter((post) => post.tags.includes(title));
  }

  // 新建地点
  function startAdd() {
    setEditId(-1);
    const today = new Date().toISOString().slice(0, 10);
    setEditForm({ title: "", date: today, endDate: "", photo: "📍", lat: 30, lng: 110 });
  }

  // 编辑地点
  function startEdit(m: TravelMarker) {
    setEditId(m.id);
    setEditForm({ ...m });
  }

  // 保存
  function saveMarker() {
    if (!editForm.title?.trim() || !editForm.date?.trim()) return;
    if (editId === -1) {
      const newMarker: TravelMarker = {
        id: Date.now(),
        title: editForm.title.trim(),
        date: editForm.date.trim(),
        endDate: editForm.endDate?.trim() || undefined,
        photo: editForm.photo || "📍",
        lat: editForm.lat || 30,
        lng: editForm.lng || 110,
      };
      // 按日期从新到旧插入
      const insertIdx = markers.findIndex(m => m.date < newMarker.date);
      const updated = insertIdx === -1
        ? [...markers, newMarker]
        : [...markers.slice(0, insertIdx), newMarker, ...markers.slice(insertIdx)];
      saveAllMarkers(updated);
      setMarkers(updated);
    } else {
      const updated = markers.map(m => m.id === editId ? { ...m, ...editForm } as TravelMarker : m);
      saveAllMarkers(updated);
      setMarkers(updated);
    }
    setEditId(null);
  }

  // 删除地点 + 清理博客标签
  function deleteMarker(marker: TravelMarker) {
    const updated = markers.filter(m => m.id !== marker.id);
    saveAllMarkers(updated);
    setMarkers(updated);
    setDeleteConfirm(null);
    if (selectedMarker?.id === marker.id) setSelectedMarker(null);

    // 清理博客标签池
    try {
      const customTags: string[] = JSON.parse(localStorage.getItem("blog_custom_tags") || "[]");
      localStorage.setItem("blog_custom_tags", JSON.stringify(customTags.filter(t => t !== marker.title)));
    } catch { /* ignore */ }

    // 更新所有自定义文章的 tags（移除该地点标签），但不要复制静态文章
    allPosts.forEach((post) => {
      // 跳过静态文章（不在自定义列表中），避免 saveCustomPost 复制静态文导致重复
      if (!loadCustomPosts().some(p => p.slug === post.slug)) return;
      if (post.tags.includes(marker.title)) {
        saveCustomPost({ ...post, tags: post.tags.filter(t => t !== marker.title) }).catch(() => {});
      }
    });
  }

  // 排序：家和现居在最上面，然后按日期从新到旧；有 groupId 的不在时间轴显示
  const allMarkers = [...markers].sort((a, b) => {
    const aSpecial = a.type === "home" || a.type === "residence" ? 1 : 0;
    const bSpecial = b.type === "home" || b.type === "residence" ? 1 : 0;
    if (aSpecial !== bSpecial) return bSpecial - aSpecial;
    if (aSpecial) return a.type === "home" ? -1 : 1; // home before residence
    return b.date.localeCompare(a.date); // 日期从新到旧
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-20">
      <AnimatedSection className="text-center mb-12">
        <GradientText as="h1" className="text-4xl sm:text-5xl font-bold mb-4">旅行足迹</GradientText>
        <p className="text-muted-foreground max-w-xl mx-auto">
          走过的路，看过的风景，按下的快门
          <span className="ml-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 text-sm">
            <span className="bg-gradient-to-r from-purple-500 to-cyan-400 bg-clip-text text-transparent font-bold text-base">✦</span>
            <span className="font-medium">{allMarkers.filter(m => !m.groupId).length}</span>
            <span className="text-muted-foreground">处足迹</span>
          </span>
        </p>
      </AnimatedSection>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Interactive Map */}
        <AnimatedSection className="lg:col-span-2" delay={0.1}>
          <GlassCard className="p-0 overflow-hidden h-[400px] lg:h-[600px] relative rounded-2xl z-0">
            <TravelMap
              markers={allMarkers}
              selectedId={selectedMarker?.id || null}
              onSelect={(m) => {
                // 如果有 groupId，找到主标记
                const target = m.groupId ? allMarkers.find(x => x.id === m.groupId) || m : m;
                setSelectedMarker(target);
              }}
            />
          </GlassCard>
        </AnimatedSection>

        {/* Timeline */}
        <AnimatedSection delay={0.2} className="lg:col-span-1 overflow-visible">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" /> 旅行时间轴
            </h3>
            {isAdmin && (
              <Button variant="ghost" size="sm" className="rounded-lg gap-1 h-7 text-xs" onClick={() => setManageOpen(true)}>
                <Settings className="h-3.5 w-3.5" /> 管理
              </Button>
            )}
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2" style={{ overflowX: "visible" }}>
            {allMarkers.filter(m => !m.groupId).map((m, i) => {
              const photoCount = getPhotoCount(m.title);
              const linkedPosts = getLinkedPosts(m.title);
              return (
              <motion.div key={m.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                <GlassCard className={`cursor-pointer transition-all ${selectedMarker?.id === m.id ? "ring-2 ring-primary" : ""}`}
                  style={{ overflow: "visible" }} onClick={() => setSelectedMarker(m)} hover={false}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{m.photo}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold flex items-center gap-1">{m.title}<ChevronRight className="h-3 w-3 text-muted-foreground" /></h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="secondary" className="text-xs">{m.date}{m.endDate ? ` ~ ${m.endDate}` : ""}</Badge>
                        {linkedPosts.length > 0 && <BlogButton posts={linkedPosts} locationTitle={m.title} />}
                        {photoCount > 0 && (
                          <Link href={`/gallery?location=${encodeURIComponent(m.title)}`}
                            className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline"
                            onClick={(e) => e.stopPropagation()}>
                            <Image className="h-3 w-3" /> 照片 ({photoCount})
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )})}
          </div>
        </AnimatedSection>
      </div>

      {selectedMarker && (
        <AnimatedSection className="mt-8">
          <GlassCard>
            <div className="flex items-start gap-4">
              <span className="text-5xl">{selectedMarker.photo}</span>
              <div>
                <h3 className="text-2xl font-bold mb-1">{selectedMarker.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {selectedMarker.date}{selectedMarker.endDate ? ` ~ ${selectedMarker.endDate}` : ""}
                </p>
              </div>
            </div>
          </GlassCard>
        </AnimatedSection>
      )}

      {/* 管理弹窗 */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📍 旅行地点管理</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {isAdmin && <Button size="sm" className="w-full rounded-lg gap-1" onClick={startAdd}><Plus className="h-3.5 w-3.5" /> 添加旅行地点</Button>}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {allMarkers.map((m) => (
                <div key={m.id} className={`p-2 rounded-lg border $"border-border"`}>
                  {editId === m.id ? (
                    <EditForm form={editForm} setForm={setEditForm} onSave={saveMarker} onCancel={() => setEditId(null)} />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{m.photo}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium truncate block">{m.title}</span>
                        <span className="text-[10px] text-muted-foreground">{m.date}{m.endDate ? ` ~ ${m.endDate}` : ""}</span>
                      </div>
                      <button onClick={() => startEdit(m)} className="p-1 rounded hover:bg-accent"><Pencil className="h-3 w-3" /></button>
                      {isAdmin && (
                        deleteConfirm === m.id ? (
                          <div className="flex gap-0.5">
                            <button onClick={() => deleteMarker(m)} className="px-1.5 py-0.5 rounded text-[10px] bg-destructive text-destructive-foreground">确认</button>
                            <button onClick={() => setDeleteConfirm(null)} className="px-1.5 py-0.5 rounded text-[10px] border">取消</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(m.id)} className="p-1 rounded hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* 新建表单 */}
            {editId === -1 && (
              <div className="p-3 rounded-lg border-2 border-dashed border-primary">
                <EditForm form={editForm} setForm={setEditForm} onSave={saveMarker} onCancel={() => setEditId(null)} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const TravelMap = dynamic(() => import("./TravelMap"), { ssr: false });

function EditForm({ form, setForm, onSave, onCancel }: {
  form: Partial<TravelMarker>;
  setForm: (f: Partial<TravelMarker>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const TRAVEL_EMOJI = ["🏙️","🌆","🏞️","🏡","🌶️","⛰️","🏛️","🦘","🌊","🌃","🐼","🏭","🌴","🏮","🏯","🏝️","🏰","🎡","🗼","🏖️","🌋","🗿","🏕️","🎪","🕌","⛩️","📍","✈️","🚢","🚗","🏔️","🌉","🏜️","🌅","🎆"];

  return (
    <div className="space-y-2">
      <Input placeholder="地点名称" value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })}
        className="h-8 text-xs rounded-lg" autoFocus />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">起始日期 *</label>
          <Input type="date" value={form.date || ""} onChange={e => setForm({ ...form, date: e.target.value })}
            className="h-8 text-xs rounded-lg" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">结束日期</label>
          <Input type="date" value={form.endDate || ""} onChange={e => setForm({ ...form, endDate: e.target.value })}
            className="h-8 text-xs rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <button onClick={() => setShowEmoji(!showEmoji)}
            className="w-full h-8 text-xs rounded-lg border border-input bg-background px-3 text-left">
            {form.photo || "📍 emoji"}
          </button>
          {showEmoji && (
            <div className="absolute top-full left-0 mt-1 z-50 p-2 rounded-lg border border-border bg-popover shadow-xl grid grid-cols-7 gap-0.5 max-h-32 overflow-y-auto">
              {TRAVEL_EMOJI.map(e => (
                <button key={e} onClick={() => { setForm({ ...form, photo: e }); setShowEmoji(false); }}
                  className="text-lg p-1 rounded hover:bg-accent">{e}</button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 rounded-lg text-xs" onClick={onSave}><Check className="h-3.5 w-3.5 mr-1" /> 保存</Button>
        <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={onCancel}><X className="h-3.5 w-3.5 mr-1" /> 取消</Button>
      </div>
    </div>
  );
}

function BlogButton({ posts, locationTitle }: { posts: BlogPost[]; locationTitle: string }) {
  const [open, setOpen] = useState(false);
  if (posts.length === 0) return null;
  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline">
        <BookOpen className="h-3 w-3" /> Blog ({posts.length})
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-1 z-50 bg-popover border border-border rounded-lg shadow-lg p-2 min-w-[200px] max-w-[280px] max-h-48 overflow-y-auto whitespace-normal">
          <Link href={`/blog?tag=${encodeURIComponent(locationTitle)}`}
            className="block px-3 py-2 rounded-md text-sm font-medium text-primary hover:bg-primary/10 transition-colors border-b border-border mb-1 pb-2 text-center">
            📖 跳转到博客（{posts.length} 篇）
          </Link>
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors">{post.title}</Link>
          ))}
        </div>
      )}
    </div>
  );
}
