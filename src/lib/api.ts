// EXPORTS: api, setApiBaseUrl, getApiBaseUrl
import { resolveAppUrl } from '@lark-apaas/client-toolkit-lite';

let baseUrl = '';

/**
 * 设置 API 基础路径。默认自动推断：
 * - 开发环境走 vite 代理到 /api
 * - 生产环境走当前 origin + /api
 */
export function setApiBaseUrl(url: string) {
  baseUrl = url.replace(/\/$/, '');
}

export function getApiBaseUrl(): string {
  if (baseUrl) return baseUrl;
  // 默认使用相对路径 /api（Vercel 部署时同域）
  return '/api';
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  details?: unknown;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // 带 cookie（用于用户标识）
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const errMsg =
      (data && typeof data === 'object' && 'error' in data && typeof (data as Record<string, unknown>).error === 'string'
        ? (data as Record<string, string>).error
        : null) ?? `HTTP ${res.status}`;
    throw new Error(errMsg);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean>) => {
    let url = path;
    if (params) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) qs.append(k, String(v));
      }
      const q = qs.toString();
      if (q) url += `?${q}`;
    }
    return request<T>(url, { method: 'GET' });
  },
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
};

// 自动初始化 baseUrl
try {
  // 如果在飞书/妙搭环境，用 resolveAppUrl 补全 basePath
  const resolved = resolveAppUrl('/api');
  if (resolved && resolved.startsWith('http')) {
    setApiBaseUrl(resolved);
  }
} catch {
  // 忽略，用默认 /api
}
