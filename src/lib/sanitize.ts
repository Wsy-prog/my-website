import DOMPurify from "dompurify";

/** 对用户提交的文字内容做 XSS 消毒，仅保留纯文本，剥离所有 HTML 标签 */
export function sanitizeContent(text: string): string {
  if (typeof window === "undefined") return text;
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}