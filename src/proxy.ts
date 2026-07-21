import { NextResponse, type NextRequest } from "next/server";

// Next 16: middleware 约定已更名为 proxy。
// 给所有响应添加基础安全响应头。
// CSP 暂未配置：站点含内联脚本（layout.tsx 的 site_defaults 注入）+ Tailwind 运行时，
// 严格 CSP 易误伤，留作后续单独处理。先加其余纵深防御头。
export function proxy(_req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  return res;
}

export const config = {
  // 对所有路由生效（含 API）
  matcher: ["/((?!_next/static|_next/image|favicon.png|apple-icon.png|images/).*)"],
};
