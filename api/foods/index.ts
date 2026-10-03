// Vercel Serverless Function: /api/foods/index（无 id 的 GET/POST）
import handler from '../../server/api/foods/index';

export default handler;

export const config = {
  runtime: 'nodejs',
};
