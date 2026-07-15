"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, User, Clock, Heart, Reply, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { GradientText } from "@/components/shared/GradientText";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ReplyMsg {
  id: number;
  name: string;
  content: string;
  date: string;
  replies: ReplyMsg[];
  showReplyForm: boolean;
}

interface Message {
  id: number;
  name: string;
  content: string;
  date: string;
  likes: number;
  replies: ReplyMsg[];
  showReplyForm: boolean;
}

const GUESTBOOK_KEY = "guestbook_messages";

// 加载留言（去掉 UI 状态字段）
function loadMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUESTBOOK_KEY);
    if (!raw) return [];
    const saved = JSON.parse(raw) as Message[];
    // 给每条加回 UI 状态
    const hydrate = (msgs: (Message | ReplyMsg)[]): (Message | ReplyMsg)[] =>
      msgs.map((m) => ({ ...m, showReplyForm: false, replies: hydrate(m.replies) as ReplyMsg[] }));
    return hydrate(saved) as Message[];
  } catch {
    return [];
  }
}

// 保存留言（去掉 UI 状态字段，同步到服务端）
function saveMessages(msgs: Message[]) {
  if (typeof window === "undefined") return;
  const strip = (ms: (Message | ReplyMsg)[]): any[] =>
    ms.map(({ showReplyForm, ...m }) => ({ ...m, replies: strip(m.replies) }));
  const data = strip(msgs);
  try {
    localStorage.setItem(GUESTBOOK_KEY, JSON.stringify(data));
    // 同步到服务端
    fetch("/api/data/guestbook_messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    }).catch(() => {});
  } catch { /* quota exceeded */ }
}

// Helper: find a reply by id deep in the tree, update it
function updateReplyDeep(replies: ReplyMsg[], id: number, updater: (r: ReplyMsg) => ReplyMsg): ReplyMsg[] {
  return replies.map((r) => {
    if (r.id === id) return updater(r);
    if (r.replies.length > 0) return { ...r, replies: updateReplyDeep(r.replies, id, updater) };
    return r;
  });
}

function addReplyDeep(replies: ReplyMsg[], parentId: number, newReply: ReplyMsg): ReplyMsg[] {
  return replies.map((r) => {
    if (r.id === parentId) return { ...r, replies: [...r.replies, newReply], showReplyForm: false };
    if (r.replies.length > 0) return { ...r, replies: addReplyDeep(r.replies, parentId, newReply) };
    return r;
  });
}

function getLikedIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("guestbook_liked") || "[]");
  } catch { return []; }
}

function setLikedIds(ids: number[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("guestbook_liked", JSON.stringify(ids));
}

export default function GuestbookPage() {
  const { isAdmin } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [form, setForm] = useState({ name: "", content: "" });
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  // 首次加载：从服务端同步留言（覆盖本地）
  useEffect(() => {
    const sync = async () => {
      try {
        const res = await fetch("/api/data/guestbook_messages");
        const json = await res.json();
        if (json.exists && Array.isArray(json.data)) {
          localStorage.setItem(GUESTBOOK_KEY, JSON.stringify(json.data));
          const hydrate = (msgs: any[]): Message[] =>
            msgs.map((m) => ({ ...m, showReplyForm: false, replies: hydrate(m.replies || []) }));
          setMessages(hydrate(json.data));
        } else if (localStorage.getItem(GUESTBOOK_KEY)) {
          setMessages(loadMessages());
        }
      } catch {
        if (localStorage.getItem(GUESTBOOK_KEY)) setMessages(loadMessages());
      }
      setLoaded(true);
    };
    sync();
  }, []);

  // 留言变化时自动保存（跳过首次加载）
  useEffect(() => {
    if (loaded) {
      saveMessages(messages);
    }
  }, [messages, loaded]);

useEffect(() => {
  // 从服务端读取访客计数
  const syncVisitorCount = async () => {
    try {
      const res = await fetch("/api/data/guestbook_visitor_count");
      const json = await res.json();
      if (json.exists && typeof json.data === "number") {
        setVisitorCount(json.data);
      }
    } catch {}
  };
  syncVisitorCount();

  // 本地标记 + 异步上报 +1
  const thisVisit = localStorage.getItem("guestbook_visited");
  if (!thisVisit) {
    localStorage.setItem("guestbook_visited", "1");
    // 异步上报计数 +1
    fetch("/api/data/guestbook_visitor_count", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: 1 }),
    }).catch(() => {});
  }
}, []);
  const [likedIds, setLikedIdsState] = useState<number[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  function handleDelete(id: number) {
    // 删除顶层消息或回复
    const removeReplyDeep = (replies: ReplyMsg[]): ReplyMsg[] =>
      replies.filter(r => r.id !== id).map(r => ({ ...r, replies: removeReplyDeep(r.replies) }));
    setMessages(messages.filter(m => m.id !== id).map(m => ({ ...m, replies: removeReplyDeep(m.replies) })));
    setDeleteTarget(null);
  }

  useEffect(() => {
    setLikedIdsState(getLikedIds());
  }, []);

  const isLiked = (id: number) => likedIds.includes(id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.content.trim()) return;
    const newMsg: Message = {
      id: Date.now(),
      name: form.name,
      content: form.content,
      date: new Date().toISOString().split("T")[0],
      likes: 0,
      replies: [],
      showReplyForm: false,
    };
    setMessages([newMsg, ...messages]);
    setForm({ name: "", content: "" });
  };

  const toggleLike = (id: number) => {
    if (isLiked(id)) {
      const newLiked = likedIds.filter((lid) => lid !== id);
      setLikedIdsState(newLiked);
      setLikedIds(newLiked);
      setMessages(messages.map((m) => (m.id === id ? { ...m, likes: m.likes - 1 } : m)));
    } else {
      const newLiked = [...likedIds, id];
      setLikedIdsState(newLiked);
      setLikedIds(newLiked);
      setMessages(messages.map((m) => (m.id === id ? { ...m, likes: m.likes + 1 } : m)));
    }
  };

  const toggleReplyForm = (id: number, isTopLevel: boolean, parentMsgId?: number) => {
    if (isTopLevel) {
      setMessages(messages.map((m) => (m.id === id ? { ...m, showReplyForm: !m.showReplyForm } : m)));
    } else if (parentMsgId !== undefined) {
      setMessages(messages.map((m) => {
        if (m.id !== parentMsgId) return m;
        return { ...m, replies: updateReplyDeep(m.replies, id, (r) => ({ ...r, showReplyForm: !r.showReplyForm })) };
      }));
    }
  };

  const addReply = (parentMsgId: number, parentReplyId: number | null, replyName: string, replyContent: string) => {
    if (!replyName.trim() || !replyContent.trim()) return;
    const reply: ReplyMsg = {
      id: Date.now(),
      name: replyName,
      content: replyContent,
      date: new Date().toISOString().split("T")[0],
      replies: [],
      showReplyForm: false,
    };
    if (parentReplyId === null) {
      // Reply to top-level message
      setMessages(messages.map((m) =>
        m.id === parentMsgId ? { ...m, replies: [...m.replies, reply], showReplyForm: false } : m
      ));
    } else {
      // Reply to another reply
      setMessages(messages.map((m) => {
        if (m.id !== parentMsgId) return m;
        return { ...m, replies: addReplyDeep(m.replies, parentReplyId, reply) };
      }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-20">
      <AnimatedSection className="text-center mb-12">
        <GradientText as="h1" className="text-4xl sm:text-5xl font-bold mb-4">留言板</GradientText>
        <p className="text-muted-foreground">留下你的足迹，说点什么吧</p>
        <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-primary/10 text-sm">
          <span>👀 已有</span>
          <span className="font-bold text-primary">{visitorCount !== null ? visitorCount.toLocaleString() : "..."}</span>
          <span>位访客来过了</span>
        </div>
      </AnimatedSection>

      {/* Message Form */}
      <AnimatedSection delay={0.1}>
        <GlassCard className="mb-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="你的昵称"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="rounded-xl"
              maxLength={30}
            />
            <Textarea
              placeholder="写下你想说的话..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
              className="rounded-xl min-h-[100px]"
              maxLength={500}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{form.content.length}/500</span>
              <Button type="submit" className="rounded-xl gap-2 bg-gradient-to-r from-purple-600 to-cyan-500 text-white">
                <Send className="h-4 w-4" /> 发布留言
              </Button>
            </div>
          </form>
        </GlassCard>
      </AnimatedSection>

      {/* Messages */}
      <div className="space-y-4">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <GlassCard>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{msg.name}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {msg.date}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">#{String(messages.length - i).padStart(2, "0")}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{msg.content}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <button
                        onClick={() => toggleLike(msg.id)}
                        className={`flex items-center gap-1 text-xs transition-colors ${
                          isLiked(msg.id)
                            ? "text-red-500 hover:text-red-400"
                            : "text-muted-foreground hover:text-red-500"
                        }`}
                      >
                        <Heart className={`h-3 w-3 ${isLiked(msg.id) ? "fill-red-500" : ""}`} /> {msg.likes}
                      </button>
                      <button
                        onClick={() => toggleReplyForm(msg.id, true)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Reply className="h-3 w-3" /> 回复
                        {msg.replies.length > 0 && ` (${msg.replies.length})`}
                      </button>
                      {isAdmin && deleteTarget === msg.id ? (
                        <div className="flex items-center gap-1 ml-auto">
                          <button onClick={() => handleDelete(msg.id)} className="text-[10px] text-destructive hover:underline">确认删除</button>
                          <button onClick={() => setDeleteTarget(null)} className="text-[10px] text-muted-foreground hover:underline">取消</button>
                        </div>
                      ) : isAdmin ? (
                        <button
                          onClick={() => setDeleteTarget(msg.id)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors ml-auto"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      ) : null}
                    </div>

                    {/* Nested Replies */}
                    <ReplyList
                      replies={msg.replies}
                      parentMsgId={msg.id}
                      parentName={msg.name}
                      depth={1}
                      onToggleReply={(replyId) => toggleReplyForm(replyId, false, msg.id)}
                      onAddReply={(parentId, name, content) => addReply(msg.id, parentId, name, content)}
                      deleteTarget={deleteTarget}
                      setDeleteTarget={setDeleteTarget}
                      onDeleteConfirm={handleDelete}
                    />

                    {/* Reply Form (top level) */}
                    <AnimatePresence>
                      {msg.showReplyForm && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 overflow-hidden"
                        >
                          <ReplyForm
                            onSubmit={(name, content) => addReply(msg.id, null, name, content)}
                            parentName={msg.name}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ReplyList({
  replies,
  parentMsgId,
  parentName,
  depth,
  onToggleReply,
  onAddReply,
  deleteTarget,
  setDeleteTarget,
  onDeleteConfirm,
}: {
  replies: ReplyMsg[];
  parentMsgId: number;
  parentName: string;
  depth: number;
  onToggleReply: (replyId: number) => void;
  onAddReply: (parentReplyId: number, name: string, content: string) => void;
  deleteTarget: number | null;
  setDeleteTarget: (id: number | null) => void;
  onDeleteConfirm: (id: number) => void;
}) {
  const { isAdmin } = useAuth();
  if (replies.length === 0) return null;
  return (
    <div className="mt-2 space-y-2">
      {replies.map((reply) => (
        <div key={reply.id} className={`${depth <= 2 ? "pl-4 border-l-2 border-border" : "pl-2"}`}>
          <div className="text-sm">
            <span className="font-medium text-primary">{reply.name}</span>
            <span className="text-muted-foreground mx-1">→</span>
            <span className="font-medium">{parentName}</span>
            <span className="text-muted-foreground">：{reply.content}</span>
            <span className="text-xs text-muted-foreground ml-2">{reply.date}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 ml-1">
            <button
              onClick={() => onToggleReply(reply.id)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
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

          {/* Nested replies */}
          <ReplyList
            replies={reply.replies}
            parentMsgId={parentMsgId}
            parentName={reply.name}
            depth={depth + 1}
            onToggleReply={onToggleReply}
            onAddReply={onAddReply}
            deleteTarget={deleteTarget}
            setDeleteTarget={setDeleteTarget}
            onDeleteConfirm={onDeleteConfirm}
          />

          {/* Reply form for this reply */}
          <AnimatePresence>
            {reply.showReplyForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 overflow-hidden"
              >
                <ReplyForm
                  onSubmit={(name, content) => onAddReply(reply.id, name, content)}
                  parentName={reply.name}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

function ReplyForm({ onSubmit, parentName }: { onSubmit: (name: string, content: string) => void; parentName: string }) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;
    onSubmit(name, content);
    setName("");
    setContent("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-start">
      <Input
        placeholder="你的昵称"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="rounded-xl w-28 text-sm h-8"
        maxLength={20}
      />
      <Input
        placeholder={`回复 ${parentName}...`}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
        className="rounded-xl flex-1 text-sm h-8"
        maxLength={200}
      />
      <Button type="submit" size="sm" className="rounded-xl h-8 shrink-0">
        <Send className="h-3 w-3" />
      </Button>
    </form>
  );
}
