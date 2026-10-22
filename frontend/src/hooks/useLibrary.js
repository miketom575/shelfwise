import { api, qs } from '../api/client';
import { useAsync } from './useAsync';

/** Loads the whole catalog (page by page) so shelves can be grouped by first letter. */
export function useLibrary() {
  return useAsync(async (signal) => {
    const get = (page) => api.get(`/books${qs({ sort: 'title', limit: 100, page })}`, { signal });
    const first = await get(1);
    let all = [...first.data];
    for (let p = 2; p <= Math.min(first.pages || 1, 100); p++) all = all.concat((await get(p)).data);
    return all;
  }, []);
}
