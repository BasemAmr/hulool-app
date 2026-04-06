import { useState, useRef, useEffect } from 'react';

export const useStickyHeader = () => {
  const [isSticky, setIsSticky] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // entry.isIntersecting is true when the sentinel is visible.
        // We want the header to be sticky when the sentinel is NOT visible.
        setIsSticky(!entry.isIntersecting);
      },
      {
        root: null, // Observe intersections relative to the viewport
        rootMargin: '0px',
        threshold: 1.0, // Trigger when the sentinel is fully visible/invisible
      }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, []);

  return { sentinelRef, isSticky };
};
