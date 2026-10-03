// 数据迁移 API
// POST /api/migrate/local — 将前端 localStorage 里的数据批量迁移到后端
// body: { params, mode, date, entries, customFoods }
import { defineHandler, sendJson, sendError } from '../../index';
import { getDb } from '../../db';
import { getUserId } from '../../auth';
import type { UserParamsRow, CustomFoodRow, FoodEntryRow } from '../../db';

export default defineHandler(async (req, res) => {
  const method = (req.method ?? 'GET').toUpperCase();
  if (method !== 'POST') {
    sendError(res, 'Method not allowed', 405);
    return;
  }

  const userId = getUserId(req, res);
  const db = await getDb();
  await db.ensureUser(userId);

  const body = req.body as Record<string, unknown> | undefined;
  if (!body || typeof body !== 'object') {
    sendError(res, 'Invalid body', 400);
    return;
  }

  let migrated = { params: false, mode: false, entries: 0, customFoods: 0 };

  // 1. 迁移参数
  if (body.params && typeof body.params === 'object') {
    const p = body.params as Record<string, unknown>;
    const params: UserParamsRow = {
      height: Number(p.height) || 175,
      weight: Number(p.weight) || 70,
      age: Number(p.age) || 25,
      gender: String(p.gender || 'male'),
      activity_factor: Number(p.activityFactor ?? p.activity_factor ?? 1.375),
      goal: String(p.goal || 'cut'),
      deficit: Number(p.deficit ?? 500),
      surplus: Number(p.surplus ?? 300),
    };
    await db.saveUserParams(userId, params);
    migrated.params = true;
  }

  // 2. 迁移当天模式
  const date = String(body.date || new Date().toISOString().slice(0, 10));
  if (body.mode && typeof body.mode === 'string' && (body.mode === 'training' || body.mode === 'rest')) {
    await db.setDailyMode(userId, date, body.mode);
    migrated.mode = true;
  }

  // 3. 迁移自定义食物
  if (Array.isArray(body.customFoods)) {
    for (const f of body.customFoods as Array<Record<string, unknown>>) {
      if (!f.name) continue;
      await db.addCustomFood(userId, {
        id: f.id ? String(f.id) : undefined,
        name: String(f.name),
        category: String(f.category || 'custom'),
        weight_type: String(f.weightType ?? f.weight_type ?? 'other'),
        carbs: Number(f.carbs) || 0,
        protein: Number(f.protein) || 0,
        fat: Number(f.fat) || 0,
        note: f.note != null ? String(f.note) : null,
        source: f.source != null ? String(f.source) : 'manual',
        source_id: f.sourceId ?? f.source_id ? String(f.sourceId ?? f.source_id) : null,
      });
      migrated.customFoods++;
    }
  }

  // 4. 迁移当天饮食条目
  if (Array.isArray(body.entries)) {
    const entries: FoodEntryRow[] = (body.entries as Array<Record<string, unknown>>)
      .filter((e) => e.foodId && e.foodName)
      .map((e) => ({
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
    migrated.entries = entries.length;
  }

  sendJson(res, { success: true, userId, migrated });
});
