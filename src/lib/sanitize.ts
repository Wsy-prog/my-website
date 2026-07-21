import DOMPurify from "dompurify";

/** 对用户提交的文字内容做 XSS 消毒，仅保留纯文本，剥离所有 HTML 标签 */
export function sanitizeContent(text: string): string {
  if (typeof window === "undefined") {
    // 服务端：DOMPurify 依赖浏览器 DOM，此处用纯文本转义替代。
    // 剥离所有标签语义，转义 HTML 特殊字符，防止存储型 XSS。
    const s = String(text).replace(/<[^>]*>/g, "");
    const amp = String.fromCharCode(38); // &
    return s
      .replace(/&/g, amp + "amp;")
      .replace(/</g, amp + "lt;")
      .replace(/>/g, amp + "gt;")
      .replace(/"/g, amp + "quot;")
      .replace(/'/g, amp + "#39;");
  }
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}
