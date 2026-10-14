import { useEffect, useState } from 'react';

import { useProgressStore } from './progress/progressStore';

/** Heure courante, rafraîchie régulièrement (recharge des vies, série). */
export function useNow(refreshMs = 30_000): number {
  const clock = useProgressStore((s) => s.clock);
  const [now, setNow] = useState(() => clock.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(clock.now()), refreshMs);
    return () => clearInterval(timer);
  }, [clock, refreshMs]);
  return now;
}
