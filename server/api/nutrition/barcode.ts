// GET /api/nutrition/barcode?code=条码
// 通过条码查询品牌食品营养（Open Food Facts）
import { defineHandler, sendJson, sendError } from '../../index';
import { searchByBarcode } from '../../nutrition';

export default defineHandler(async (req, res) => {
  const method = (req.method ?? 'GET').toUpperCase();
  if (method !== 'GET') {
    sendError(res, 'Method not allowed', 405);
    return;
  }

  const code = (req.query.code ?? '').trim();
  if (!/^\d{8,14}$/.test(code)) {
    sendError(res, '无效的条码格式（应为 8-14 位数字）', 400);
    return;
  }

  const result = await searchByBarcode(code);
  if (!result) {
    sendJson(res, { found: false, result: null }, 404);
    return;
  }

  sendJson(res, { found: true, result });
});
