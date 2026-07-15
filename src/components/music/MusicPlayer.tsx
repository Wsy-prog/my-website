"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play, SkipForward, SkipBack, X, Repeat, ListMusic, Trash2, Settings, ChevronUp, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { uploadAudio } from "@/lib/cloudinary";

interface Track {
  title: string;
  artist: string;
  src: string;
}

const SEED_TRACKS: Track[] = [
  { title: "城南花已开", artist: "三亩地", src: "https://res.cloudinary.com/ii40ztmn/video/upload/v1783997713/uamlrxgcp1iwewarlfou.mp3" },
  { title: "青空", artist: "Candy_Wind", src: "https://res.cloudinary.com/ii40ztmn/video/upload/v1783997735/x3uz1zd2aotor267u0y7.mp3" },
];

const STORAGE_KEY = "music_tracks";

// ========== API 同步 ==========
async function syncToApi(tracks: Track[]) {
  try {
    await fetch("/api/data/music_tracks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: tracks }),
    });
  } catch { /* 静默 */ }
}

async function loadFromApi(): Promise<Track[]> {
  try {
    const res = await fetch("/api/data/music_tracks");
    const json = await res.json();
    if (json.exists && Array.isArray(json.data)) {
      return json.data as Track[];
    }
  } catch { /* 网络错误 */ }
  return [];
}

// ========== 本地缓存 ==========
function loadTracks(): Track[] {
  if (typeof window === "undefined") return SEED_TRACKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_TRACKS;
    return JSON.parse(raw);
  } catch { return SEED_TRACKS; }
}

function saveTracks(ts: Track[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ts));
    syncToApi(ts);
  } catch { /* quota */ }
}

export function MusicPlayer() {
  const { isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playMode, setPlayMode] = useState<"loop" | "sequential">("loop");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [manageMode, setManageMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicFileRef = useRef<HTMLInputElement | null>(null);
  const playModeRef = useRef(playMode);
  const tracksLenRef = useRef(0);
  playModeRef.current = playMode;
  tracksLenRef.current = tracks.length;

  useEffect(() => {
    setTracks(loadTracks());
    // 从 API 拉取最新歌单，覆盖本地
    loadFromApi().then(apiTracks => {
      if (apiTracks.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(apiTracks));
        setTracks(apiTracks);
      }
    });
  }, []);

  useEffect(() => {
    const handler = () => setIsOpen((prev) => !prev);
    document.addEventListener("toggle-music", handler);
    return () => document.removeEventListener("toggle-music", handler);
  }, []);

  function formatTime(seconds: number) {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoadedMeta = () => setDuration(audio.duration);
    const onEnded = () => {
      if (playModeRef.current === "sequential") {
        setCurrentTrack((prev) => (prev + 1) % (tracksLenRef.current || 1));
      } else {
        // 单曲循环：从头重新播放
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => setIsPlaying(false));
        }
        setProgress(0);
      }
    };
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMeta);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMeta);
      audio.removeEventListener("ended", onEnded);
    };
  }, [currentTrack]);

  useEffect(() => {
    document.dispatchEvent(new CustomEvent("music-state-change", { detail: { isPlaying } }));
  }, [isPlaying]);

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const time = parseFloat(e.target.value);
    setProgress(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  }

  // ===== 歌单操作（统一，不区分内置/自定义） =====

  function updateTrack(index: number, field: "title" | "artist", value: string) {
    const updated = tracks.map((t, i) => i === index ? { ...t, [field]: value } : t);
    setTracks(updated);
    saveTracks(updated);
  }

  function moveTrack(index: number, dir: -1 | 1) {
    const newIdx = index + dir;
    if (newIdx < 0 || newIdx >= tracks.length) return;
    const updated = [...tracks];
    [updated[index], updated[newIdx]] = [updated[newIdx], updated[index]];
    setTracks(updated);
    saveTracks(updated);
  }

  function deleteTrack(index: number) {
    const updated = tracks.filter((_, i) => i !== index);
    setTracks(updated);
    saveTracks(updated);
    if (currentTrack >= updated.length) setCurrentTrack(Math.max(0, updated.length - 1));
  }

  function importFile(file: File) {
    (async () => {
      try {
        const url = await uploadAudio(file);
        const newTrack: Track = {
          title: file.name.replace(/\.[^.]+$/, ""),
          artist: "未知艺术家",
          src: url,
        };
        const updated = [...tracks, newTrack];
        setTracks(updated);
        saveTracks(updated);
      } catch {
        /* 上传失败，忽略 */
      }
      if (musicFileRef.current) musicFileRef.current.value = "";
    })();
  }

  const togglePlay = () => setIsPlaying(!isPlaying);
  const nextTrack = () => setCurrentTrack((prev) => (prev + 1) % tracks.length);
  const prevTrack = () => setCurrentTrack((prev) => (prev - 1 + tracks.length) % tracks.length);

  // 切换曲目时加载音频
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      if (isPlaying) audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [currentTrack]);

  // 播放/暂停控制
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  return (
    <>
      <audio ref={audioRef} src={tracks[currentTrack]?.src} />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            style={{ position: "fixed", top: "5rem", right: "4rem", zIndex: 50 }}
            className="w-72 glass-card dark:glass-card-dark rounded-2xl p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">🎵 背景音乐</h3>
              <div className="flex items-center gap-1">
                {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 rounded-full ${manageMode ? "bg-primary/20 text-primary" : ""}`}
                  onClick={() => setManageMode(!manageMode)}
                  title="管理歌单"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium text-sm">{tracks[currentTrack]?.title || "—"}</p>
                <p className="text-xs text-muted-foreground">{tracks[currentTrack]?.artist || "—"}</p>
              </div>
              <button
                onClick={() => setPlayMode(playMode === "loop" ? "sequential" : "loop")}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                title={playMode === "loop" ? "单曲循环中" : "顺序播放中"}
              >
                {playMode === "loop" ? (
                  <Repeat className="h-4 w-4 text-primary" />
                ) : (
                  <ListMusic className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* 进度条 */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] text-muted-foreground w-9 text-right tabular-nums">{formatTime(progress)}</span>
              <input
                type="range" min="0" max={duration || 1} step="0.1" value={progress} onChange={handleSeek}
                className="flex-1 h-1 accent-primary cursor-pointer"
                style={{ background: `linear-gradient(to right, var(--primary, #7c3aed) ${(progress / (duration || 1)) * 100}%, var(--border, #e5e7eb) ${(progress / (duration || 1)) * 100}%)` }}
              />
              <span className="text-[11px] text-muted-foreground w-9 tabular-nums">{formatTime(duration)}</span>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={prevTrack}><SkipBack className="h-4 w-4" /></Button>
              <Button size="icon" className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:from-purple-700 hover:to-cyan-600" onClick={togglePlay}>
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={nextTrack}><SkipForward className="h-4 w-4" /></Button>
            </div>

            {manageMode ? (
              // ===== 管理模式 =====
              <div className="mt-3 -mx-4 -mb-4 p-4 rounded-2xl bg-card border-t border-border shadow-inner">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">📋 歌单管理</h4>
                  <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs" onClick={() => setManageMode(false)}>完成</Button>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {tracks.map((track, i) => (
                    <div key={i} className={`p-2 rounded-lg border ${i === currentTrack ? "border-primary/30 bg-primary/5" : "border-border bg-background/50"}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-5 shrink-0 text-right">{i + 1}</span>
                        <div className="flex-1 min-w-0 space-y-1">
                          <input value={track.title} onChange={(e) => updateTrack(i, "title", e.target.value)}
                            className="w-full text-xs font-medium bg-transparent border-b border-transparent hover:border-border focus:border-primary px-1 py-0.5 focus:outline-none rounded-none" />
                          <input value={track.artist} onChange={(e) => updateTrack(i, "artist", e.target.value)}
                            className="w-full text-[11px] text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary px-1 py-0.5 focus:outline-none rounded-none" />
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button onClick={() => moveTrack(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-accent disabled:opacity-20"><ChevronUp className="h-3.5 w-3.5" /></button>
                          <button onClick={() => moveTrack(i, 1)} disabled={i === tracks.length - 1} className="p-1 rounded hover:bg-accent disabled:opacity-20"><ChevronDown className="h-3.5 w-3.5" /></button>
                          {deleteConfirm === i ? (
                            <div className="flex gap-0.5">
                              <button onClick={() => { deleteTrack(i); setDeleteConfirm(null); }}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-destructive text-destructive-foreground">确认</button>
                              <button onClick={() => setDeleteConfirm(null)}
                                className="px-1.5 py-0.5 rounded text-[10px] border border-border">取消</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(i)} className="p-1 rounded hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => musicFileRef.current?.click()}
                  className="w-full mt-3 py-2 rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors text-xs text-muted-foreground hover:text-primary text-center">
                  ＋ 添加歌曲
                </button>
                <input ref={musicFileRef} type="file" accept="audio/*" className="hidden"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) importFile(file); }} />
              </div>
            ) : (
              // ===== 播放模式 =====
              <div className="mt-4 space-y-1 max-h-48 overflow-y-auto">
                {tracks.map((track, i) => (
                  <button key={i} onClick={() => setCurrentTrack(i)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                      i === currentTrack ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-muted-foreground"
                    }`}>
                    {track.title} — <span className="opacity-70">{track.artist}</span>
                  </button>
                ))}
                {tracks.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">暂无歌曲，点击 ⚙️ 管理</p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
