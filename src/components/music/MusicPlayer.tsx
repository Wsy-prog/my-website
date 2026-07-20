"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play, SkipForward, SkipBack, X, Repeat, ListMusic, Trash2, Settings, ChevronUp, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { uploadAudio, compressAndUpload } from "@/lib/cloudinary";
import { COLOR_PRESETS } from "@/lib/click-words-store";
import { ImagePicker } from "@/components/shared/ImagePicker";

interface Track {
  title: string;
  artist: string;
  src: string;
  cover?: string;
  lyrics?: string;
}

const SEED_TRACKS: Track[] = [
  { title: "城南花已开", artist: "三亩地", src: "https://res.cloudinary.com/ii40ztmn/video/upload/v1783997713/uamlrxgcp1iwewarlfou.mp3" },
  { title: "青空", artist: "Candy_Wind", src: "https://res.cloudinary.com/ii40ztmn/video/upload/v1783997735/x3uz1zd2aotor267u0y7.mp3" },
];

const STORAGE_KEY = "music_tracks";
const LYRIC_SETTINGS_KEY = "lyrics_settings";

interface LyricSettings {
  color: string;
  bgOpacity: number;
  bgStyle: "auto" | "glass" | "clean";
  showBorder: boolean;
  flowBg: boolean;
  hideBg: boolean;
  animateColor: boolean;
  showVinyl: boolean;
  showVisualizer: boolean;
  showKaraoke: boolean;
  showCoverBg: boolean;
  scaleX: number;
  scaleY: number;
}
const defaultSettings: LyricSettings = {
  color: "linear-gradient(135deg, #a855f7, #ec4899, #06b6d4)",
  bgOpacity: 30,
  bgStyle: "auto",
  showBorder: false,
  flowBg: false,
  hideBg: false,
  animateColor: false,
  showVinyl: false,
  showVisualizer: false,
  showKaraoke: false,
  showCoverBg: false,
  scaleX: 1,
  scaleY: 1,
};
function loadLyricSettings(): LyricSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(LYRIC_SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch { return defaultSettings; }
}
function saveLyricSettings(s: Partial<LyricSettings>) {
  if (typeof window === "undefined") return;
  const cur = loadLyricSettings();
  localStorage.setItem(LYRIC_SETTINGS_KEY, JSON.stringify({ ...cur, ...s }));
}

// ========== API 同步 ==========
function getToken(): string | null {
  try { return typeof window !== "undefined" ? localStorage.getItem("admin_token") : null; } catch { return null; }
}

async function syncToApi(tracks: Track[]) {
  try {
    const token = getToken();
    if (!token) return;
    await fetch("/api/data/music_tracks", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ data: tracks }),
    });
  } catch { console.warn("MusicPlayer: API sync failed"); }
}

async function loadFromApi(): Promise<Track[]> {
  try {
    const res = await fetch("/api/data/music_tracks");
    const json = await res.json();
    if (json.exists && Array.isArray(json.data)) return json.data as Track[];
  } catch { console.warn("MusicPlayer: API fetch failed"); }
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

// 解析 LRC 歌词格式
function parseLRC(lrc: string): { time: number; text: string }[] {
  const clean = lrc.replace(/^﻿/, "").trim();
  const lines = clean.split("\n");
  const result: { time: number; text: string }[] = [];
  const regex = /\[(\d{1,2}):(\d{2})(?:[\.:](\d{2,3}))?\](.*)/;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(regex);
    if (match) {
      const m = parseInt(match[1]);
      const s = parseInt(match[2]);
      let time = m * 60 + s;
      if (match[3]) time += parseInt(match[3]) / (match[3].length === 3 ? 1000 : 100);
      const text = match[4].trim();
      if (text) result.push({ time, text });
    }
  }
  return result.sort((a, b) => a.time - b.time);
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
  const [showLyrics, setShowLyrics] = useState(false);
  const [showLyricsPanel, setShowLyricsPanel] = useState(false);
  const [lyricsColor, setLyricsColor] = useState(COLOR_PRESETS[0].value);
  const [lyricsBgOpacity, setLyricsBgOpacity] = useState(30);
  const [lyricsBgStyle, setLyricsBgStyle] = useState<"auto" | "glass" | "clean">("auto");
  const [showBorder, setShowBorder] = useState(false);
  const [flowBg, setFlowBg] = useState(false);
  const [hideLyricsBg, setHideLyricsBg] = useState(false);
  const [animateColor, setAnimateColor] = useState(false);
  const [showVinyl, setShowVinyl] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [showKaraoke, setShowKaraoke] = useState(false);
  const [showCoverBg, setShowCoverBg] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [lyricsPos, setLyricsPos] = useState({ x: 0, y: 0 });
  const [lyricsScaleX, setLyricsScaleX] = useState(1);
  const [lyricsScaleY, setLyricsScaleY] = useState(1);
  const [visData, setVisData] = useState<number[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [showCoverPicker, setShowCoverPicker] = useState<number | null>(null);
  const [trackSettings, setTrackSettings] = useState<number | null>(null);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicFileRef = useRef<HTMLInputElement | null>(null);
  const lyricsFileRef = useRef<HTMLInputElement | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const playModeRef = useRef(playMode);
  const tracksLenRef = useRef(0);
  const wheelRafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  playModeRef.current = playMode;
  tracksLenRef.current = tracks.length;

  // SSR-safe 初始化歌词设置
  useEffect(() => {
    const s = loadLyricSettings();
    setLyricsColor(s.color);
    setLyricsBgOpacity(s.bgOpacity);
    setLyricsBgStyle(s.bgStyle);
    setShowBorder(s.showBorder);
    setFlowBg(s.flowBg);
    setHideLyricsBg(s.hideBg);
    setAnimateColor(s.animateColor);
    setShowVinyl(s.showVinyl);
    setShowVisualizer(s.showVisualizer);
    setShowKaraoke(s.showKaraoke);
    setShowCoverBg(s.showCoverBg);
    setLyricsScaleX(s.scaleX);
    setLyricsScaleY(s.scaleY);
  }, []);

  // 解析当前曲目的歌词
  const parsedLyrics = useMemo(
    () => (tracks[currentTrack]?.lyrics ? parseLRC(tracks[currentTrack].lyrics!) : []),
    [tracks, currentTrack]
  );
  // 计算有效背景样式
  const effectiveBgStyle = lyricsBgStyle === "auto"
    ? (typeof window !== "undefined" && localStorage.getItem("card_theme") === "clean" ? "clean" : "glass")
    : lyricsBgStyle;
  // 当前歌词行
  let currentLine = -1;
  for (let i = 0; i < parsedLyrics.length; i++) {
    if (progress >= parsedLyrics[i].time) currentLine = i;
  }
  // 搜索过滤
  const filteredTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
  }, [tracks, searchQuery]);
  // 边框色
  const borderColor = useMemo(() => {
    const m = lyricsColor.match(/#[a-f0-9]{6}|#[a-f0-9]{3}/i);
    return m ? m[0] : "#a855f7";
  }, [lyricsColor]);

  useEffect(() => {
    setTracks(loadTracks());
    loadFromApi().then(apiTracks => {
      if (apiTracks.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(apiTracks));
        setTracks(apiTracks);
      }
    });
  }, []);

  useEffect(() => {
    const handler = () => setIsOpen(p => !p);
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
        setCurrentTrack(p => (p + 1) % (tracksLenRef.current || 1));
      } else {
        if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => setIsPlaying(false)); }
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

  // 监听专注模式
  const [bgOnly, setBgOnly] = useState(false);
  useEffect(() => {
    setBgOnly(document.documentElement.classList.contains("bg-only-mode"));
    const obs = new MutationObserver(() => setBgOnly(document.documentElement.classList.contains("bg-only-mode")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // 可视化条 — 永久连接 AudioContext 图，永不 disconnect，只开关读数循环
  // 在用户首次播放时初始化（createMediaElementSource 必须在用户交互后）
  // 可视化条 — 挂载时建立永久音频图（不依赖用户交互），永不 disconnect
  useEffect(() => {
    if (audioCtxRef.current || !audioRef.current) return;
    try {
      const ctx = new AudioContext();
      const src = ctx.createMediaElementSource(audioRef.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      mediaSourceRef.current = src;
      analyserRef.current = analyser;
    } catch {}
  }, []);

  // 可视化条 — 开关读数循环
  useEffect(() => {
    const a = analyserRef.current;
    if (!a || !showVisualizer) { cancelAnimationFrame(animFrameRef.current); setVisData([]); return; }
    const buf = new Uint8Array(a.frequencyBinCount);
    const read = () => { a.getByteFrequencyData(buf); setVisData(Array.from(buf.slice(0, 30))); animFrameRef.current = requestAnimationFrame(read); };
    read();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [showVisualizer]);

  // 歌词设置持久化
  useEffect(() => {
    saveLyricSettings({
      color: lyricsColor, bgOpacity: lyricsBgOpacity, bgStyle: lyricsBgStyle,
      showBorder, flowBg, hideBg: hideLyricsBg, animateColor,
      showVinyl, showVisualizer, showKaraoke, showCoverBg,
      scaleX: lyricsScaleX, scaleY: lyricsScaleY,
    });
  }, [lyricsColor, lyricsBgOpacity, lyricsBgStyle, showBorder, flowBg, hideLyricsBg, animateColor, showVinyl, showVisualizer, showKaraoke, showCoverBg, lyricsScaleX, lyricsScaleY]);

  // 注入 CSS
  useEffect(() => {
    const id = "lyrics-keyframes";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent =
      "@keyframes pulse-border{0%,100%{filter:brightness(1);opacity:.8}50%{filter:brightness(1.3);opacity:1}}" +
      "@keyframes flow{0%{background-position:0% 50%}100%{background-position:200% 50%}}";
    document.head.appendChild(style);
  }, []);

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const time = parseFloat(e.target.value);
    setProgress(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  }

  function updateTrack(i: number, f: "title" | "artist", v: string) {
    const updated = tracks.map((t, idx) => idx === i ? { ...t, [f]: v } : t);
    setTracks(updated); saveTracks(updated);
  }
  function moveTrack(i: number, d: -1 | 1) {
    const n = i + d;
    if (n < 0 || n >= tracks.length) return;
    const updated = [...tracks];
    [updated[i], updated[n]] = [updated[n], updated[i]];
    setTracks(updated); saveTracks(updated);
  }
  function deleteTrack(i: number) {
    const updated = tracks.filter((_, idx) => idx !== i);
    setTracks(updated); saveTracks(updated);
    if (currentTrack >= updated.length) setCurrentTrack(Math.max(0, updated.length - 1));
  }
  function importFile(file: File) {
    (async () => {
      try { const url = await uploadAudio(file); setTracks(t => [...t, { title: file.name.replace(/\.[^.]+$/, ""), artist: "未知艺术家", src: url }]); saveTracks([...tracks, { title: file.name.replace(/\.[^.]+$/, ""), artist: "未知艺术家", src: url }]); } catch {}
      if (musicFileRef.current) musicFileRef.current.value = "";
    })();
  }
  function uploadLyrics(idx: number, file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const updated = tracks.map((t, i) => i === idx ? { ...t, lyrics: text } : t);
      setTracks(updated); saveTracks(updated);
    };
    reader.readAsText(file);
    if (lyricsFileRef.current) lyricsFileRef.current.value = "";
  }
  function removeLyrics(idx: number) {
    const updated = tracks.map((t, i) => { if (i !== idx) return t; const c = { ...t }; delete c.lyrics; return c; });
    setTracks(updated); saveTracks(updated);
  }
  function uploadCover(idx: number, file: File) {
    (async () => {
      try { const url = await compressAndUpload(file, 400); setTracks(t => t.map((tr, i) => i === idx ? { ...tr, cover: url } : tr)); saveTracks(tracks.map((tr, i) => i === idx ? { ...tr, cover: url } : tr)); } catch {}
    })();
  }
  function removeCover(idx: number) {
    const updated = tracks.map((t, i) => { if (i !== idx) return t; const c = { ...t }; delete c.cover; return c; });
    setTracks(updated); saveTracks(updated);
  }

  const togglePlay = () => setIsPlaying(p => !p);
  const nextTrack = () => setCurrentTrack(p => tracks.length ? (p + 1) % tracks.length : 0);
  const prevTrack = () => setCurrentTrack(p => tracks.length ? (p - 1 + tracks.length) % tracks.length : 0);

  function onLyricsMouseDown(e: React.MouseEvent) {
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, originX: lyricsPos.x, originY: lyricsPos.y };
    const move = (ev: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      setLyricsPos({ x: dragRef.current.originX + (ev.clientX - dragRef.current.startX), y: dragRef.current.originY + (ev.clientY - dragRef.current.startY) });
    };
    const up = () => { dragRef.current.dragging = false; document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
  }
  function onLyricsWheel(e: React.WheelEvent) {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); const d = -e.deltaY * 0.002; setLyricsScaleX(s => Math.max(0.5, Math.min(2, s + d))); setLyricsScaleY(s => Math.max(0.5, Math.min(2, s + d))); }
  }

  // 切换曲目加载音频
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.load();
    setTimeout(() => { if (isPlaying) audioRef.current?.play().catch(() => setIsPlaying(false)); }, 50);
  }, [currentTrack]);
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.play().catch(() => setIsPlaying(false)); else audioRef.current.pause();
  }, [isPlaying]);

  return (
    <>
      <audio ref={audioRef} src={tracks[currentTrack]?.src} />
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ duration: 0.3 }}
            style={{ position: "fixed", top: "5rem", right: "4rem", zIndex: 50 }} className="w-72 glass-card dark:glass-card-dark rounded-2xl p-4 shadow-2xl">
            {/* 标题栏 */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">🎵 背景音乐</h3>
              <div className="flex items-center gap-1">
                {isAdmin && <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-full ${manageMode ? "bg-primary/20 text-primary" : ""}`} onClick={() => setManageMode(!manageMode)} title="管理歌单"><Settings className="h-4 w-4" /></Button>}
                {parsedLyrics.length > 0 && (
                  <button onClick={() => setShowLyrics(!showLyrics)} className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${showLyrics ? "bg-primary" : "bg-border"}`} title={showLyrics ? "隐藏歌词" : "显示歌词"}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${showLyrics ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                )}
                {parsedLyrics.length > 0 && <button onClick={() => setShowLyricsPanel(!showLyricsPanel)} className={`p-1 rounded-lg text-xs transition-colors ${showLyricsPanel ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`} title="歌词设置">🎤</button>}
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setIsOpen(false)}><X className="h-4 w-4" /></Button>
              </div>
            </div>
            {/* 歌曲信息 + 封面 + 黑胶 */}
            <div className="flex items-center gap-2 mb-2">
              {tracks[currentTrack]?.cover ? (
                <div className="relative shrink-0">
                  <img src={tracks[currentTrack].cover!} alt="" className={`w-9 h-9 rounded-full object-cover ${showVinyl ? "animate-spin" : ""}`}
                    style={showVinyl ? { animation: "spin 4s linear infinite", animationPlayState: isPlaying ? "running" : "paused" } : {}} />
                  {showVinyl && <div className="absolute inset-0 rounded-full border-4 border-white/10" />}
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{tracks[currentTrack]?.title || "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{tracks[currentTrack]?.artist || "—"}</p>
              </div>
              <button onClick={() => setPlayMode(playMode === "loop" ? "sequential" : "loop")} className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground" title={playMode === "loop" ? "单曲循环中" : "顺序播放中"}>
                {playMode === "loop" ? <Repeat className="h-4 w-4 text-primary" /> : <ListMusic className="h-4 w-4" />}
              </button>
            </div>
            {/* 进度条 */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] text-muted-foreground w-9 text-right tabular-nums">{formatTime(progress)}</span>
              <input type="range" min="0" max={duration || 1} step="0.1" value={progress} onChange={handleSeek}
                className="flex-1 h-1 accent-primary cursor-pointer"
                style={{ background: `linear-gradient(to right, var(--primary, #7c3aed) ${(progress / (duration || 1)) * 100}%, var(--border, #e5e7eb) ${(progress / (duration || 1)) * 100}%)` }} />
              <span className="text-[11px] text-muted-foreground w-9 tabular-nums">{formatTime(duration)}</span>
            </div>
            {/* 可视化条 */}
            {showVisualizer && visData.length > 0 && (
              <div className="flex items-end justify-center gap-[3px] h-8 my-2 px-2">
                {visData.map((v, i) => <div key={i} className="w-[3px] rounded-full transition-all duration-75" style={{ height: `${Math.max(4, v / 2.5)}px`, background: `linear-gradient(to top, ${borderColor}, ${borderColor}88)` }} />)}
              </div>
            )}
            {/* 播放控制 */}
            <div className="flex items-center justify-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={prevTrack}><SkipBack className="h-4 w-4" /></Button>
              <Button size="icon" className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:from-purple-700 hover:to-cyan-600" onClick={togglePlay}>
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={nextTrack}><SkipForward className="h-4 w-4" /></Button>
            </div>
            {/* 管理模式 */}
            {manageMode ? (
              <div className="mt-3 -mx-4 -mb-4 p-4 rounded-2xl bg-card border-t border-border shadow-inner">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">📋 歌单管理</h4>
                  <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs" onClick={() => setManageMode(false)}>完成</Button>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {tracks.map((track, i) => (
                    <div key={track.src} className={`p-2 rounded-lg border ${i === currentTrack ? "border-primary/30 bg-primary/5" : "border-border bg-background/50"}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-5 shrink-0 text-right">{i + 1}</span>
                        <div className="flex-1 min-w-0 space-y-1">
                          <input value={track.title} onChange={e => updateTrack(i, "title", e.target.value)}
                            className="w-full text-xs font-medium bg-transparent border-b border-transparent hover:border-border focus:border-primary px-1 py-0.5 focus:outline-none rounded-none" />
                          <input value={track.artist} onChange={e => updateTrack(i, "artist", e.target.value)}
                            className="w-full text-[11px] text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary px-1 py-0.5 focus:outline-none rounded-none" />
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button onClick={() => setTrackSettings(trackSettings === i ? null : i)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="歌曲设置">
                            <Settings className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {trackSettings === i && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <div className="flex items-center gap-1 mb-1.5">
                            <button onClick={() => moveTrack(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-accent disabled:opacity-20"><ChevronUp className="h-3 w-3" /></button>
                            <button onClick={() => moveTrack(i, 1)} disabled={i === tracks.length - 1} className="p-1 rounded hover:bg-accent disabled:opacity-20"><ChevronDown className="h-3 w-3" /></button>
                            {deleteConfirm === i ? (
                              <div className="flex gap-1">
                                <button onClick={() => { deleteTrack(i); setDeleteConfirm(null); }} className="px-1.5 py-0.5 rounded text-[10px] bg-destructive text-destructive-foreground">确认删除</button>
                                <button onClick={() => setDeleteConfirm(null)} className="px-1.5 py-0.5 rounded text-[10px] border border-border">取消</button>
                              </div>
                            ) : <button onClick={() => setDeleteConfirm(i)} className="p-1 rounded hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>}
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            <label className={`p-1 rounded inline-flex items-center gap-0.5 text-[10px] ${track.lyrics ? "text-emerald-400 cursor-default" : "cursor-pointer hover:bg-accent text-muted-foreground hover:text-foreground"}`} title={track.lyrics ? "已关联歌词" : "上传歌词"}>
                              {track.lyrics ? "🎤✅ 歌词" : "🎤 歌词"}
                              {!track.lyrics && <input type="file" accept=".lrc,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadLyrics(i, f); }} />}
                            </label>
                            {track.lyrics && <button onClick={() => removeLyrics(i)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>}
                            <label className="p-1 rounded cursor-pointer hover:bg-accent text-muted-foreground hover:text-foreground text-[10px]">🖼️ 封面上传<input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(i, f); }} /></label>
                            <button onClick={() => setShowCoverPicker(i)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground text-[10px]">🏞 封面选择</button>
                            {track.cover && <button onClick={() => removeCover(i)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => musicFileRef.current?.click()} className="w-full mt-3 py-2 rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors text-xs text-muted-foreground hover:text-primary text-center">＋ 添加歌曲</button>
                <input ref={musicFileRef} type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) importFile(f); }} />
              </div>
            ) : (
              /* 播放模式 */
              <div className="mt-3">
                <input placeholder="🔍 搜索歌曲..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-[11px] bg-transparent border border-border/50 rounded-lg px-2 py-1.5 mb-2 outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/40" />
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(searchQuery.trim() ? filteredTracks : tracks).map((track, i) => {
                    const realIdx = searchQuery.trim() ? tracks.indexOf(track) : i;
                    return (
                      <button key={track.src} onClick={() => { setCurrentTrack(realIdx); setSearchQuery(""); }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 ${realIdx === currentTrack ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-muted-foreground"}`}>
                        {track.cover ? <img src={track.cover} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" /> : <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] shrink-0">🎵</span>}
                        <span className="truncate">{track.title}</span>
                        <span className="opacity-50 shrink-0">— {track.artist}</span>
                      </button>
                    );
                  })}
                  {tracks.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">暂无歌曲，点击 ⚙️ 管理</p>}
                </div>
              </div>
            )}
            {/* 歌词设置面板 */}
            {parsedLyrics.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <button onClick={() => setShowLyricsPanel(!showLyricsPanel)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <span>🎤</span> 歌词设置 <span className="opacity-50">{showLyricsPanel ? "▲" : "▼"}</span>
                </button>
                {showLyricsPanel && (
                  <div className="mt-2 space-y-3 max-h-64 overflow-y-auto pr-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">显示歌词</span>
                      <button onClick={() => setShowLyrics(!showLyrics)} className={`relative w-9 h-4 rounded-full transition-colors duration-300 ${showLyrics ? "bg-primary" : "bg-border"}`}>
                        <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${showLyrics ? "translate-x-[18px]" : "translate-x-0"}`} />
                      </button>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block mb-1">背景样式</span>
                      <div className="flex gap-2">
                        {(["auto", "glass", "clean"] as const).map(t => (
                          <button key={t} onClick={() => setLyricsBgStyle(t)}
                            className={`flex-1 text-[10px] py-1.5 rounded-lg border transition-colors ${lyricsBgStyle === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-white/50"}`}>{t === "auto" ? "联动" : t === "glass" ? "毛玻璃" : "白底"}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block mb-1">遮罩透明度 {lyricsBgOpacity}%</span>
                      <input type="range" min={0} max={80} step={5} value={lyricsBgOpacity} onChange={e => setLyricsBgOpacity(parseInt(e.target.value))} className="w-full h-1 accent-primary" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">渐变边框</span>
                      <button onClick={() => setShowBorder(!showBorder)} className={`relative w-9 h-4 rounded-full transition-colors duration-300 ${showBorder ? "bg-primary" : "bg-border"}`}>
                        <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${showBorder ? "translate-x-[18px]" : "translate-x-0"}`} />
                      </button>
                    </div>
                    {showBorder && <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">流光背景</span>
                      <button onClick={() => setFlowBg(!flowBg)} className={`relative w-9 h-4 rounded-full transition-colors ${flowBg ? "bg-primary" : "bg-border"}`}>
                        <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${flowBg ? "translate-x-[18px]" : "translate-x-0"}`} />
                      </button>
                    </div>}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">隐藏背景</span>
                      <button onClick={() => setHideLyricsBg(!hideLyricsBg)} className={`relative w-9 h-4 rounded-full transition-colors ${hideLyricsBg ? "bg-primary" : "bg-border"}`}>
                        <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${hideLyricsBg ? "translate-x-[18px]" : "translate-x-0"}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">流光动画</span>
                      <button onClick={() => setAnimateColor(!animateColor)} className={`relative w-9 h-4 rounded-full transition-colors ${animateColor ? "bg-primary" : "bg-border"}`}>
                        <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${animateColor ? "translate-x-[18px]" : "translate-x-0"}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">黑胶唱片</span>
                      <button onClick={() => setShowVinyl(!showVinyl)} className={`relative w-9 h-4 rounded-full transition-colors ${showVinyl ? "bg-primary" : "bg-border"}`}>
                        <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${showVinyl ? "translate-x-[18px]" : "translate-x-0"}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">可视化条</span>
                      <button onClick={() => setShowVisualizer(!showVisualizer)} className={`relative w-9 h-4 rounded-full transition-colors ${showVisualizer ? "bg-primary" : "bg-border"}`}>
                        <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${showVisualizer ? "translate-x-[18px]" : "translate-x-0"}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">逐字高亮</span>
                      <button onClick={() => setShowKaraoke(!showKaraoke)} className={`relative w-9 h-4 rounded-full transition-colors ${showKaraoke ? "bg-primary" : "bg-border"}`}>
                        <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${showKaraoke ? "translate-x-[18px]" : "translate-x-0"}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">封面背景</span>
                      <button onClick={() => setShowCoverBg(!showCoverBg)} className={`relative w-9 h-4 rounded-full transition-colors ${showCoverBg ? "bg-primary" : "bg-border"}`} disabled={!tracks[currentTrack]?.cover}>
                        <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${showCoverBg ? "translate-x-[18px]" : "translate-x-0"}`} />
                      </button>
                    </div>
                    <div><p className="text-[10px] text-muted-foreground mb-1">横向缩放 {Math.round(lyricsScaleX * 100)}%</p>
                      <input type="range" min={50} max={200} value={Math.round(lyricsScaleX * 100)} onChange={e => setLyricsScaleX(parseInt(e.target.value) / 100)} className="w-full h-1 accent-primary" /></div>
                    <div><p className="text-[10px] text-muted-foreground mb-1">纵向缩放 {Math.round(lyricsScaleY * 100)}%</p>
                      <input type="range" min={50} max={200} value={Math.round(lyricsScaleY * 100)} onChange={e => setLyricsScaleY(parseInt(e.target.value) / 100)} className="w-full h-1 accent-primary" /></div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1.5">高亮颜色</p>
                      <div className="grid grid-cols-9 gap-1">
                        {COLOR_PRESETS.map(p => (
                          <button key={p.value} onClick={() => setLyricsColor(p.value)}
                            className={`w-5 h-5 rounded-full border-2 transition-all ${lyricsColor === p.value ? "border-white scale-110 shadow-md" : "border-transparent hover:border-white/50"}`}
                            style={{ background: p.value }} title={p.label} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 全屏歌词覆盖层 */}
      {parsedLyrics.length > 0 && (
        <div className={`fixed inset-0 transition-all duration-700 pointer-events-none ${showLyrics ? "opacity-100 z-[60]" : "opacity-0 z-0"}`}>
          <div className="absolute inset-0 flex items-center justify-center" onWheel={onLyricsWheel}>
            <div ref={lyricsContainerRef} onMouseDown={onLyricsMouseDown}
              className="pointer-events-auto cursor-grab active:cursor-grabbing select-none rounded-3xl"
              style={{ transform: `translate(${lyricsPos.x}px, ${lyricsPos.y}px) scale(${lyricsScaleX}, ${lyricsScaleY})`, transition: "transform 0.05s linear", width: "90vw", maxWidth: "42rem" }}>
              {flowBg && !hideLyricsBg && (
                <div style={{ position: "absolute", inset: 0, borderRadius: "1.5rem", background: `conic-gradient(from 45deg, transparent 0deg, ${borderColor}15 40deg, transparent 80deg, transparent 170deg, ${borderColor}15 210deg, transparent 260deg, transparent 350deg, transparent 360deg)`, pointerEvents: "none" }} />
              )}
              <div className="px-6 py-8 rounded-3xl" style={{
                margin: 0, position: "relative", zIndex: 1,
                backgroundColor: (!hideLyricsBg && showCoverBg && tracks[currentTrack]?.cover) ? undefined : (hideLyricsBg ? "transparent" : (effectiveBgStyle === "glass" ? `rgba(0,0,0,${lyricsBgOpacity / 100})` : "rgba(255,255,255,0.92)")),
                backgroundImage: (!hideLyricsBg && showCoverBg && tracks[currentTrack]?.cover) ? `url(${tracks[currentTrack].cover})` : undefined,
                backgroundSize: (!hideLyricsBg && showCoverBg && tracks[currentTrack]?.cover) ? "cover" : undefined,
                backgroundPosition: "center",
                backdropFilter: hideLyricsBg ? "none" : "blur(16px)",
                color: effectiveBgStyle === "clean" ? "#1a1a2e" : undefined,
                border: (showBorder && !hideLyricsBg) ? "2px solid transparent" : (hideLyricsBg ? "none" : (effectiveBgStyle === "glass" ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)")),
                backgroundClip: (showBorder && !hideLyricsBg) ? "padding-box" : undefined,
                boxShadow: showBorder && !hideLyricsBg ? `0 0 0 2px ${borderColor}, 0 0 16px ${borderColor}66` : (hideLyricsBg ? "none" : "0 4px 20px rgba(0,0,0,0.3)"),
                animation: showBorder && !hideLyricsBg ? "pulse-border 3s ease-in-out infinite" : undefined,
              } as React.CSSProperties}>
                {(() => {
                  const start = Math.max(0, currentLine - 2);
                  const end = Math.min(parsedLyrics.length, currentLine + 3);
                  const items = [];
                  for (let i = start; i < end; i++) {
                    const dist = i - currentLine, abs = Math.abs(dist), textColor = effectiveBgStyle === "clean" ? "#6b7280" : "rgba(255,255,255,0.7)";
                    items.push(
                      <div key={i} className="transition-all duration-500 text-center leading-relaxed"
                        style={{ opacity: abs === 0 ? 1 : abs === 1 ? 0.5 : 0.2, transform: `translateY(${dist * 32}px) scale(${abs === 0 ? 1.1 : abs === 1 ? 0.9 : 0.75})`, filter: abs >= 2 ? "blur(1px)" : "none" }}>
                        {i === currentLine ? (
                          showKaraoke ? (() => {
                            const lineStart = parsedLyrics[currentLine].time;
                            const lineEnd = currentLine < parsedLyrics.length - 1 ? parsedLyrics[currentLine + 1].time : lineStart + 4;
                            const pct = Math.min(1, Math.max(0, (progress - lineStart) / (lineEnd - lineStart)));
                            const chars = parsedLyrics[i].text.split("");
                            const done = Math.floor(chars.length * pct);
                            return <span className="text-3xl sm:text-4xl font-bold">{chars.map((ch, ci) => <span key={ci} style={{ color: ci < done ? "inherit" : "rgba(255,255,255,0.25)", transition: "color 0.15s", background: ci < done ? lyricsColor : "transparent", WebkitBackgroundClip: ci < done ? "text" : undefined, WebkitTextFillColor: ci < done ? "transparent" : undefined }}>{ch}</span>)}</span>;
                          })() : (
                            <span className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent" style={{ background: lyricsColor, WebkitBackgroundClip: "text", backgroundSize: animateColor ? "200% 100%" : undefined, animation: animateColor ? "flow 3s linear infinite" : undefined }}>
                              {parsedLyrics[i].text}
                            </span>
                          )
                        ) : <span className="text-lg sm:text-xl" style={{ color: textColor }}>{parsedLyrics[i].text}</span>}
                      </div>
                    );
                  }
                  return items;
                })()}
                {showVisualizer && visData.length > 0 && (
                  <div className="flex items-end justify-center gap-[3px] h-10 mt-4">
                    {visData.map((v, i) => <div key={i} className="w-[3px] rounded-full transition-all duration-75" style={{ height: `${Math.max(4, v / 2)}px`, background: `linear-gradient(to top, ${borderColor}, ${borderColor}88)` }} />)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCoverPicker !== null && (
        <ImagePicker open={showCoverPicker !== null} onOpenChange={o => { if (!o) setShowCoverPicker(null); }}
          onSelect={url => { const updated = tracks.map((t, i) => i === showCoverPicker ? { ...t, cover: url } : t); setTracks(updated); saveTracks(updated); setShowCoverPicker(null); }}
          title="选择封面图片" />
      )}
    </>
  );
}