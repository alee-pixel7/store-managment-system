// Auth-aware fetch wrapper
// Automatically adds auth token and handles 401 responses

const API_BASE = '/api';

let logoutCallback: (() => void) | null = null;

export function setLogoutCallback(callback: () => void) {
  logoutCallback = callback;
}

export async function authFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('store_auth_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });

  if (response.status === 401) {
    // Token expired or invalid
    localStorage.removeItem('store_auth_token');
    if (logoutCallback) {
      logoutCallback();
    }
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}
