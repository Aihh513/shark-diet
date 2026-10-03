// Vercel Serverless Function: /api/nutrition/search
// 将请求转发到 server/api/nutrition/search.ts 的 handler
import searchHandler from '../../../server/api/nutrition/search';

export default searchHandler;

export const config = {
  runtime: 'nodejs',
};
