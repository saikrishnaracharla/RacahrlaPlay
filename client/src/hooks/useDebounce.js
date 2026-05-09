/**
 * client/src/hooks/useDebounce.js
 *
 * WHY debounce search:
 *  - Without debounce, typing "arijit" fires 6 API calls (one per character)
 *  - With 700ms debounce, it fires ONCE after the user stops typing
 *  - This cuts search API calls by ~85%, preventing our IP from hitting
 *    rate limits and reducing saavn.sumit.co request frequency dramatically
 */
import { useState, useEffect } from 'react';

export function useDebounce(value, delay = 700) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
