"use client";

import { Loader2 } from "lucide-react";

interface UploadProgressProps {
  /** 是否显示上传进度 */
  visible: boolean;
  /** 自定义提示文字，默认为"上传中..." */
  label?: string;
}

/**
 * 上传进度指示器 — 旋转加载图标 + 文字提示
 * 使用 CSS animation 而非 framer-motion，减少组件体积
 */
export function UploadProgress({ visible, label }: UploadProgressProps) {
  if (!visible) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
      <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
      <span>{label || "上传中..."}</span>
    </div>
  );
}