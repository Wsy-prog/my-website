"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAllImages, imageTitle } from "@/lib/image-library";

interface ImagePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  title?: string;
}

export function ImagePicker({ open, onOpenChange, onSelect, title = "选择图片" }: ImagePickerProps) {
  const [images, setImages] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      setImages(getAllImages());
      setSearch("");
    }
  }, [open]);

  const filtered = search.trim()
    ? images.filter((src) =>
        imageTitle(src).toLowerCase().includes(search.trim().toLowerCase())
      )
    : images;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索文件名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl text-sm"
          />
        </div>

        {/* Grid */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">
              {images.length === 0 ? "暂无可用图片，请先上传" : "没有匹配的图片"}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filtered.map((src) => (
                <button
                  key={src}
                  onClick={() => {
                    onSelect(src);
                    onOpenChange(false);
                  }}
                  className="group rounded-lg border border-border overflow-hidden hover:border-primary transition-colors hover:scale-[1.02]"
                >
                  <img
                    src={src}
                    alt=""
                    className="aspect-square object-cover w-full"
                    loading="lazy"
                  />
                  <p className="text-[10px] px-1.5 py-1 truncate text-muted-foreground group-hover:text-foreground">
                    {imageTitle(src)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
