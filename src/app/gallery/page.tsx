"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Camera, Search, Plus, Upload, MapPin, Calendar, LayoutGrid, Clock3, ImageIcon, Pencil, Trash2, Download } from "lucide-react";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { GradientText } from "@/components/shared/GradientText";
import { GlassCard } from "@/components/shared/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAnimation } from "@/lib/animation-context";
import { useAuth } from "@/lib/auth-context";
import { useIsMounted } from "@/lib/use-is-mounted";
import { getAllMarkers } from "@/lib/travel-store";
import { loadPhotos, savePhotos, type Photo } from "@/data/photos";
import { compressAndUpload } from "@/lib/cloudinary";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
import { UploadProgress } from "@/components/shared/UploadProgress";

const categories = ["全部", "风光", "人像", "视频", "运动", "生活"];

export const dynamic = "force-dynamic";

function GalleryPageInner() {
  const isMounted = useIsMounted();
  const { isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locationParam = searchParams.get("location") || "";
  const { enabled: animEnabled } = useAnimation();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeCategory, setActiveCategory] = useState("全部");
  const [searchText, setSearchText] = useState(locationParam);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "timeline">("grid");

  // 上传表单
  const [uploadForm, setUploadForm] = useState({
    title: "",
    camera: "",
    date: "",
    location: "",
    category: "风光",
    src: "",
  });
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [editPhoto, setEditPhoto] = useState<Photo | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 加载照片
  useEffect(() => {
    setPhotos(loadPhotos());
    // 从 API 拉取最新数据（仅在成功返回数据时才覆盖，避免 API 失败清空本地数据）
    import("@/data/photos").then(mod => mod.loadPhotosFromServer()).then(serverPhotos => {
      if (!isMounted()) return;
      if (serverPhotos.length > 0) {
        setPhotos(serverPhotos);
      }
      setLoaded(true);
    });
  }, []);

  // 同步 location param 到搜索框
  useEffect(() => {
    if (locationParam) {
      setSearchText(locationParam);
    }
  }, [locationParam]);

  // 保存照片变更
  useEffect(() => {
    if (loaded) {
      savePhotos(photos);
    }
  }, [photos, loaded]);

  // 过滤
  const filtered = useMemo(() => {
    let result = activeCategory === "全部"
      ? photos
      : photos.filter((p) => p.category === activeCategory);

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.location && p.location.toLowerCase().includes(q)) ||
          (p.camera && p.camera.toLowerCase().includes(q)) ||
          (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // 日期范围筛选
    if (dateStart) {
      result = result.filter((p) => p.date >= dateStart);
    }
    if (dateEnd) {
      result = result.filter((p) => p.date <= dateEnd);
    }

    return result;
  }, [photos, activeCategory, searchText, dateStart, dateEnd]);

  const currentPhoto = lightboxIndex !== null ? filtered[lightboxIndex] : null;

  // 瀑布流列布局：缓存计算结果，避免每帧重算
  const columnLayout = useMemo(() => {
    const cols = typeof window !== "undefined" && window.innerWidth >= 768 ? 3 : 2;
    const buckets: { photo: Photo; origIndex: number }[][] = Array.from({ length: cols }, () => []);
    filtered.forEach((photo, i) => buckets[i % cols].push({ photo, origIndex: i }));
    return buckets;
  }, [filtered]);

  const goNext = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % filtered.length);
    }
  };

  const goPrev = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + filtered.length) % filtered.length);
    }
  };

  // 提交新照片
  const handleUpload = async () => {
    if (!uploadForm.title.trim()) return;
    let src = uploadForm.src.trim();

    // 如果有本地文件，上传到 Cloudinary
    if (localPreview && fileInputRef.current?.files?.[0]) {
      try {
        setUploading(true);
        src = await compressAndUpload(fileInputRef.current.files[0], 1200);
      } catch {
        if (!src) return;
      } finally {
        setUploading(false);
      }
    }

    if (!src) return;

    const newPhoto: Photo = {
      id: Date.now(),
      title: uploadForm.title.trim(),
      category: uploadForm.category,
      camera: uploadForm.camera.trim(),
      date: uploadForm.date,
      location: uploadForm.location.trim() || undefined,
      src,
    };
    setPhotos([newPhoto, ...photos]);
    setUploadForm({ title: "", camera: "", date: "", location: "", category: "风光", src: "" });
    setUseCustomLocation(false);
    setLocalPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploadOpen(false);
  };

  // 打开编辑对话框
  const openEdit = (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditPhoto({ ...photo });
    setConfirmDelete(false);
  };

  // 保存编辑
  const saveEdit = () => {
    if (!editPhoto) return;
    setPhotos(photos.map((p) => (p.id === editPhoto.id ? editPhoto : p)));
    setEditPhoto(null);
  };

  // 删除照片
  const deletePhoto = () => {
    if (!editPhoto) return;
    setPhotos(photos.filter((p) => p.id !== editPhoto.id));
    setEditPhoto(null);
    setConfirmDelete(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <AnimatedSection className="text-center mb-8">
        <GradientText as="h1" className="text-4xl sm:text-5xl font-bold mb-4">摄影作品</GradientText>
        <p className="text-muted-foreground max-w-xl mx-auto">用镜头捕捉光影，记录世界的美好瞬间</p>
        {locationParam && (
          <Badge variant="secondary" className="mt-3 px-3 py-1 text-sm">
            📍 {locationParam}
            <button
              className="ml-2 hover:text-foreground"
              onClick={() => {
                router.push("/gallery");
                setSearchText("");
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
      </AnimatedSection>

      {/* Search + Upload bar */}
      <div className="flex flex-col gap-3 mb-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索照片名称、地点、相机..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9 rounded-xl"
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
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            className="rounded-xl shrink-0"
            onClick={() => setViewMode("grid")}
            title="网格视图"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "timeline" ? "default" : "outline"}
            size="icon"
            className="rounded-xl shrink-0"
            onClick={() => setViewMode("timeline")}
            title="时间轴视图"
          >
            <Clock3 className="h-4 w-4" />
          </Button>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          {isAdmin && (
            <DialogTrigger className="rounded-xl gap-2 shrink-0 bg-gradient-to-r from-purple-600 to-cyan-500 text-white inline-flex items-center justify-center px-4 py-2 text-sm font-medium">
              <Plus className="h-4 w-4 mr-1" /> 上传
            </DialogTrigger>
          )}
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>上传照片</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-xs font-medium block">照片名称 *</label>
                <Input
                  placeholder="如：海边落日"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  className="rounded-xl mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium block">选择图片 *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // 自动填充名称
                      const name = file.name.replace(/\.[^.]+$/, "");
                      setUploadForm((f) => ({ ...f, title: f.title || name }));
                      // 预览
                      const preview = URL.createObjectURL(file);
                      setLocalPreview(preview);
                      setUploadForm((f) => ({ ...f, src: "" }));
                    }
                  }}
                />
                {localPreview ? (
                  <div className="relative mt-1 rounded-xl overflow-hidden">
                    <img src={localPreview} alt="预览" className="w-full h-40 object-cover" />
                    <button
                      type="button"
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center text-xs hover:bg-black/70"
                      onClick={() => {
                        setLocalPreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full mt-1 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center gap-2 py-6 text-muted-foreground hover:text-primary"
                  >
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-xs">点击选择本地图片</span>
                  </button>
                )}
              </div>
              {!localPreview && (
                <div>
                  <label className="text-xs font-medium block text-muted-foreground">或输入图片 URL</label>
                  <Input
                    placeholder="https://..."
                    value={uploadForm.src}
                    onChange={(e) => setUploadForm({ ...uploadForm, src: e.target.value })}
                    className="rounded-xl mt-1"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block">相机</label>
                  <Input
                    placeholder="Sony A7M4"
                    value={uploadForm.camera}
                    onChange={(e) => setUploadForm({ ...uploadForm, camera: e.target.value })}
                    className="rounded-xl mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block">日期</label>
                  <Input
                    type="date"
                    value={uploadForm.date}
                    onChange={(e) => setUploadForm({ ...uploadForm, date: e.target.value })}
                    className="rounded-xl mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block">分类</label>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  {categories.filter(c => c !== "全部").map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setUploadForm({ ...uploadForm, category: cat })}
                      className={`px-2 py-1 rounded-md text-xs border transition-colors ${
                        uploadForm.category === cat
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block">地点</label>
                {!useCustomLocation ? (
                  <>
                    <select
                      value={uploadForm.location}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setUseCustomLocation(true);
                          setUploadForm({ ...uploadForm, location: "" });
                        } else {
                          setUploadForm({ ...uploadForm, location: e.target.value });
                        }
                      }}
                      className="w-full mt-1 rounded-xl border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">不关联地点</option>
                      <option value="__custom__">✏️ 自定义地点...</option>
                      <optgroup label="旅行地点">
                        {getAllMarkers().map((m) => (
                          <option key={m.id} value={m.title}>
                            {m.photo} {m.title}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </>
                ) : (
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder="输入自定义地点"
                      value={uploadForm.location}
                      onChange={(e) => setUploadForm({ ...uploadForm, location: e.target.value })}
                      className="rounded-xl flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl shrink-0 text-xs"
                      onClick={() => { setUseCustomLocation(false); setUploadForm({ ...uploadForm, location: "" }); }}
                    >
                      选择地点
                    </Button>
                  </div>
                )}
              </div>
              <UploadProgress visible={uploading} label="正在压缩上传..." />
              <Button
                onClick={handleUpload}
                className="w-full rounded-xl gap-2 bg-gradient-to-r from-purple-600 to-cyan-500 text-white"
                disabled={uploading || !uploadForm.title.trim() || (!localPreview && !uploadForm.src.trim())}
              >
                {uploading ? (
                  <><Upload className="h-4 w-4 animate-pulse" /> 上传中...</>
                ) : (
                  <><Upload className="h-4 w-4" /> 添加照片</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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

      {/* Active date/location badges */}
      {(dateStart || dateEnd) && (
        <div className="flex flex-wrap gap-2 justify-center mb-4">
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

      {/* Category filter */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {categories.map((cat) => (
          <Badge
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            className="px-4 py-2 text-sm rounded-full cursor-pointer hover:scale-105 transition-transform"
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </Badge>
        ))}
      </div>

      {/* Results count */}
      {searchText.trim() && (
        <p className="text-center text-sm text-muted-foreground mb-4">
          找到 {filtered.length} 张照片
        </p>
      )}

      {/* Grid View */}
      {viewMode === "grid" && (
        <>
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Camera className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>没有找到匹配的照片</p>
            </div>
          ) : (
            <div className="flex gap-4">
              {columnLayout.map((items, ci) => (
                <div key={ci} className="flex-1 flex flex-col gap-4">
                  {items.map(({ photo, origIndex }) => (
                    <motion.div
                      key={photo.id}
                      layout={animEnabled}
                      initial={animEnabled ? { opacity: 0, scale: 0.9 } : false}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={animEnabled ? { opacity: 0, scale: 0.9 } : undefined}
                  transition={animEnabled ? { duration: 0.4, delay: origIndex * 0.05 } : { duration: 0 }}
                >
                  <CardContainer containerClassName="w-full">
                    <CardBody
                      className="rounded-xl overflow-hidden cursor-pointer group relative border border-border/50 bg-background shadow-sm hover:shadow-xl transition-shadow duration-300"
                      onClick={() => setLightboxIndex(origIndex)}
                    >
                      {/* Edit button — floats highest */}
                      {isAdmin && (
                        <CardItem translateZ={70} className="absolute bottom-2 right-2 z-10">
                          <button
                            className="w-7 h-7 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-200"
                            onClick={(e) => openEdit(photo, e)}
                            title="管理照片"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </CardItem>
                      )}
                      {/* Image — base layer */}
                      <CardItem translateZ={40}>
                        <img
                          src={photo.src}
                          alt={photo.title}
                          className="w-full h-auto transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                      </CardItem>
                      {/* Overlay — floats above image */}
                      <CardItem translateZ={60} className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-end">
                        <div className="p-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-full">
                          <h3 className="font-semibold">{photo.title}</h3>
                          <p className="text-xs text-white/70 flex items-center gap-1">
                            <Camera className="h-3 w-3" /> {photo.camera} · {photo.date}
                          </p>
                          {photo.location && (
                            <p className="text-xs text-white/70 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" /> {photo.location}
                            </p>
                          )}
                        </div>
                      </CardItem>
                    </CardBody>
                  </CardContainer>
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  )}

      {/* Timeline View */}
      {viewMode === "timeline" && (
        <>
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Camera className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>没有找到匹配的照片</p>
            </div>
          ) : (
            <TimelineView
              photos={[...filtered].sort((a, b) => b.date.localeCompare(a.date))}
              onPhotoClick={(photoId) => {
                const idx = filtered.findIndex((p) => p.id === photoId);
                if (idx !== -1) setLightboxIndex(idx);
              }}
              onEdit={(photo, e) => openEdit(photo, e)}
              enabled={animEnabled}
            />
          )}
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={editPhoto !== null} onOpenChange={() => setEditPhoto(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>管理照片</DialogTitle>
          </DialogHeader>
          {editPhoto && (
            <div className="space-y-4 mt-2">
              {/* 缩略图 */}
              <div className="rounded-xl overflow-hidden h-32">
                <img src={editPhoto.src} alt={editPhoto.title} className="w-full h-full object-cover" />
              </div>

              {/* 名称 */}
              <div>
                <label className="text-xs font-medium block">名称</label>
                <Input
                  value={editPhoto.title}
                  onChange={(e) => setEditPhoto({ ...editPhoto, title: e.target.value })}
                  className="rounded-xl mt-1"
                />
              </div>

              {/* 分类 + 日期 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block">分类</label>
                  <select
                    value={editPhoto.category}
                    onChange={(e) => setEditPhoto({ ...editPhoto, category: e.target.value })}
                    className="w-full mt-1 rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  >
                    {categories.filter(c => c !== "全部").map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block">日期</label>
                  <Input
                    type="date"
                    value={editPhoto.date}
                    onChange={(e) => setEditPhoto({ ...editPhoto, date: e.target.value })}
                    className="rounded-xl mt-1"
                  />
                </div>
              </div>

              {/* 相机 + 地点 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block">相机</label>
                  <Input
                    value={editPhoto.camera}
                    onChange={(e) => setEditPhoto({ ...editPhoto, camera: e.target.value })}
                    className="rounded-xl mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block">地点</label>
                  <select
                    value={editPhoto.location || ""}
                    onChange={(e) => setEditPhoto({ ...editPhoto, location: e.target.value || undefined })}
                    className="w-full mt-1 rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">无</option>
                    <optgroup label="旅行地点">
                      {getAllMarkers().map((m) => (
                        <option key={m.id} value={m.title}>{m.photo} {m.title}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-2">
                <Button onClick={saveEdit} className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white">
                  保存
                </Button>
                {!confirmDelete ? (
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl shrink-0 text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded-xl text-xs"
                      onClick={deletePhoto}
                    >
                      确认删除
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs"
                      onClick={() => setConfirmDelete(false)}
                    >
                      取消
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={lightboxIndex !== null} onOpenChange={() => setLightboxIndex(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/95 border-none">
          {currentPhoto && (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={currentPhoto.src}
                alt={currentPhoto.title}
                className="max-w-full max-h-[85vh] object-contain"
              />
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="text-lg font-semibold">{currentPhoto.title}</h3>
                <p className="text-sm text-white/60">
                  {currentPhoto.camera} · {currentPhoto.date}
                  {currentPhoto.location && ` · 📍 ${currentPhoto.location}`}
                </p>
              </div>
              <button
                onClick={goPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              {/* 下载按钮 */}
              <a
                href={currentPhoto.src}
                download={`${currentPhoto.title}.jpg`}
                target="_blank"
                rel="noopener"
                className="absolute top-14 right-4 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-110 transition-all duration-300"
                title="下载照片"
              >
                <Download className="h-5 w-5" />
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function GalleryPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">加载中...</div>}>
      <GalleryPageInner />
    </Suspense>
  );
}

function TimelineView({
  photos,
  onPhotoClick,
  onEdit,
  enabled,
}: {
  photos: Photo[];
  onPhotoClick: (photoId: number) => void;
  onEdit: (photo: Photo, e: React.MouseEvent) => void;
  enabled: boolean;
}) {
  const { isAdmin } = useAuth();
  // 按日期分组
  const groups = new Map<string, Photo[]>();
  for (const p of photos) {
    const list = groups.get(p.date) || [];
    list.push(p);
    groups.set(p.date, list);
  }
  const groupEntries = Array.from(groups.entries());

  return (
    <div className="relative max-w-4xl mx-auto">
      {/* Center line */}
      <div
        className="absolute left-8 sm:left-1/2 top-0 bottom-0 w-0.5"
        style={{ background: "linear-gradient(to bottom, var(--primary), oklch(0.65 0.15 180), var(--primary))" }}
      />
      <div className="space-y-0">
        {groupEntries.map(([date, group], i) => {
          const isEven = i % 2 === 0;
          const year = date.slice(0, 4);
          const monthDay = date.slice(5);
          const prevYear = i > 0 ? groupEntries[i - 1][0].slice(0, 4) : null;
          const showYear = prevYear !== year;
          const count = group.length;

          return (
            <motion.div
              key={date}
              animate={{ opacity: 1, y: 0 }}
              initial={enabled ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
              whileInView={enabled ? { opacity: 1, y: 0 } : undefined}
              viewport={enabled ? { once: false, margin: "-120px" } : undefined}
              transition={enabled ? { duration: 0.35, delay: Math.min(i * 0.03, 0.3) } : { duration: 0 }}
              className={`relative flex items-start gap-4 sm:gap-8 py-6 ${isEven ? "sm:flex-row" : "sm:flex-row-reverse"}`}
            >
              {/* Dot on the line — 多照片时用大点 */}
              <div className="absolute left-8 sm:left-1/2 top-9 -translate-x-1/2 z-10">
                <motion.div
                  animate={{ scale: 1 }}
                  initial={enabled ? { scale: 0 } : { scale: 1 }}
                  whileInView={enabled ? { scale: 1 } : undefined}
                  viewport={enabled ? { once: false, margin: "-120px" } : undefined}
                  transition={enabled ? { duration: 0.3, delay: Math.min(i * 0.03 + 0.05, 0.3), type: "spring" } : { duration: 0 }}
                  className={`rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 shadow-lg shadow-purple-500/30 ${
                    count > 1 ? "w-5 h-5 ring-4 ring-background" : "w-3.5 h-3.5"
                  }`}
                />
              </div>

              {/* Date label */}
              <div className="flex flex-1 items-start pt-1 max-sm:absolute max-sm:left-4 max-sm:-top-4 max-sm:z-10">
                <div className={`flex-1 flex ${isEven ? "justify-end pr-1" : "justify-start pl-1"}`}>
                  <div className={isEven ? "text-right" : "text-left"}>
                    {showYear && (
                      <motion.div
                        animate={{ opacity: 1, x: 0 }}
                        initial={enabled ? { opacity: 0, x: isEven ? 10 : -10 } : { opacity: 1, x: 0 }}
                        whileInView={enabled ? { opacity: 1, x: 0 } : undefined}
                        viewport={enabled ? { once: false, margin: "-120px" } : undefined}
                        transition={enabled ? { duration: 0.3 } : { duration: 0 }}
                        className="text-3xl sm:text-4xl font-black text-primary/30 mb-1 tracking-tight"
                      >
                        {year}
                      </motion.div>
                    )}
                    <div className="text-2xl sm:text-3xl font-bold text-muted-foreground/50 font-mono tracking-wide">
                      {monthDay}
                    </div>
                    {count > 1 && (
                      <div className="text-xs text-primary/60 mt-1 font-medium">
                        {count} 张照片
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Photo card(s) */}
              <div className="flex-1 sm:flex-1 ml-16 sm:ml-0">
                <div className={count > 1 ? "space-y-2" : ""}>
                  {group.map((photo) => (
                    <motion.div
                      key={photo.id}
                      whileHover={enabled ? { scale: 1.02, y: -1 } : undefined}
                      transition={enabled ? { duration: 0.2 } : { duration: 0 }}
                    >
                      <GlassCard className="p-3 cursor-pointer overflow-hidden relative group/tl" onClick={() => onPhotoClick(photo.id)}>
                        {/* Edit button */}
                        {isAdmin && (
                          <button
                            className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center opacity-0 group-hover/tl:opacity-100 transition-all duration-200"
                            onClick={(e) => onEdit(photo, e)}
                            title="管理照片"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                        <div className="flex gap-3">
                          <div className="w-20 h-16 shrink-0 rounded-lg overflow-hidden">
                            <img
                              src={photo.src}
                              alt={photo.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="secondary" className="text-[10px]">{photo.category}</Badge>
                              {count === 1 && (
                                <span className="text-xs text-muted-foreground">{photo.date}</span>
                              )}
                            </div>
                            <h3 className="font-semibold text-sm mb-0.5 leading-snug">{photo.title}</h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Camera className="h-3 w-3" /> {photo.camera}
                              </span>
                              {photo.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> {photo.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
