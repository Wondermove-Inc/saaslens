// src/hooks/use-element-size.ts
import { type RefObject, useEffect, useState } from "react";

export interface ElementSize {
  width: number;
  height: number;
}

/**
 * Hook to track the size of an element using ResizeObserver
 * @param ref - React ref object pointing to the element to track
 * @returns Current width and height of the element
 */
export function useElementSize(
  ref: RefObject<HTMLElement | null>
): ElementSize {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      setSize({ width: 0, height: 0 });
      return;
    }

    // Set initial size
    setSize({
      width: element.offsetWidth,
      height: element.offsetHeight,
    });

    // Create ResizeObserver to track size changes
    const resizeObserver = new ResizeObserver(() => {
      if (element) {
        setSize({
          width: element.offsetWidth,
          height: element.offsetHeight,
        });
      }
    });

    resizeObserver.observe(element);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
    };
  }, [ref]);

  return size;
}
