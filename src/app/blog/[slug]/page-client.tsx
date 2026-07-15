"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Tag, Share2, Heart, Reply, Trash2, User, Send } from "lucide-react";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { GlassCard } from "@/components/shared/GlassCard";
import { GradientText } from "@/components/shared/GradientText";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { blogPosts, type BlogPost } from "@/data/blog-posts";
import { getPostBySlug } from "@/lib/blog-store";
import { useAuth } from "@/lib/auth-context";
import {
  loadComments,
  saveComments,
  updateReplyDeep,
  addReplyDeep,
  mergeCommentsFromServer,
  type BlogComment,
  type BlogReply,
} from "@/lib/blog-comments";

export const dynamic = "force-dynamic";

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  // null = 加载中, undefined = 未找到, BlogPost = 找到了
  const [post, setPost] = useState<BlogPost | null | undefined>(undefined);
  const { isAdmin } = useAuth();

  // 评论区
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [form, setForm] = useState({ name: "", content: "" });
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [likedIds, setLikedIds] = useState<number[]>([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("blog_comment_liked") || "[]") as number[];
    setLikedIds(saved);
  }, []);

  const isLiked = (id: number) => likedIds.includes(id);

  const toggleLike = (id: number) => {
    if (isLiked(id)) {
      setLikedIds((prev) => { const next = prev.filter((lid) => lid !== id); localStorage.setItem("blog_comment_liked", JSON.stringify(next)); return next; });
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, likes: c.likes - 1 } : c)));
    } else {
      setLikedIds((prev) => { const next = [...prev, id]; localStorage.setItem("blog_comment_liked", JSON.stringify(next)); return next; });
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, likes: c.likes + 1 } : c)));
    }
  };

  useEffect(() => {
    let found: BlogPost | null = getPostBySlug(slug);
    if (!found) {
      found = blogPosts.find((p) => p.slug === slug) || null;
    }
    setPost(found ?? undefined);
    // 加载评论
    setComments(loadComments(slug));
    setCommentsLoaded(true);
  }, [slug]);

  // 评论变化时自动保存
  useEffect(() => {
    if (commentsLoaded) {
      saveComments(slug, comments);
    }
  }, [comments, commentsLoaded, slug]);

  // 评论操作
  function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.content.trim()) return;
    const newComment: BlogComment = {
      id: Date.now(),
      name: form.name,
      content: form.content,
      date: new Date().toISOString().split("T")[0],
      likes: 0,
      replies: [],
      showReplyForm: false,
    };
    setComments([newComment, ...comments]);
    setForm({ name: "", content: "" });
  }

  const toggleReplyForm = (id: number, isTopLevel: boolean) => {
    if (isTopLevel) {
      setComments(comments.map((c) => (c.id === id ? { ...c, showReplyForm: !c.showReplyForm } : c)));
    } else {
      setComments(comments.map((c) => ({
        ...c,
        replies: updateReplyDeep(c.replies, id, (r) => ({ ...r, showReplyForm: !r.showReplyForm })),
      })));
    }
  };

  const addReply = (parentId: number, parentReplyId: number | null, replyName: string, replyContent: string) => {
    if (!replyName.trim() || !replyContent.trim()) return;
    const reply: BlogReply = {
      id: Date.now(),
      name: replyName,
      content: replyContent,
      date: new Date().toISOString().split("T")[0],
      replies: [],
      showReplyForm: false,
    };
    if (parentReplyId === null) {
      setComments(comments.map((c) =>
        c.id === parentId ? { ...c, replies: [...c.replies, reply], showReplyForm: false } : c
      ));
    } else {
      setComments(comments.map((c) => {
        if (c.id !== parentId) return c;
        return { ...c, replies: addReplyDeep(c.replies, parentReplyId, reply) };
      }));
    }
  };

  function handleDeleteComment(id: number) {
    const removeDeep = (replies: BlogReply[]): BlogReply[] =>
      replies.filter((r) => r.id !== id).map((r) => ({ ...r, replies: removeDeep(r.replies) }));
    setComments(comments.filter((c) => c.id !== id).map((c) => ({ ...c, replies: removeDeep(c.replies) })));
    setDeleteTarget(null);
  }

  if (post === undefined) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-40 text-center">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-40 text-center">
        <h1 className="text-4xl font-bold mb-4">文章未找到</h1>
        <Link href="/blog">
          <Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" /> 返回博客</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-20">
      <AnimatedSection>
        {/* Back button */}
        <Link href="/blog" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> 返回博客
        </Link>

        {/* Cover Image */}
        {post.coverImage && (
          <div className="rounded-2xl overflow-hidden mb-8 -mx-0">
            <img src={post.coverImage} alt={post.title} className="w-full max-h-80 object-cover"
              style={{ objectPosition: `50% ${post.coverPosition ?? 50}%` }} />
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
          <GradientText as="h1" className="text-3xl sm:text-4xl font-bold mb-4">{post.title}</GradientText>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {post.date}</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {post.readTime}</span>
          </div>
        </div>
        {post.summary && (
          <p className="text-muted-foreground text-lg leading-relaxed border-l-3 border-primary/30 pl-4 -mt-2 mb-6">{post.summary}</p>
        )}
      </AnimatedSection>

      {/* Content */}
      <AnimatedSection delay={0.2}>
        <GlassCard className="prose prose-gray dark:prose-invert max-w-none">
          <div className="leading-relaxed">
            {post.content.startsWith("<") ? (
              // HTML 内容（所见即所得编辑器产出）
              <div
                dangerouslySetInnerHTML={{ __html: post.content }}
                className="[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4
                  [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3
                  [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2
                  [&_p]:mb-4 [&_p]:leading-relaxed
                  [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_li]:mb-1
                  [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1
                  [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:my-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:bg-muted/30 [&_blockquote]:rounded-r-lg
                  [&_img]:rounded-xl [&_img]:my-4 [&_img]:max-w-full
                  [&_strong]:font-semibold"
              />
            ) : (
              // Markdown 内容（旧文章兼容）
              <div
                dangerouslySetInnerHTML={{
                  __html: post.content
                    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold mt-8 mb-3">$1</h3>')
                    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold mt-10 mb-4">$1</h2>')
                    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-primary pl-4 py-2 my-4 italic text-muted-foreground">$1</blockquote>')
                    .replace(/^- (.+)$/gm, '<li class="ml-4 mb-2 list-disc">$1</li>')
                    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 mb-2 list-decimal">$2</li>')
                    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                    .replace(/\n\n/g, '</p><p class="mb-4">')
                    .replace(/^(.+)$/gm, (match: string) => {
                      if (match.startsWith('<')) return match;
                      return `<p class="mb-4">${match}</p>`;
                    }),
                }}
              />
            )}
          </div>
        </GlassCard>
      </AnimatedSection>

      {/* Share button */}
      <AnimatedSection delay={0.4} className="mt-12">
        <div className="flex items-center justify-between">
          <Button variant="outline" className="gap-2 rounded-full">
            <Share2 className="h-4 w-4" /> 分享文章
          </Button>
        </div>

        <Separator className="my-8" />

        {/* Comments Section */}
        {post.commentsEnabled !== false && (
          <CommentSection
            slug={slug}
            isAdmin={isAdmin}
          />
        )}
      </AnimatedSection>
    </div>
  );
}

function CommentSection({ slug, isAdmin }: { slug: string; isAdmin: boolean }) {
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ name: "", content: "" });
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [likedIds, setLikedIds] = useState<number[]>([]);

  useEffect(() => {
    setComments(loadComments(slug));
    const saved = JSON.parse(localStorage.getItem("blog_comment_liked") || "[]") as number[];
    setLikedIds(saved);
    // 从服务端拉取最新评论（双向合并）
    mergeCommentsFromServer(slug).then(merged => {
      setComments(merged);
      setLoaded(true);
    });
  }, [slug]);

  useEffect(() => {
    if (loaded) saveComments(slug, comments);
  }, [comments, loaded, slug]);

  const isLiked = (id: number) => likedIds.includes(id);

  const toggleLike = (id: number) => {
    if (isLiked(id)) {
      setLikedIds((prev) => { const next = prev.filter((lid) => lid !== id); localStorage.setItem("blog_comment_liked", JSON.stringify(next)); return next; });
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, likes: c.likes - 1 } : c)));
    } else {
      setLikedIds((prev) => { const next = [...prev, id]; localStorage.setItem("blog_comment_liked", JSON.stringify(next)); return next; });
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, likes: c.likes + 1 } : c)));
    }
  };

  function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.content.trim()) return;
    const newComment: BlogComment = {
      id: Date.now(), name: form.name, content: form.content,
      date: new Date().toISOString().split("T")[0], likes: 0, replies: [], showReplyForm: false,
    };
    setComments([newComment, ...comments]);
    setForm({ name: "", content: "" });
  }

  const toggleReplyForm = (id: number, isTopLevel: boolean) => {
    if (isTopLevel) {
      setComments(comments.map((c) => (c.id === id ? { ...c, showReplyForm: !c.showReplyForm } : c)));
    } else {
      setComments(comments.map((c) => ({
        ...c, replies: updateReplyDeep(c.replies, id, (r) => ({ ...r, showReplyForm: !r.showReplyForm })),
      })));
    }
  };

  const addReply = (parentId: number, parentReplyId: number | null, replyName: string, replyContent: string) => {
    if (!replyName.trim() || !replyContent.trim()) return;
    const reply: BlogReply = {
      id: Date.now(), name: replyName, content: replyContent,
      date: new Date().toISOString().split("T")[0], replies: [], showReplyForm: false,
    };
    if (parentReplyId === null) {
      setComments(comments.map((c) =>
        c.id === parentId ? { ...c, replies: [...c.replies, reply], showReplyForm: false } : c
      ));
    } else {
      setComments(comments.map((c) => {
        if (c.id !== parentId) return c;
        return { ...c, replies: addReplyDeep(c.replies, parentReplyId, reply) };
      }));
    }
  };

  function handleDeleteComment(id: number) {
    const removeDeep = (replies: BlogReply[]): BlogReply[] =>
      replies.filter((r) => r.id !== id).map((r) => ({ ...r, replies: removeDeep(r.replies) }));
    setComments(comments.filter((c) => c.id !== id).map((c) => ({ ...c, replies: removeDeep(c.replies) })));
    setDeleteTarget(null);
  }

  return (
    <GlassCard className="p-6">
      <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">💬 评论 ({comments.length})</h3>
      <form onSubmit={handleAddComment} className="space-y-3 mb-8">
        <Input placeholder="你的昵称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          required className="rounded-xl" maxLength={30} />
        <Textarea placeholder="写下你的评论..." value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
          required className="rounded-xl min-h-[80px]" maxLength={500} />
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{form.content.length}/500</span>
          <Button type="submit" className="rounded-xl gap-2 bg-gradient-to-r from-purple-600 to-cyan-500 text-white">
            <Send className="h-4 w-4" /> 发布评论
          </Button>
        </div>
      </form>
      <div className="space-y-4">
        {comments.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">还没有评论，来写第一条吧</p>}
        {comments.map((comment) => (
          <div key={comment.id} className="border border-border rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{comment.name}</span>
                  <span className="text-xs text-muted-foreground">{comment.date}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{comment.content}</p>
                <div className="flex items-center gap-3 mt-2">
                  <button onClick={() => toggleLike(comment.id)}
                    className={`flex items-center gap-1 text-xs transition-colors ${isLiked(comment.id) ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}>
                    <Heart className={`h-3 w-3 ${isLiked(comment.id) ? "fill-red-500" : ""}`} /> {comment.likes}
                  </button>
                  <button onClick={() => toggleReplyForm(comment.id, true)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                    <Reply className="h-3 w-3" /> 回复{comment.replies.length > 0 && ` (${comment.replies.length})`}
                  </button>
                  {isAdmin && deleteTarget === comment.id ? (
                    <div className="flex items-center gap-1 ml-auto">
                      <button onClick={() => handleDeleteComment(comment.id)} className="text-[10px] text-destructive hover:underline">确认</button>
                      <button onClick={() => setDeleteTarget(null)} className="text-[10px] text-muted-foreground hover:underline">取消</button>
                    </div>
                  ) : isAdmin ? (
                    <button onClick={() => setDeleteTarget(comment.id)} className="ml-auto text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
                <BlogReplyList
                  replies={comment.replies} parentMsgId={comment.id}
                  onToggleReply={(rid) => toggleReplyForm(rid, false)}
                  onAddReply={(pid, n, c) => addReply(comment.id, pid, n, c)}
                  deleteTarget={deleteTarget} setDeleteTarget={setDeleteTarget} onDeleteConfirm={handleDeleteComment}
                />
                {comment.showReplyForm && (
                  <div className="mt-3">
                    <BlogReplyForm onSubmit={(n, c) => addReply(comment.id, null, n, c)} parentName={comment.name} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function BlogReplyList({ replies, parentMsgId, onToggleReply, onAddReply, deleteTarget, setDeleteTarget, onDeleteConfirm }: {
  replies: BlogReply[]; parentMsgId: number; onToggleReply: (id: number) => void;
  onAddReply: (parentReplyId: number, name: string, content: string) => void;
  deleteTarget: number | null; setDeleteTarget: (id: number | null) => void; onDeleteConfirm: (id: number) => void;
}) {
  const { isAdmin } = useAuth();
  if (replies.length === 0) return null;
  return (
    <div className="mt-2 space-y-2">
      {replies.map((reply) => (
        <div key={reply.id} className="ml-4 pl-3 border-l-2 border-border">
          <div className="text-sm">
            <span className="font-medium text-primary">{reply.name}</span>
            <span className="text-muted-foreground mx-1">→</span>
            <span className="font-medium">...</span>
            <span className="text-muted-foreground">：{reply.content}</span>
            <span className="text-xs text-muted-foreground ml-2">{reply.date}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 ml-1">
            <button onClick={() => onToggleReply(reply.id)} className="text-xs text-muted-foreground hover:text-primary">
              <Reply className="h-3 w-3 inline mr-0.5" /> 回复
            </button>
            {isAdmin && deleteTarget === reply.id ? (
              <div className="flex items-center gap-1">
                <button onClick={() => onDeleteConfirm(reply.id)} className="text-[10px] text-destructive hover:underline">确认</button>
                <button onClick={() => setDeleteTarget(null)} className="text-[10px] text-muted-foreground hover:underline">取消</button>
              </div>
            ) : isAdmin ? (
              <button onClick={() => setDeleteTarget(reply.id)} className="text-xs text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </button>
            ) : null}
          </div>
          <BlogReplyList
            replies={reply.replies} parentMsgId={parentMsgId}
            onToggleReply={onToggleReply} onAddReply={onAddReply}
            deleteTarget={deleteTarget} setDeleteTarget={setDeleteTarget} onDeleteConfirm={onDeleteConfirm}
          />
          {reply.showReplyForm && (
            <div className="mt-2">
              <BlogReplyForm onSubmit={(n, c) => onAddReply(reply.id, n, c)} parentName={reply.name} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BlogReplyForm({ onSubmit, parentName }: { onSubmit: (name: string, content: string) => void; parentName: string }) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!name.trim() || !content.trim()) return; onSubmit(name, content); setName(""); setContent(""); };
  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-start">
      <Input placeholder="昵称" value={name} onChange={(e) => setName(e.target.value)} required className="rounded-xl w-24 text-sm h-8" maxLength={20} />
      <Input placeholder={`回复 ${parentName}...`} value={content} onChange={(e) => setContent(e.target.value)} required className="rounded-xl flex-1 text-sm h-8" maxLength={200} />
      <Button type="submit" size="sm" className="rounded-xl h-8 shrink-0"><Send className="h-3 w-3" /></Button>
    </form>
  );
}
