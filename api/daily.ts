// Vercel Serverless Function: /api/daily
import handler from '../server/api/daily/index';

export default handler;

export const config = {
  runtime: 'nodejs',
};
