import { useEffect, useState } from 'react';

/** Debounced value: search boxes wait for the user to pause typing. */
export function useDebounce(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
