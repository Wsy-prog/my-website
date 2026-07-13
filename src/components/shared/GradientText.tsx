import type { ReactNode } from "react";

interface GradientTextProps {
  children: ReactNode;
  as?: "h1" | "h2" | "h3" | "span";
  className?: string;
}

export function GradientText({ children, as: Tag = "span", className = "" }: GradientTextProps) {
  return (
    <Tag className={`gradient-text ${className}`}>
      {children}
    </Tag>
  );
}
