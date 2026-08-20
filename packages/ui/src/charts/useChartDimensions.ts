"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_HEIGHT = 288;

export function useChartDimensions(height = DEFAULT_HEIGHT) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const measure = () => setWidth(node.clientWidth);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { containerRef, width, height, ready: width > 0 };
}
