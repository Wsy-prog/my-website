"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";

const MOUSE_ENTER_DELAY = 100;

type MousePosition = { x: number; y: number };

const MouseEnterContext = createContext<
  [boolean, React.Dispatch<React.SetStateAction<boolean>>] | undefined
>(undefined);

export function useMouseEnter() {
  const ctx = useContext(MouseEnterContext);
  if (!ctx) throw new Error("useMouseEnter must be used within CardContainer");
  return ctx;
}

/** ---- CardContainer (tracks mouse for the whole card) ---- */
export function CardContainer({
  children,
  className,
  containerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMouseEntered, setIsMouseEntered] = useState(false);
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 });
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    enterTimer.current = setTimeout(() => setIsMouseEntered(true), MOUSE_ENTER_DELAY);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (enterTimer.current) clearTimeout(enterTimer.current);
    setIsMouseEntered(false);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePosition({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }, []);

  useEffect(() => {
    return () => {
      if (enterTimer.current) clearTimeout(enterTimer.current);
    };
  }, []);

  return (
    <MouseEnterContext.Provider value={[isMouseEntered, setIsMouseEntered]}>
      <div
        ref={containerRef}
        className={containerClassName}
        style={{ perspective: "1200px" }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
      >
        <div
          className={className}
          style={{
            transform: isMouseEntered
              ? `rotateY(${(mousePosition.x - 0.5) * 12}deg) rotateX(${-(mousePosition.y - 0.5) * 12}deg)`
              : "rotateY(0deg) rotateX(0deg)",
            transition: isMouseEntered ? "transform 0.05s linear" : "transform 0.4s ease-out",
            transformStyle: "preserve-3d",
          }}
        >
          {children}
        </div>
      </div>
    </MouseEnterContext.Provider>
  );
}

/** ---- CardBody ---- */
export function CardBody({
  children,
  className,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <div className={className} style={{ transformStyle: "preserve-3d" }} {...rest}>
      {children}
    </div>
  );
}

/** ---- CardItem ---- */
export function CardItem({
  children,
  className,
  translateZ = 0,
  as: Component = "div",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  translateZ?: number;
  as?: React.ElementType;
  [key: string]: any;
}) {
  const [isMouseEntered] = useMouseEnter();

  return (
    <Component
      className={className}
      style={{
        transform: `translateZ(${isMouseEntered ? translateZ : 0}px)`,
        transition: "transform 0.4s ease-out",
        transformStyle: "preserve-3d",
      }}
      {...rest}
    >
      {children}
    </Component>
  );
}
