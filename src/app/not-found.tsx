import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-black mb-4 text-primary/30">404</h1>
      <h2 className="text-xl font-semibold mb-2">页面未找到</h2>
      <p className="text-muted-foreground mb-6">
        你访问的页面不存在或已被移除
      </p>
      <Link href="/"
        className="px-6 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
        返回首页
      </Link>
    </div>
  );
}