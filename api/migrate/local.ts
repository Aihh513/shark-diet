// Vercel Serverless Function: /api/migrate/local
import handler from '../../server/api/migrate/local';

export default handler;

export const config = {
  runtime: 'nodejs',
};
