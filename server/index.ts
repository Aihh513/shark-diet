// EXPORTS: defineHandler, sendJson, sendError, getEnv, log
import type { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

// 后端专用日志（Node.js 环境）
export const log = {
  info: (msg: string, ...args: unknown[]) =>
    process.stdout.write(`[INFO] ${msg}${args.length ? ' ' + args.map(String).join(' ') : ''}\n`),
  warn: (msg: string, ...args: unknown[]) =>
    process.stderr.write(`[WARN] ${msg}${args.length ? ' ' + args.map(String).join(' ') : ''}\n`),
  error: (msg: string, ...args: unknown[]) =>
    process.stderr.write(`[ERROR] ${msg}${args.length ? ' ' + args.map(String).join(' ') : ''}\n`),
};

export type ApiHandler = (
  req: IncomingMessage & { query: Record<string, string>; body?: unknown; params?: Record<string, string> },
  res: ServerResponse,
) => Promise<void> | void;

export function sendJson(res: ServerResponse, data: unknown, status = 200): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export function sendError(res: ServerResponse, message: string, status = 400, details?: unknown): void {
  sendJson(res, { error: message, details }, status);
}

export function getEnv(key: string, fallback = ''): string {
  return (globalThis as unknown as { process?: { env: Record<string, string> } }).process?.env?.[key] ?? fallback;
}

/**
 * 读取 JSON body（限 1MB）
 */
export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * 定义一个同时支持以下两种运行方式的 handler：
 * 1) Vercel Serverless Functions (Node.js 风格：(req, res) => void)
 * 2) 本地 vite-dev 中间件
 *
 * 用法：
 *   export default defineHandler(async (req, res) => { ... })
 */
export function defineHandler(handler: ApiHandler) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    try {
      // 解析 query string
      const urlStr = req.url ?? '/';
      const url = new URL(urlStr, 'http://localhost');
      const query: Record<string, string> = {};
      url.searchParams.forEach((v, k) => {
        query[k] = v;
      });
      const augmented = req as IncomingMessage & {
        query: Record<string, string>;
        body?: unknown;
        params?: Record<string, string>;
      };
      augmented.query = query;

      // 只对 POST/PUT/PATCH 解析 body
      const method = (req.method ?? 'GET').toUpperCase();
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        try {
          augmented.body = await readJsonBody(req);
        } catch (err) {
          sendError(res, String((err as Error).message), 400);
          return;
        }
      }

      await handler(augmented, res);
    } catch (err) {
      log.error('[API Error]', String(err));
      sendError(res, 'Internal Server Error', 500);
    }
  };
}

/**
 * 从 body 中按字段名校验并提取，缺失返回 null
 */
export function pickFields<T extends string>(
  body: unknown,
  fields: T[],
): Record<T, unknown> | null {
  if (!body || typeof body !== 'object') return null;
  const obj = body as Record<string, unknown>;
  const result = {} as Record<T, unknown>;
  for (const f of fields) {
    if (!(f in obj)) return null;
    result[f] = obj[f];
  }
  return result;
}
