// API Client for Authentication

const API_BASE = '/api';

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: 'ADMIN' | 'STORE_INCHARGE' | 'ASSISTANT' | 'VIEWER';
}

export interface LoginResponse {
  token: string;
  user: User;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  return fetchJson<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function getMe(token: string): Promise<User> {
  return fetchJson<User>('/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}
