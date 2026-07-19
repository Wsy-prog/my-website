"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-4xl font-bold mb-4">500</h1>
      <h2 className="text-xl font-semibold mb-2">服务器错误</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        页面加载出错，请稍后重试
      </p>
      <button onClick={() => reset()}
        className="px-6 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
        重试
      </button>
    </div>
  );
}