"use client";

import { useCallback, useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { Mark, mergeAttributes } from "@tiptap/core";
import type { ChainedCommands } from "@tiptap/core";

// 扩展 ChainedCommands 以支持自定义 setGradientText / unsetGradientText
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    gradientText: {
      setGradientText: (gradient: string) => ReturnType;
      unsetGradientText: () => ReturnType;
    };
  }
}
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  ImageIcon, Smile, Quote, Undo2, Redo2, Images, Code, Link, Upload, Palette,
} from "lucide-react";
import { motion } from "framer-motion";
import { compressAndUpload } from "@/lib/cloudinary";
import { ImagePicker } from "@/components/shared/ImagePicker";
import { COLOR_PRESETS } from "@/lib/click-words-store";
import type { Photo } from "@/data/photos";

// ========== 自定义渐变色 Mark ==========
const GradientText = Mark.create({
  name: "gradientText",

  addAttributes() {
    return {
      style: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[style*='background-clip: text']",
        getAttrs: (el) => {
          const span = el as HTMLElement;
          const style = span.getAttribute("style") || "";
          if (!style.includes("gradient")) return false;
          return { style };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        style: HTMLAttributes.style,
      }),
      0,
    ];
  },

  addCommands(): any {
    return {
      setGradientText:
        (gradient: string) =>
        ({ commands }: { commands: any }) => {
          return commands.setMark(this.name, {
            style: `background:${gradient};-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;caret-color:#a855f7;display:inline;`,
          });
        },
      unsetGradientText:
        () =>
        ({ commands }: { commands: any }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});

// ========== 表情 ==========
const EMOJIS = [
  "😀","😂","🥰","😎","🤔","🤩","🥳","😤","😭","🥺","🤯","🥶","😈","💀","👻","🤡",
  "👍","👎","👊","✌️","🤞","🤟","👋","🤝","💪","🫶","✨","🔥","🌟","💡","❤️","💔","💯",
  "🎉","🎊","🎵","🎶","📝","💻","📷","🎮","🐶","🐱","🐼","🐨","🦁","🐯","🐮","🐷","🦊","🐸",
  "🌸","🌿","🌺","🌻","🌵","🍀","🍕","🍔","🌮","🍣","🥟","🍰","🍩","☕","🍜","🥤",
  "⚽","🏀","🏈","⚾️","🎾","🏐","🚗","🚕","🚌","🚁","✈️","🚀","🚲","🛴",
  "🏔️","🌊","🌅","🌋","🗼","🏯","🎡","🎢","🎪","🎭","🎨","🏆","🥇","📚","📖","🔑","💎","🎁","🔔",
];

export interface RichTextEditorHandle {
  getHTML: () => string;
  setHTML: (html: string) => void;
  getWordCount: () => number;
}

interface RichTextEditorProps {
  initialContent?: string;
  onUpdate?: () => void;
}

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor({ initialContent, onUpdate }, ref) {
    // 背景模糊度
    const [bgBlur, setBgBlur] = useState(60);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
      const obs = new MutationObserver(() =>
        setIsDark(document.documentElement.classList.contains("dark"))
      );
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => obs.disconnect();
    }, []);

    // 插入链接
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [linkText, setLinkText] = useState("");

    // 表情
    const [showEmoji, setShowEmoji] = useState(false);

    // 颜色
    const [showColorPicker, setShowColorPicker] = useState(false);

    // 图片选择
    const [showInlineImagePicker, setShowInlineImagePicker] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          codeBlock: {
            HTMLAttributes: {
              class:
                "bg-muted/60 rounded-xl p-4 my-4 text-sm font-mono overflow-x-auto",
              spellcheck: "false",
            },
          },
        }),
        Underline,
        TextStyle,
        GradientText,
        LinkExtension.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-primary underline cursor-pointer",
            rel: "noopener noreferrer",
            target: "_blank",
          },
        }),
        ImageExtension.configure({
          inline: false,
          HTMLAttributes: {
            class: "rounded-xl my-4 max-w-full",
            style: "max-height:400px",
          },
        }),
        Placeholder.configure({
          placeholder: "开始写作...",
        }),
      ],
      content: initialContent || "<p></p>",
      onUpdate,
      editorProps: {
        attributes: {
          class:
            "max-w-none min-h-[500px] p-6 focus:outline-none cursor-text text-base leading-relaxed [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:my-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:bg-muted/30 [&_blockquote]:rounded-r-lg [&_img]:rounded-xl [&_img]:my-4 [&_img]:max-w-full [&_strong]:font-semibold [&_pre]:bg-muted/60 [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:text-sm [&_pre]:font-mono [&_code]:bg-muted/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-sm [&_code]:font-mono [&_code]:text-primary [&_pre_code]:bg-transparent [&_pre_code]:px-0 [&_pre_code]:py-0 [&_pre_code]:rounded-none [&_pre_code]:text-foreground [&_a]:text-primary [&_a]:underline",
        },
        handlePaste: (_view, event) => {
          const items = event.clipboardData?.items;
          if (!items) return false;
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith("image/")) {
              event.preventDefault();
              const file = items[i].getAsFile();
              if (file) {
                compressAndUpload(file, 800).then((url) => {
                  editor?.chain().focus().setImage({ src: url }).run();
                }).catch(() => {});
              }
              return true;
            }
          }
          // 纯文本粘贴
          event.preventDefault();
          const text = event.clipboardData.getData("text/plain");
          editor?.chain().focus().insertContent(text).run();
          return true;
        },
      },
    });

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() || "",
      setHTML: (html: string) => editor?.commands.setContent(html),
      getWordCount: () =>
        (editor?.getText() || "").replace(/\s/g, "").length,
    }));

    // 插入图片
    const insertImage = useCallback(async () => {
      const file = fileInputRef.current?.files?.[0];
      if (!file || !editor) return;
      try {
        const url = await compressAndUpload(file, 800);
        editor.chain().focus().setImage({ src: url }).run();
        fileInputRef.current!.value = "";
      } catch { /* ignore */ }
    }, [editor]);

    // 插入图片 URL
    const insertImageUrl = useCallback(
      (url: string) => {
        editor?.chain().focus().setImage({ src: url }).run();
      },
      [editor]
    );

    // ========== 链接插入：插入链接文本后取消 link mark，确保后续输入不受影响 ==========
    const handleInsertLink = useCallback(() => {
      if (!linkUrl.trim() || !editor) return;
      const href = linkUrl.trim();
      const text = linkText.trim() || href;

      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text,
          marks: [{ type: "link", attrs: { href } }],
        })
        // 取消 link mark，使光标后的新输入不再被链接包裹
        .unsetMark("link")
        .run();

      setShowLinkDialog(false);
      setLinkUrl("");
      setLinkText("");
    }, [linkUrl, linkText, editor]);

    // 应用渐变色
    const applyColor = useCallback(
      (gradient: string) => {
        editor
          ?.chain()
          .focus()
          .setGradientText(gradient)
          .run();
        setShowColorPicker(false);
      },
      [editor]
    );

    // 清除渐变色
    const clearColor = useCallback(() => {
      editor?.chain().focus().unsetGradientText().run();
      setShowColorPicker(false);
    }, [editor]);

    if (!editor) return null;

    const isBold = editor.isActive("bold");
    const isItalic = editor.isActive("italic");
    const isUnderline = editor.isActive("underline");
    const isCode = editor.isActive("code");
    const isCodeBlock = editor.isActive("codeBlock");
    const isBlockquote = editor.isActive("blockquote");
    const isBulletList = editor.isActive("bulletList");
    const isOrderedList = editor.isActive("orderedList");
    const isLink = editor.isActive("link");
    const headingLevel = editor.isActive("heading")
      ? (editor.getAttributes("heading").level as number)
      : 0;

    return (
      <>
        {/* Toolbar */}
        <div className="flex items-center gap-1 p-2 rounded-xl bg-muted/50 border border-border flex-wrap sticky top-20 z-40 backdrop-blur">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="撤销 (Ctrl+Z)"
            aria-label="撤销"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="重做 (Ctrl+Y)"
            aria-label="重做"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <span className="w-px h-5 bg-border mx-0.5" />

          <select
            value={headingLevel ? `h${headingLevel}` : ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                const level = parseInt(val[1]) as 1|2|3;
                // 先清除所有 heading，再设置指定级别的 heading（避免级别间切换异常）
                editor.chain().focus().setParagraph().toggleHeading({ level }).run();
              } else {
                editor.chain().focus().setParagraph().run();
              }
            }}
            className="text-xs rounded-md border border-input bg-background px-1.5 py-1.5 w-16"
          >
            <option value="">正文</option>
            <option value="h1">标题1</option>
            <option value="h2">标题2</option>
            <option value="h3">标题3</option>
          </select>
          <span className="w-px h-5 bg-border mx-0.5" />

          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded transition-colors ${isBold ? "bg-accent text-primary" : "hover:bg-accent"}`}
            title="加粗"
            aria-label="加粗"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded transition-colors ${isItalic ? "bg-accent text-primary" : "hover:bg-accent"}`}
            title="斜体"
            aria-label="斜体"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded transition-colors ${isUnderline ? "bg-accent text-primary" : "hover:bg-accent"}`}
            title="下划线"
            aria-label="下划线"
          >
            <UnderlineIcon className="h-4 w-4" />
          </button>
          <span className="w-px h-5 bg-border mx-0.5" />

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded transition-colors ${isBulletList ? "bg-accent text-primary" : "hover:bg-accent"}`}
            title="无序列表"
            aria-label="无序列表"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded transition-colors ${isOrderedList ? "bg-accent text-primary" : "hover:bg-accent"}`}
            title="有序列表"
            aria-label="有序列表"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded transition-colors ${isBlockquote ? "bg-accent text-primary" : "hover:bg-accent"}`}
            title="引用"
            aria-label="引用"
          >
            <Quote className="h-4 w-4" />
          </button>
          <span className="w-px h-5 bg-border mx-0.5" />

          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded transition-colors ${isCodeBlock ? "bg-accent text-primary" : "hover:bg-accent"}`}
            title="插入代码"
            aria-label="插入代码"
          >
            <Code className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowLinkDialog(true)}
            className={`p-1.5 rounded transition-colors ${isLink ? "bg-accent text-primary" : "hover:bg-accent"}`}
            title="插入链接"
            aria-label="插入链接"
          >
            <Link className="h-4 w-4" />
          </button>
          <span className="w-px h-5 bg-border mx-0.5" />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="本地上传图片"
            aria-label="本地上传图片"
          >
            <Upload className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowInlineImagePicker(true)}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="已有图片"
            aria-label="已有图片"
          >
            <ImageIcon className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={insertImage}
          />

          {/* 表情 */}
          <div className="relative">
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className={`p-1.5 rounded transition-colors ${showEmoji ? "bg-accent" : "hover:bg-accent"}`}
              title="表情"
              aria-label="表情"
            >
              <Smile className="h-4 w-4" />
            </button>
            {showEmoji && (
              <>
                <div className="fixed inset-0 z-[49]" onClick={() => setShowEmoji(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 mt-1 p-3 rounded-xl border border-border bg-popover shadow-xl grid grid-cols-10 gap-1 max-h-32 overflow-y-auto z-50 min-w-[260px]"
                >
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        editor.chain().focus().insertContent(emoji).run();
                      }}
                      className="text-lg p-1 rounded hover:bg-accent transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </div>

          {/* 渐变色 */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className={`p-1.5 rounded transition-colors ${showColorPicker ? "bg-accent" : "hover:bg-accent"}`}
              title="文字颜色"
              aria-label="文字颜色"
            >
              <Palette className="h-4 w-4" />
            </button>
            {showColorPicker && (
              <>
                <div className="fixed inset-0 z-[49]" onClick={() => setShowColorPicker(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 mt-1 p-3 rounded-xl border border-border bg-popover shadow-xl z-50 w-56"
                >
                  <div className="grid grid-cols-3 gap-3">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => applyColor(preset.value)}
                        className="w-full aspect-square rounded-xl border-2 border-border/50 hover:scale-105 transition-transform shadow-sm"
                        style={{ background: preset.value }}
                        title={preset.label}
                      />
                    ))}
                  </div>
                  <button
                    onClick={clearColor}
                    className="w-full mt-2 text-[11px] text-muted-foreground hover:text-foreground text-center py-1.5 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    清除颜色
                  </button>
                </motion.div>
              </>
            )}
          </div>
          <span className="w-px h-5 bg-border mx-0.5" />
          <span className="text-[10px] text-muted-foreground ml-1">模糊</span>
          <input
            type="range" min="0" max="90" step="10" value={bgBlur}
            onChange={(e) => setBgBlur(parseInt(e.target.value, 10))}
            className="w-12 accent-primary h-1"
            title="背景模糊度"
          />
          <span className="text-[10px] text-muted-foreground w-5">{bgBlur}</span>
        </div>

        {/* Editor */}
        <div
          className="rounded-xl border border-white/20 shadow-lg overflow-hidden"
          style={{
            backdropFilter: `blur(${bgBlur < 30 ? 4 : bgBlur < 60 ? 12 : 24}px)`,
            background: isDark
              ? `rgba(255,255,255,${bgBlur / 1000})`
              : `rgba(255,255,255,${bgBlur / 100})`,
          }}
        >
          <EditorContent editor={editor} />
        </div>

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={insertImage}
        />

        {/* 已有图片选择 */}
        <ImagePicker
          open={showInlineImagePicker}
          onOpenChange={setShowInlineImagePicker}
          onSelect={insertImageUrl}
          title="选择已有图片插入正文"
        />

        {/* 插入链接弹窗 */}
        {showLinkDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowLinkDialog(false)}>
            <div
              className="bg-popover rounded-xl shadow-xl border border-border p-6 w-80 max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold mb-4 text-sm">🔗 插入链接</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">链接地址</label>
                  <input
                    placeholder="https://..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleInsertLink(); }}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">显示文字（可选）</label>
                  <input
                    placeholder="点击此处"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleInsertLink(); }}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowLinkDialog(false)}
                    className="px-3 py-1.5 rounded-lg text-xs border border-border hover:bg-accent transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleInsertLink}
                    disabled={!linkUrl.trim()}
                    className="px-3 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    插入
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
);

export default RichTextEditor;