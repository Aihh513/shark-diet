// Vercel Serverless Function: /api/foods/[id]
// Vercel 动态路由：[id] 会匹配 /api/foods/xxx
import handler from '../../server/api/foods/index';

export default handler;

export const config = {
  runtime: 'nodejs',
};
