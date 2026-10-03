// Vercel Serverless Function: /api/nutrition/barcode
import barcodeHandler from '../../../server/api/nutrition/barcode';

export default barcodeHandler;

export const config = {
  runtime: 'nodejs',
};
