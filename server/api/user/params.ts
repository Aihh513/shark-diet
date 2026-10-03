// 用户参数 API
// GET  /api/user/params  — 获取当前用户的参数
// POST /api/user/params  — 保存用户参数
import { defineHandler, sendJson, sendError } from '../../index';
import { getDb } from '../../db';
import { getUserId } from '../../auth';
import type { UserParamsRow } from '../../db';

export default defineHandler(async (req, res) => {
  const method = (req.method ?? 'GET').toUpperCase();
  const userId = getUserId(req, res);
  const db = await getDb();
  await db.ensureUser(userId);

  if (method === 'GET') {
    const params = await db.getUserParams(userId);
    sendJson(res, { userId, params });
    return;
  }

  if (method === 'POST') {
    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object') {
      sendError(res, 'Invalid body', 400);
      return;
    }
    const p: UserParamsRow = {
      height: Number(body.height) || 175,
      weight: Number(body.weight) || 70,
      age: Number(body.age) || 25,
      gender: String(body.gender || 'male'),
      activity_factor: Number(body.activityFactor ?? body.activity_factor ?? 1.375),
      goal: String(body.goal || 'cut'),
      deficit: Number(body.deficit ?? 500),
      surplus: Number(body.surplus ?? 300),
    };
    // 范围校验
    if (p.height < 100 || p.height > 250) return sendError(res, '身高需在 100-250cm 之间', 400);
    if (p.weight < 30 || p.weight > 200) return sendError(res, '体重需在 30-200kg 之间', 400);
    if (p.age < 10 || p.age > 100) return sendError(res, '年龄需在 10-100 岁之间', 400);
    if (p.deficit < 0 || p.deficit > 1500) return sendError(res, '减脂缺口需在 0-1500 kcal 之间', 400);

    await db.saveUserParams(userId, p);
    sendJson(res, { success: true, params: p });
    return;
  }

  sendError(res, 'Method not allowed', 405);
});
