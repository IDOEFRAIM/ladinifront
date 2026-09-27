'use client';

import { useEffect, useState } from 'react';

export function useCountdown(deadline: string | null) {
  const [remaining, setRemaining] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!deadline) { setRemaining('—'); return; }
    const target = new Date(deadline).getTime();

    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) { setRemaining('Expiré'); setExpired(true); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setRemaining(`${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`);
      setExpired(false);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return { remaining, expired };
}
