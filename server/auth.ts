// 用户识别：在无登录体系阶段，用设备生成的匿名 user_id 标识用户
// 存储在 cookie 中，365 天过期
// 后期接入真实账号体系时替换即可
import type { IncomingMessage, ServerResponse } from 'http';

const COOKIE_NAME = 'shark_diet_uid';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 年

export function getUserId(req: IncomingMessage, res: ServerResponse): string {
  const cookie = req.headers.cookie ?? '';
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (match && match[1]) {
    return match[1];
  }
  // 生成新的匿名用户 ID
  const uid = `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${uid}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax`,
  );
  return uid;
}

export function extractUserId(req: IncomingMessage): string | null {
  const cookie = req.headers.cookie ?? '';
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}
