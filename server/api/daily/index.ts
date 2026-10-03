// 每日饮食记录 API
// GET    /api/daily?date=YYYY-MM-DD  — 获取某天的饮食记录（模式 + 条目）
// POST   /api/daily/mode             — 设置当天模式 { date, mode }
// POST   /api/daily/entries          — 全量替换当天条目 { date, entries }
import { defineHandler, sendJson, sendError } from '../../index';
import { getDb } from '../../db';
import { getUserId } from '../../auth';
import type { FoodEntryRow } from '../../db';

function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default defineHandler(async (req, res) => {
  const userId = getUserId(req, res);
  const db = await getDb();
  await db.ensureUser(userId);

  const method = (req.method ?? 'GET').toUpperCase();
  const urlStr = req.url ?? '';
  const pathname = urlStr.split('?')[0];

  // GET /api/daily?date=...
  if (method === 'GET' && !pathname.includes('/mode') && !pathname.includes('/entries')) {
    const date = (req.query.date ?? getTodayStr()).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      sendError(res, 'date 格式应为 YYYY-MM-DD', 400);
      return;
    }
    const record = await db.getDailyRecord(userId, date);
    sendJson(res, { date, record });
    return;
  }

  // POST /api/daily/mode
  if (method === 'POST' && pathname.endsWith('/mode')) {
    const body = req.body as Record<string, unknown> | undefined;
    if (!body) {
      sendError(res, 'Invalid body', 400);
      return;
    }
    const date = String(body.date || getTodayStr());
    const mode = String(body.mode || 'training');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      sendError(res, 'date 格式应为 YYYY-MM-DD', 400);
      return;
    }
    if (mode !== 'training' && mode !== 'rest') {
      sendError(res, 'mode 只能是 training 或 rest', 400);
      return;
    }
    await db.setDailyMode(userId, date, mode);
    sendJson(res, { success: true, date, mode });
    return;
  }

  // POST /api/daily/entries
  if (method === 'POST' && pathname.endsWith('/entries')) {
    const body = req.body as Record<string, unknown> | undefined;
    if (!body) {
      sendError(res, 'Invalid body', 400);
      return;
    }
    const date = String(body.date || getTodayStr());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      sendError(res, 'date 格式应为 YYYY-MM-DD', 400);
      return;
    }
    const rawEntries = Array.isArray(body.entries) ? body.entries : [];
    const entries: FoodEntryRow[] = rawEntries
      .filter((e) => e && typeof e === 'object' && e.foodId && e.foodName)
      .map((e: Record<string, unknown>) => ({
        id: String(e.id || `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        food_id: String(e.foodId),
        food_name: String(e.foodName),
        food_source: e.foodSource ? String(e.foodSource) : null,
        grams: Number(e.grams) || 0,
        carbs: Number(e.carbs) || 0,
        protein: Number(e.protein) || 0,
        fat: Number(e.fat) || 0,
      }));
    await db.setEntries(userId, date, entries);
    sendJson(res, { success: true, date, count: entries.length });
    return;
  }

  sendError(res, 'Method not allowed', 405);
});
