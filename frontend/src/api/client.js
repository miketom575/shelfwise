/** Thin fetch wrapper: cookies for the session, CSRF header, friendly errors. */
export class ApiError extends Error {
  constructor(message, status = 0, errors = null) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.data = null; // the full JSON error body (e.g. { suspended: true })
  }
  /** { fieldName: message } for inline form errors */
  get fields() {
    return Object.fromEntries((this.errors || []).map((e) => [e.field, e.message]));
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      signal,
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Can’t reach the server. Check your connection and try again.', 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('lms:unauthorized'));
    const apiErr = new ApiError(data?.message || 'Something went wrong. Try again.', res.status, data?.errors);
    apiErr.data = data;
    throw apiErr;
  }
  return data;
}

/** Build a query string, skipping empty values. */
export const qs = (params = {}) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== false) s.set(k, v);
  });
  const out = s.toString();
  return out ? `?${out}` : '';
};

export const api = {
  get: (p, o) => request(p, o),
  post: (p, body) => request(p, { method: 'POST', body }),
  put: (p, body) => request(p, { method: 'PUT', body }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  del: (p) => request(p, { method: 'DELETE' }),
};
