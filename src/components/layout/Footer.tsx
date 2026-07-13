import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative z-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="glass-card rounded-2xl px-6 py-8">
          <div className="flex flex-col items-center justify-center gap-2">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              © {new Date().getFullYear()} 王舒毅. Made with <Heart className="h-3 w-3 text-red-500 fill-red-500" />
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
