'use client';

import { useState, useCallback } from 'react';

export function useCounterAnimation(initialValues: { producers: number; orders: number; farms: number }) {
  const [displayCounts, setDisplayCounts] = useState(initialValues);

  const animate = useCallback((key: keyof typeof initialValues, from: number, to: number) => {
    const duration = 800;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = Math.round(from + (to - from) * t);
      setDisplayCounts(prev => ({ ...prev, [key]: v }));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  return { displayCounts, animate };
}
