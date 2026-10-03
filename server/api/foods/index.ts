// 自定义食物 CRUD
// GET    /api/foods       — 列出当前用户自定义食物
// POST   /api/foods       — 新增自定义食物
// PUT    /api/foods/:id   — 修改
// DELETE /api/foods/:id   — 删除
import { defineHandler, sendJson, sendError } from '../../index';
import { getDb } from '../../db';
import { getUserId } from '../../auth';
import type { CustomFoodRow } from '../../db';

export default defineHandler(async (req, res) => {
  const userId = getUserId(req, res);
  const db = await getDb();
  await db.ensureUser(userId);

  const method = (req.method ?? 'GET').toUpperCase();

  // 从 URL 中解析 id（最后一段路径）
  const urlStr = req.url ?? '';
  const pathname = urlStr.split('?')[0];
  const parts = pathname.split('/').filter(Boolean);
  const id = parts.length >= 3 && parts[parts.length - 1] !== 'foods' ? parts[parts.length - 1] : null;

  if (method === 'GET') {
    const foods = await db.listCustomFoods(userId);
    sendJson(res, { foods });
    return;
  }

  if (method === 'POST' && !id) {
    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object' || !body.name) {
      sendError(res, '缺少食物名称', 400);
      return;
    }
    const food = await db.addCustomFood(userId, {
      name: String(body.name),
      category: String(body.category || 'custom'),
      weight_type: String(body.weightType ?? body.weight_type ?? 'other'),
      carbs: Number(body.carbs) || 0,
      protein: Number(body.protein) || 0,
      fat: Number(body.fat) || 0,
      note: body.note != null ? String(body.note) : null,
      source: body.source != null ? String(body.source) : null,
      source_id: body.sourceId ?? body.source_id != null ? String(body.sourceId ?? body.source_id) : null,
    });
    sendJson(res, { success: true, food }, 201);
    return;
  }

  if (method === 'PUT' && id) {
    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object') {
      sendError(res, 'Invalid body', 400);
      return;
    }
    const patch: Partial<CustomFoodRow> = {};
    if (body.name !== undefined) patch.name = String(body.name);
    if (body.category !== undefined) patch.category = String(body.category);
    if (body.weightType !== undefined || body.weight_type !== undefined) {
      patch.weight_type = String(body.weightType ?? body.weight_type);
    }
    if (body.carbs !== undefined) patch.carbs = Number(body.carbs) || 0;
    if (body.protein !== undefined) patch.protein = Number(body.protein) || 0;
    if (body.fat !== undefined) patch.fat = Number(body.fat) || 0;
    if (body.note !== undefined) patch.note = body.note ? String(body.note) : null;
    if (body.source !== undefined) patch.source = body.source ? String(body.source) : null;
    if (body.sourceId !== undefined || body.source_id !== undefined) {
      patch.source_id = body.sourceId ?? body.source_id ? String(body.sourceId ?? body.source_id) : null;
    }
    const updated = await db.updateCustomFood(userId, id, patch);
    if (!updated) {
      sendError(res, '食物不存在', 404);
      return;
    }
    sendJson(res, { success: true, food: updated });
    return;
  }

  if (method === 'DELETE' && id) {
    const ok = await db.deleteCustomFood(userId, id);
    if (!ok) {
      sendError(res, '食物不存在', 404);
      return;
    }
    sendJson(res, { success: true });
    return;
  }

  sendError(res, 'Method not allowed', 405);
});
