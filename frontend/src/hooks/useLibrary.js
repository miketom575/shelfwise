import { api, qs } from '../api/client';
import { useAsync } from './useAsync';

let cache = null; // last catalog we loaded: shown at once when you come back from a book, then refreshed

/** Loads the whole catalog (page by page) so shelves can be grouped by first letter. */
export function useLibrary() {
  const r = useAsync(async (signal) => {
    const get = (page) => api.get(`/books${qs({ sort: 'title', limit: 100, page })}`, { signal });
    const first = await get(1);
    let all = [...first.data];
    for (let p = 2; p <= Math.min(first.pages || 1, 100); p++) all = all.concat((await get(p)).data);
    cache = all;
    return all;
  }, []);
  return { ...r, data: r.data || cache };
}