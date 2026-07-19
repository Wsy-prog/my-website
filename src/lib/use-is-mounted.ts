import { useCallback, useEffect, useRef } from "react";

/** 返回一个函数，调用后可知组件是否仍挂载 */
export function useIsMounted(): () => boolean {
  const ref = useRef(true);
  useEffect(() => {
    ref.current = true;
    return () => { ref.current = false; };
  }, []);
  return useCallback(() => ref.current, []);
}