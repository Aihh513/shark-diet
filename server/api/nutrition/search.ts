// GET /api/nutrition/search?q=食物名&limit=10
// 搜索权威营养数据库（USDA + Open Food Facts 双源合并）
import { defineHandler, sendJson, sendError } from '../../index';
import { searchUsda, searchOpenFoodFacts, type NutritionResult } from '../../nutrition';

export default defineHandler(async (req, res) => {
  const method = (req.method ?? 'GET').toUpperCase();
  if (method !== 'GET') {
    sendError(res, 'Method not allowed', 405);
    return;
  }

  const q = (req.query.q ?? '').trim();
  const limit = Math.min(Number(req.query.limit) || 10, 25);

  if (!q) {
    sendError(res, '缺少搜索关键词 q', 400);
    return;
  }

  // 并行搜索两个数据源
  const [usdaResults, offResults] = await Promise.all([
    searchUsda(q, limit),
    searchOpenFoodFacts(q, limit),
  ]);

  // 去重：按名称 + 数值近似去重
  const seen = new Set<string>();
  const merged: NutritionResult[] = [];
  for (const item of [...usdaResults, ...offResults]) {
    const key = `${item.name.toLowerCase()}|${item.carbs.toFixed(1)}|${item.protein.toFixed(1)}|${item.fat.toFixed(1)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= limit) break;
  }

  sendJson(res, {
    query: q,
    total: merged.length,
    sources: {
      usda: usdaResults.length,
      openfoodfacts: offResults.length,
    },
    results: merged,
  });
});
